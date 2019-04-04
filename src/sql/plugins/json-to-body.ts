import { ICollection, types, fieldTypes, IPlugin, CORE_PLUGIN } from 'debe';

export const jsonBodySkill = (options: any = {}): IPlugin => client => {
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
        const [obj] = filterItem(collection, result);
        const body =
          obj[bodyField] && typeof obj[bodyField] === 'string'
            ? JSON.parse(obj[bodyField])
            : obj[bodyField];
        delete obj[bodyField];
        return { ...body, ...obj };
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
        const [m, value] = payload;
        const collection = collections[m];
        /*if (Array.isArray(value) && merge) {
          const ids: string[] = [];
          const indices = {};
          value.forEach((x, i) => {
            if (x.id) {
              indices[x.id] = i;
              ids.push(x.id);
            }
          });
          if (ids.length) {
            flow
              .run(types.ALL, [m, { where: { id: ids } }])
              .then((items: any[]) => {
                items.forEach(item => {
                  if (
                    item &&
                    item.id &&
                    indices[item.id] &&
                    value[indices[item.id]]
                  ) {
                    value[indices[item.id]] = {
                      ...item,
                      ...value[indices[item.id]]
                    };
                  }
                });
                flow([m, transform2(collection, value)]);
              });
          } else {
            flow([m, transform2(collection, value)]);
          }
        } else if (value.id && merge) {
          flow
            .run(types.GET, [m, { where: { id: value.id } }])
            .then((item: any) =>
              flow([m, transform2(collection, { ...item, ...value })])
            );
        } else {*/
        flow(
          [m, transform2(collection, value)],
          (x, flow) => flow(transform(collection, x))
        );
        //}
      } else if (type === types.GET || type === types.ALL) {
        const [m] = payload;
        flow(
          payload,
          (x, flow) => flow(transform(collections[m], x))
        );
      } else {
        flow(payload);
      }
    },
    'AFTER',
    CORE_PLUGIN
  );
};
