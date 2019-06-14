import { Debe } from 'debe';
import { allowedMethods } from 'debe-http';
import * as express from 'express';
import { Server } from 'http';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

export class HttpServer {
  express: express.Express;
  app: Server;
  db: Debe;
  constructor(db: Debe);
  constructor(db: Debe, port: number);
  constructor(db: Debe, express: express.Express);
  constructor(db: Debe, arg?: express.Express | number) {
    if (!arg) {
      arg = 8000;
    }
    if (typeof arg === 'number') {
      this.express = express();
      this.app = this.express.listen(arg);
      this.express.use(cors());
      this.express.use(bodyParser());
    } else {
      this.express = arg;
    }
    this.db = db;
    allowedMethods.forEach(method => this.handleMethods(method));
  }
  async close() {
    if (this.app) {
      this.app.close();
    }
  }
  async handleMethods(method: string) {
    this.express.post(`/:collection/${method}`, (req, res, next) => {
      const { query, options }: { query: any; options: any } = req.body || {};
      if (method === 'insert') {
        return this.db
          .insert(req.params['collection'], query, options)
          .then((result: any) => res.json(result))
          .catch((err: any) => res.json({ err }));
      }
      return this.db[method as 'all'](req.params['collection'], query)
        .then((result: any) => res.json(result))
        .catch((err: any) => res.json({ err }));
    });
  }
}
