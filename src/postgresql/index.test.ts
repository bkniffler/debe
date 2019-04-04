import { PostgreSQLAdapter } from './index';
import { createAdapterTest } from 'debe/adapter.test';

if (process.env.PG_CONNECTIONSTRING) {
  createAdapterTest(
    'postgresql',
    () => new PostgreSQLAdapter(process.env.PG_CONNECTIONSTRING + '')
  );
} else {
  test('postgresql:many', async () => {
    expect(1).toBe(1);
  });
}
