import { ensureArray, toISO, types } from 'debe';
import { ISkill } from 'service-dog';

export const softDeleteSkill = (options: any = {}): ISkill => {
  const { removedField = 'rem' } = options;

  return function softDelete(type, payload, flow) {
    if (type === types.INITIALIZE) {
      payload.columns = [...payload.columns, removedField];
      payload.indices = [...payload.indices, removedField];
      return flow(payload);
    }
    if (type === 'all' || type === 'count') {
      const [model, arg = {}] = payload;
      if (!arg.where) {
        arg.where = [];
      }
      arg.where.push({ [removedField]: null });
      flow([model, arg]);
    } else if (type === 'remove') {
      const [model, arg = {}] = payload;
      flow.restart(types.INSERT, [
        model,
        ensureArray(arg).map(id => ({
          id,
          [removedField]: toISO(new Date())
        }))
      ]);
    } else {
      flow(payload);
    }
  };
};
