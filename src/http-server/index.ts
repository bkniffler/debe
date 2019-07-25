import { Debe } from 'debe';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Server } from 'http';
import { IHandlerArgs } from 'debe-http';

export class HttpServer {
  express: express.Express;
  app: Server;
  db: Debe;
  queryLogger?: (args: IHandlerArgs[]) => void;
  constructor(db: Debe);
  constructor(db: Debe, port: number);
  constructor(db: Debe, express: express.Express);
  constructor(db: Debe, arg?: express.Express | number) {
    if (typeof arg === 'number') {
      this.express = express();
      this.app = this.express.listen(arg);
      this.express.use(cors());
      this.express.use(
        bodyParser.urlencoded({
          extended: true
        })
      );
      this.express.use(bodyParser.json());
      this.express.post(`/`, (req, res) => {
        const requests: IHandlerArgs[] = req.body || [];
        this.handleRequest(requests)
          .then((result: any) => res.json(result))
          .catch((err: any) => res.json({ err }));
      });
    } else if (arg) {
      this.express = arg;
    }
    this.db = db;
  }
  async close() {
    if (this.app) {
      this.app.close();
    }
  }
  async handleRequest(args: IHandlerArgs[]) {
    // Put inserts at start so other queries are always up to date
    const orderedArgs = args.reduce<{ arg: IHandlerArgs; index: number }[]>(
      (result, arg, index) => {
        if (arg.method === 'insert') {
          result = [{ arg, index }, ...result];
        } else {
          result = [...result, { arg, index }];
        }
        return result;
      },
      []
    );
    if (this.queryLogger) {
      this.queryLogger(args);
    }
    const results: any[] = [];
    return Promise.all(
      orderedArgs.map(({ arg, index }) => {
        const { collection, method, query, options } = arg;
        let promise =
          method === 'insert'
            ? this.db.insert(collection, query, options)
            : this.db[method as 'all'](collection, query);
        // Reorder results to retain correct order
        return promise.then(result => (results[index] = result));
      })
    ).then(() => results);
  }
}
