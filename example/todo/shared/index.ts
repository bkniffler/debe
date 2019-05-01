export const schema = [
  { name: 'todo', index: ['title', 'completed'], sync: 'delta' }
  /*{ name: 'todo', index: ['title', 'completed'], plugins: { sync: 'lww' } },*/
  /*{ name: 'todo', index: ['title', 'completed'], plugins: { sync: 'manual' } },*/
];
