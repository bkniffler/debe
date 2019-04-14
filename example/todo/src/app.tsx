import * as React from 'react';
import { DebeProvider, useAll, useCollection } from 'debe-react';
import App from './components/app';
import { IDBDebe } from 'debe-idb';
import { MemoryDebe } from 'debe-memory';
import { SyncClient } from 'debe-sync';
import { Debe } from 'debe';

const schema = [{ name: 'todo' }];
interface ITodo {
  id?: string;
  title: string;
  completed: boolean;
}

function Todo() {
  const [all] = useAll<ITodo>('todo');
  const collection = useCollection<ITodo>('todo');
  return <App todos={all} collection={collection} />;
}

function Instance({ get }: { get: () => Debe }) {
  return (
    <DebeProvider
      value={() => {
        const db = get();
        new SyncClient(db, ['localhost', 9911]);
        return db;
      }}
      initialize={async db => {
        /*const todo = db.use<ITodo>('todo');
        await db.initialize();
        if (await todo.count()) {
          return;
        }
        await todo.insert({
          title: 'Not done :(',
          completed: false
        });
        await todo.insert({
          title: 'Done :)',
          completed: true
        });*/
      }}
      render={() => <Todo />}
      loading={() => (
        <div style={{ textAlign: 'center', height: 200, padding: 50 }}>
          Is loading ...
        </div>
      )}
    />
  );
}

export default function() {
  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <Instance
        name="todo"
        get={() => new IDBDebe(schema, name, { softDelete: true })}
      />
      <Instance name="todo2" get={() => new MemoryDebe(schema)} />
    </div>
  );
}
