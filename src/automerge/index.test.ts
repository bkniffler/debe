import { MemoryDebe } from 'debe-memory';
import { debeAutomerge } from 'debe-automerge';

const schema = [
  {
    name: 'lorem',
    index: ['hallo', 'hallo2'],
    fields: ['automerge', 'changes']
  }
];
interface ILorem {
  goa?: string;
  goa2?: string;
  hallo?: string;
}

test('automerge:simple', async () => {
  const db = new MemoryDebe(schema);
  await db.initialize();
  const automerge = debeAutomerge(db);
  const item = await automerge<ILorem>('lorem', doc => {
    doc.goa = 'mpu';
  });
  await automerge<ILorem>('lorem', item.id, doc => {
    doc.goa2 = 'mpu1';
  });
  await automerge<ILorem>('lorem', item.id, doc => {
    doc.goa2 = 'mpu2';
  });
  const final = await db.all<ILorem>('lorem', { id: item.id });
  expect(final.length).toBe(1);
  expect(final[0].goa).toBe('mpu');
  expect(final[0].goa2).toBe('mpu2');
});

test('automerge:err', async () => {
  const db = new MemoryDebe(schema);
  await db.initialize();
  const automerge = debeAutomerge(db);
  let err = null;
  await automerge<ILorem>('lorem', '10', doc => {
    doc.goa = 'mpu';
  }).catch(e => (err = e));
  expect(err).toBeTruthy();
});
