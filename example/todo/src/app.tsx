import * as React from 'react';
import {
  DebeProvider,
  useAll,
  useCollection,
  useConnectionState
} from 'debe-react';
import App from './components/app';
import { SocketDebe } from 'debe-socket';
import { HttpDebe } from 'debe-http';
import { Sync } from 'debe-sync';
import { Debe } from 'debe';

// setDelay(1000);

interface ITodo {
  id?: string;
  title: string;
  completed: boolean;
}

function Todo({ title }: { title: string }) {
  const state = useConnectionState();
  const [all] = useAll<ITodo>('todo', {
    orderBy: 'title',
    where: ['completed = ?', 0]
  });
  const collection = useCollection<ITodo>('todo');
  if (typeof document !== 'undefined') {
    const clean = document.title.split('(')[0].trim();
    const num = all.filter(x => !x.completed).length;
    document.title = num ? `${clean} (${num})` : clean;
  }
  return (
    <App title={`${title} (${state})`} todos={all} collection={collection} />
  );
}

function Instance({
  get,
  title,
  sync
}: {
  sync?: [string, number];
  get: () => Debe;
  title: string;
}) {
  return (
    <React.Suspense
      fallback={
        <div style={{ textAlign: 'center', height: 200, padding: 50 }}>
          Is loading ...
        </div>
      }
    >
      <DebeProvider
        value={() => {
          const db = get();
          if (sync) {
            const s = new Sync(db, sync);
            s.initialize();
          }
          return db;
        }}
      >
        <Todo title={title} />
      </DebeProvider>
    </React.Suspense>
  );
}

const hash = window.location.hash && window.location.hash.substr(1);
export default function() {
  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {/*<Instance
        title="IndexedDebe"
        sync={['localhost', 9911]}
        cache={cache1}
        get={() =>
          new IDBDebe(schema, `todo${hash}`, {
            softDelete: true
          })
        }
      />*/}
      <Instance
        title="SocketDebe"
        get={() => new SocketDebe(['localhost', 9912])}
      />
      <Instance
        title="HttpDebe"
        get={() => new HttpDebe('http://localhost:9999')}
      />
      {/*<Instance
        title="SocketDebeSuspense"
        cache={cache3}
        get={() => new SocketDebe(['localhost', 9912])}
      />*/}
      {/*<Instance
        title="IndexedDebe #2"
        get={() => new IDBDebe(schema, 'todo2', { softDelete: true })}
      />
      <Instance
        title="MemoryDebe #1"
        get={() => new MemoryDebe(schema, { softDelete: true })}
      />
      <Instance
        title="MemoryDebe #2"
        get={() => new MemoryDebe(schema, { softDelete: true })}
      />*/}
    </div>
  );
}
