import { IModel, types } from '../types';
import { IPluginCreator } from '../dispatcher';

export const jsonBodyPlugin: IPluginCreator = (client, options = {}) => {
  const { bodyField } = options;
  client.indexFields.push(bodyField);

  function filterItem(model: IModel, item: any): [any, any] {
    const rest = {};
    return [
      Object.keys(item).reduce((state: any, key: string) => {
        if (
          client.indexFields.indexOf(key) !== -1 ||
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

  return function(action, flow) {
    const { type, model, value } = action;

    const transform = (result: any): any => {
      if (Array.isArray(result)) {
        return result.map(transform);
      }
      if (!result) {
        return result;
      }
      const [obj] = filterItem(model as any, result);
      const body =
        obj[bodyField] && typeof obj[bodyField] === 'string'
          ? JSON.parse(obj[bodyField])
          : obj[bodyField];
      delete obj[bodyField];
      return { ...body, ...obj };
    };

    const transform2 = (result: any): any => {
      if (Array.isArray(result)) {
        return result.map(transform2);
      }
      if (!result) {
        return result;
      }
      const [obj, rest] = filterItem(model as any, result);
      obj[bodyField] = JSON.stringify(rest);
      return obj;
    };

    if (type === 'insert') {
      if (Array.isArray(value)) {
        const ids: string[] = [];
        const indices = {};
        value.forEach((x, i) => {
          if (x.id) {
            indices[x.id] = i;
            ids.push(x.id);
          }
        });
        if (ids.length) {
          return client
            .dispatch({ type: types.ALL, value: { where: { id: ids } } })
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
              action.value = transform2(value);
              return flow(action);
            });
        } else {
          action.value = transform2(value);
          return flow(action);
        }
      } else if (value.id) {
        return client
          .dispatch({
            type: types.GET,
            value: { where: { id: value.id } }
          })
          .then((item: any) => {
            action.value = transform2({ ...item, ...value });
            return flow(action);
          });
      } else {
        action.value = transform2(value);
        return flow(action);
      }
    }
    if (type === types.GET || type === types.ALL || type === types.INSERT) {
      return flow(
        action,
        (x, flow) => flow(transform(x))
      );
    }
    return flow(action);
  };
};
