import { Debe } from 'debe';
import { allowedMethods } from 'debe-http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Server } from 'http';

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
      this.express.use(
        bodyParser.urlencoded({
          extended: true
        })
      );
      this.express.use(bodyParser.json());
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
      const collection = req.params['collection'];
      const { query, options }: { query: any; options: any } = req.body || {};
      if (method === 'insert') {
        return this.db
          .insert(collection, query, options)
          .then((result: any) => res.json(result))
          .catch((err: any) => res.json({ err }));
      }
      return this.db[method as 'all'](collection, query)
        .then((result: any) => res.json(result))
        .catch((err: any) => res.json({ err }));
    });
  }
}
