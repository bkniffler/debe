import { PostgreSQLAdapter } from './index';
import { createAdapterTest } from 'debe/adapter.test';

if (process.env.PG_CONNECTIONSTRING) {
  createAdapterTest(
    'posgresql',
    () => new PostgreSQLAdapter(process.env.PG_CONNECTIONSTRING + '')
  );
} else {
  test('posgresql:many', async () => {
    expect(1).toBe(1);
  });
}
