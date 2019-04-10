import { ICollection, types, fieldTypes, IPlugin, CORE_PLUGIN } from 'debe';

export const jsonBodyPlugin = (options: any = {}): IPlugin => client => {
  const { bodyField = 'body' } = options;

  client.addPlugin(
    'jsonToBodyPlugin',
    function jsonToBody(type, payload, flow) {
      if (type === types.COLLECTION) {
        (payload as ICollection).specialFields.body = bodyField;
        (payload as ICollection).fields[bodyField] = fieldTypes.JSON;
        return flow(payload);
      }
      const collections = flow.get('collections', {});
      function filterItem(collection: ICollection, item: any): [any, any] {
        const rest = {};
        return [
          Object.keys(item).reduce((state: any, key: string) => {
            if (collection.fields[key]) {
              state[key] = item[key];
            } else {
              rest[key] = item[key];
            }
            return state;
          }, {}),
          rest
        ];
      }
      const transform = (collection: ICollection, result: any): any => {
        if (Array.isArray(result)) {
          return result.map(x => transform(collection, x));
        }
        if (!result) {
          return result;
        }
        const [obj, rest] = filterItem(collection, result);
        const body =
          obj[bodyField] && typeof obj[bodyField] === 'string'
            ? JSON.parse(obj[bodyField])
            : obj[bodyField];
        delete obj[bodyField];
        return { ...rest, ...body, ...obj };
      };

      const transform2 = (collection: ICollection, result: any): any => {
        if (Array.isArray(result)) {
          return result.map(x => transform2(collection, x));
        }
        if (!result) {
          return result;
        }
        const [obj, rest] = filterItem(collection, result);
        obj[bodyField] = JSON.stringify(rest);
        return obj;
      };

      if (type === types.INSERT) {
        const [collection, value] = payload;
        flow(
          [collection, transform2(collections[collection], value)],
          (x, flow) => flow(transform(collections[collection], x))
        );
        //}
      } else if (type === types.GET || type === types.ALL) {
        const [collection] = payload;
        flow(
          payload,
          (x, flow) => flow(transform(collections[collection], x))
        );
      } else {
        flow(payload);
      }
    },
    'AFTER',
    CORE_PLUGIN
  );
};
