import { MemoryDebe } from 'debe/memory';
import { debeAutomerge } from 'debe/automerge';

const Faltu = require('faltu');
const Automerge = require('automerge');

const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2'],
    columns: ['automerge', 'changes']
  }
];
interface ILorem {
  goa?: string;
  goa2?: string;
  hallo?: string;
}

test('automerge', async () => {
  const db = new MemoryDebe(Faltu);
  await db.initialize(schema);
  const automerge = debeAutomerge(db, Automerge);
  const item = await automerge<ILorem>(name, doc => {
    doc.goa = 'mpu';
  });
  await automerge<ILorem>(name, item.id, doc => {
    doc.goa2 = 'mpu1';
  });
  await automerge<ILorem>(name, item.id, doc => {
    doc.goa2 = 'mpu2';
  });
  const final = await db.all<ILorem>(name, { id: item.id });
  expect(final.length).toBe(1);
  expect(final[0].goa).toBe('mpu');
  expect(final[0].goa2).toBe('mpu2');
});
