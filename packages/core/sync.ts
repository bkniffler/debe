import { ISQLightClient, IListenerObject } from './types';

const schema = {
  name: 'replication',
  index: ['id', 'model', 'time']
};
interface ISQLightSyncConfig {
  upload: (items: any[]) => void;
  download: (items: any[]) => void;
  init: (config: any) => Promise<any>;
}
export async function sqlightSync(
  db: ISQLightClient,
  client: ISQLightSyncConfig
) {
  await db.addSchema(schema);
  function upload(changes: any[]) {
    if (client && client.upload) {
      client.upload(changes);
    }
  }
  function handleLocalChange(
    model: string,
    { change, newValue }: IListenerObject
  ) {
    const { id, rev, ...rest } = change;
    db.insert(schema.name, {
      id: newValue.id,
      model,
      time: new Date().getTime(),
      ...rest
    });
  }

  const log = await db.count(schema.name, {});
  if (log) {
    const log = await db.all(schema.name, {});
    upload(log);
  }

  const revs = await Promise.all(
    db.schema.map(async model => {
      if (model.name === schema.name) {
        return;
      }
      db.addListener(model.name, change =>
        handleLocalChange(model.name, change)
      );
      return db.get(model.name, { orderBy: ['rev DESC'] });
    })
  );

  return revs;
  /*const state = db.schema.reduce((state, model, i) => {
    if (revs[i] && revs[i].rev) {
      state[model.name] = revs[i];
    }
    return state;
  }, {});*/
  // client.init({ state, authInfo: 'abc' });
}
