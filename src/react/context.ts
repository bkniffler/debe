import * as React from 'react';
import { Debe } from 'debe';
import { Emitter } from 'debe-adapter';

export const debeContext = React.createContext<Debe>(undefined as any);
export const debeCacheContext = React.createContext<Cache>(undefined as any);

export class Cache {
  private resolved = new Map();
  private emitter = new Emitter();
  listen(key: string, listener: any) {
    return this.emitter.on(key, listener);
  }
  read(key: string, fetch: (set: (value: any) => void) => void) {
    if (!this.resolved.has(key)) {
      const set = (v: any) => {
        this.resolved.set(key, v);
        this.emitter.emit(key, v);
        if (y) {
          y(v);
          y = false;
        }
      };
      let y: any;
      this.resolved.set(
        key,
        new Promise(yay => {
          if (y === undefined) {
            y = yay;
          }
          fetch(set);
        })
      );
    }
    const value = this.resolved.get(key);
    if (value && value.then) {
      throw value;
    }
    return value;
  }
}
