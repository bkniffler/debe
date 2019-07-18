import { Debe } from 'debe';
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
      this.express.post(`/`, (req, res, next) => {
        const {
          query,
          options,
          collection,
          method
        }: { query: any; options: any; collection: string; method: string } =
          req.body || {};
        this.handleRequest(collection, method, query, options)
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
  async handleRequest(
    collection: string,
    method: string,
    query: any,
    options: any
  ) {
    if (method === 'insert') {
      return this.db.insert(collection, query, options);
    }
    return this.db[method as 'all'](collection, query);
  }
}
