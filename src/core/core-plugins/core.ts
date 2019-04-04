import {
  types,
  fieldTypes,
  ICollectionInput,
  ICollection,
  IQueryInput,
  IQuery
} from '../types';
import { ensureArray, generate } from '../utils';
import { IPlugin } from '../client';

interface IHasName {
  name: string;
  [s: string]: any;
}
interface IObjectifyResult<T> {
  [s: string]: T;
}
export function objectify<T>(array: IHasName[]): IObjectifyResult<T> {
  return array.reduce((store, x) => ({ ...store, [x.name]: x }), {});
}
export function ensureCollection(collection: ICollectionInput): ICollection {
  if (!collection.fields) {
    collection.fields = {};
  } else if (Array.isArray(collection.fields)) {
    collection.fields = collection.fields.reduce(
      (result, field) => ({ ...result, [field]: fieldTypes.STRING }),
      {}
    );
  }
  if (!collection.index) {
    collection.index = {};
  } else if (Array.isArray(collection.index)) {
    collection.index = collection.index.reduce(
      (result, field) => ({ ...result, [field]: fieldTypes.STRING }),
      {}
    );
  }
  if (!collection.specialFields) {
    collection.specialFields = {};
  }
  return collection as ICollection;
}
export const corePlugin = (options: any = {}): IPlugin => {
  const { idField = 'id' } = options;
  function transformForStorage(item: any) {
    if (!item) {
      return item;
    }
    if (item[idField] === undefined || item[idField] === null) {
      item[idField] = generate();
    }
    if (typeof item[idField] !== 'string') {
      item[idField] = item[idField] + '';
    }
    return item;
  }
  return async function corePlugin(type, payload, flow) {
    if (type === types.COLLECTION) {
      const collection = ensureCollection(payload as ICollectionInput);
      collection.specialFields.id = idField;
      collection.fields[idField] = fieldTypes.STRING;
      return flow(payload);
    } else if (type === types.INITIALIZE) {
      return flow(
        payload,
        async (value, next) => {
          if (value.collections) {
            const collections = (await Promise.all(
              value.collections.map((collection: ICollectionInput) =>
                flow.run(types.COLLECTION, collection)
              )
            )) as ICollection[];
            value.collections = await flow.run(
              types.COLLECTIONS,
              objectify<ICollection>(collections)
            );
          }
          next(value);
        }
      );
    }
    if (type === types.INSERT) {
      const refetchResult = flow.get('refetchResult', false);
      const [collection, value] = payload;
      const isArray = Array.isArray(value);
      const newItems = ensureArray(value).map(transformForStorage);
      flow(
        [collection, newItems],
        async (result: any, flo: any) => {
          if (refetchResult) {
            result = await flow.run(types.ALL, newItems.map(x => x.id));
          }
          flo(isArray ? result : result[0]);
        }
      );
    } else if (type === types.GET) {
      const [collection, value = {}] = payload as [
        string,
        IQueryInput | string
      ];
      if (typeof value === 'object' && value.id) {
        flow([collection, Array.isArray(value.id) ? value.id[0] : value.id]);
      } else if (typeof value === 'object') {
        flow.return((await flow.run(types.ALL, value))[0]);
      } else {
        flow([collection, value]);
      }
    } else if (type === types.REMOVE) {
      const [collection, value = []] = payload as [string, string[] | string];
      flow([collection, ensureArray(value)]);
    } else if (type === types.ALL || type === types.COUNT) {
      const [collection, value = {}] = payload as [
        string,
        IQueryInput | string | string[]
      ];
      if (typeof value === 'string') {
        flow.return(ensureArray(await flow.run(types.GET, value)));
      } else if (value && (Array.isArray(value) || Array.isArray(value.id))) {
        flow([
          collection,
          { where: [`id IN (?)`, value['id'] || value] } as IQuery
        ]);
      } else {
        flow([collection, cleanQuery(value)]);
      }
    } else {
      flow(payload);
    }
  };
};

function cleanQuery(value: IQueryInput): IQuery {
  if (Array.isArray(value.limit) && value.limit.length === 2) {
    value.offset = value.limit[1];
    value.limit = value.limit[0];
  } else if (Array.isArray(value.limit) && value.limit.length === 1) {
    value.limit = value.limit[0];
  }
  value.select = value.select ? ensureArray(value.select) : undefined;
  value.orderBy = value.orderBy ? ensureArray(value.orderBy) : undefined;
  value.id = value.id ? ensureArray(value.id) : undefined;
  return value as IQuery;
}
