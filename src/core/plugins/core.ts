import { types, fieldTypes, ICollectionInput, ICollection } from '../types';
import { ensureArray, generate } from '../utils';
import { ISkill } from 'flowzilla';

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
export const coreSkill = (options: any = {}): ISkill => {
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
  return function core(type, payload, flow) {
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
      const [collection, value] = payload;
      const isArray = Array.isArray(value);
      flow(
        [collection, ensureArray(value).map(transformForStorage)],
        (result: any, flow: any) => flow(isArray ? result : result[0])
      );
    } /*else if (type === types.ALL || type === types.GET) {
      const [collection, value] = payload;
      if (collection && value && !value.where) {
        value.where = [];
      } else if (
        value &&
        value.where &&
        Array.isArray(value.where) &&
        typeof value.where[0] === 'string'
      ) {
        value.where = [value.where];
      }
      flow(payload);
    }*/ else {
      flow(payload);
    }
  };
};
