```tsx
// Initialize new database, for example better-sqlite3
const db = createBetterSQLite3Client(sql(getDBDir()), schema);
// Connect database (create tables and indices)
await db.initialize();
// Initialize automerge plugin
const automerge = debeAutomerge(db);
// Begin a modificational transaction
const item = await automerge<ILorem>(name, doc => {
  doc.goa = 'mpu';
});
// ...another transaction
await automerge<ILorem>(name, item.id, doc => {
  doc.goa2 = 'mpu1';
});
// ...and a third transaction
await automerge<ILorem>(name, item.id, doc => {
  doc.goa2 = 'mpu2';
});
const final = await db.all<ILorem>(name, { id: item.id });
console.log(final);
```
