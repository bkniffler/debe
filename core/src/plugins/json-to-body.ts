import { IModel, types } from 'debe';
import { ISkill } from 'service-dog';

function getModel(name: string): IModel {
  return { name, columns: [], index: [] };
}
export const jsonBodySkill = (options: any = {}): ISkill => {
  const { bodyField = 'body', merge = true } = options;

  return function jsonToBody(type, payload, flow) {
    if (type === types.INITIALIZE) {
      payload.columns = [...payload.columns, bodyField];
      return flow(payload);
    }
    const columns = flow.get('columns', []);
    const schema = flow.get('schema', {});
    function filterItem(model: IModel, item: any): [any, any] {
      const rest = {};
      return [
        Object.keys(item).reduce((state: any, key: string) => {
          if (
            columns.indexOf(key) !== -1 ||
            (model.columns || []).indexOf(key) !== -1
          ) {
            state[key] = item[key] || state[key];
          } else {
            rest[key] = item[key] || state[key];
          }
          return state;
        }, {}),
        rest
      ];
    }
    const transform = (model: IModel, result: any): any => {
      if (Array.isArray(result)) {
        return result.map(x => transform(model, x));
      }
      if (!result) {
        return result;
      }
      const [obj] = filterItem(model, result);
      const body =
        obj[bodyField] && typeof obj[bodyField] === 'string'
          ? JSON.parse(obj[bodyField])
          : obj[bodyField];
      delete obj[bodyField];
      return { ...body, ...obj };
    };

    const transform2 = (model: IModel, result: any): any => {
      if (Array.isArray(result)) {
        return result.map(x => transform2(model, x));
      }
      if (!result) {
        return result;
      }
      const [obj, rest] = filterItem(model, result);
      obj[bodyField] = JSON.stringify(rest);
      return obj;
    };

    if (type === types.INSERT) {
      const [m, value] = payload;
      const model = schema[m];
      if (Array.isArray(value) && merge) {
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
            .send(types.ALL, [m, { where: { id: ids } }])
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
              flow([m, transform2(model, value)]);
            });
        } else {
          flow([m, transform2(model, value)]);
        }
      } else if (value.id && merge) {
        flow
          .send(types.GET, [m, { where: { id: value.id } }])
          .then((item: any) =>
            flow([m, transform2(model, { ...item, ...value })])
          );
      } else {
        flow(
          [m, transform2(model, value)],
          (x, flow) => flow(transform(model, x))
        );
      }
    } else if (type === types.GET || type === types.ALL) {
      const [m] = payload;
      const model = getModel(m);
      flow(
        payload,
        (x, flow) => flow(transform(model, x))
      );
    } else {
      flow(payload);
    }
  };
};
