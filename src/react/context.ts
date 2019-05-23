import * as React from 'react';
import { Debe } from 'debe';
import { Emitter } from 'debe-adapter';

export const debeContext = React.createContext<Debe>(undefined as any);
export const debeCacheContext = React.createContext<Cache>(undefined as any);

export function useIsSuspense() {
  return React.useContext(debeCacheContext).isSuspense;
}

export class Cache {
  constructor(suspense = false) {
    this.isSuspense = suspense;
  }
  public enableSuspense() {
    this.isSuspense = true;
  }
  public async awaitAndExtract() {
    await this.waitPending();
    return this.extract();
  }
  public extract() {
    const obj = {};
    for (let [key, value] of this.resolved) {
      if (key !== 'debe') {
        obj[key] = value;
      }
    }
    return obj;
  }
  public hydrate(obj: any) {
    let strMap = new Map();
    for (let k of Object.keys(obj)) {
      strMap.set(k, obj[k]);
    }
    this.resolved = strMap;
  }
  public isSuspense = false;
  private resolved = new Map<string, [any, any] | Promise<void | {}>>();
  private emitter = new Emitter();
  get listeners() {
    return this.emitter.numberOfListeners;
  }
  listen<T = any>(
    key: string,
    listener: (error: any, v: T) => void,
    once = false
  ) {
    if (once) {
      return this.emitter.once(key, listener);
    } else {
      return this.emitter.on(key, listener);
    }
  }
  private awaiter = Promise.resolve(undefined as any);
  async waitPending(timeout = 20, lastAwaiter?: any) {
    const awaiter = this.awaiter;
    if (awaiter === lastAwaiter) {
      return;
    }
    await awaiter;
    await new Promise(yay => setTimeout(yay, timeout));
    this.waitPending(timeout, awaiter);
  }
  hasPending() {
    for (let entry of this.resolved.values()) {
      if (!Array.isArray(entry) && entry && entry.then) {
        return true;
      }
    }
    return false;
  }
  close() {
    this.emitter.close();
  }
  read<T = any>(
    key: string,
    fetch: (set: (error: any, value: T) => void) => void
  ) {
    if (!this.resolved.has(key)) {
      let y: any;
      let n: any;
      const promise = new Promise((yay, nay) => {
        if (y === undefined) {
          y = yay;
          n = nay;
        }
        fetch((err, v) => {
          if (!timeout) {
            return;
          }
          clearTimeout(timeout);
          timeout = undefined;
          this.resolved.set(key, [err, v]);
          this.emitter.emit(key, err, v);
          if (y) {
            y(err, v);
            y = false;
          }
        });
        let timeout: any = setTimeout(() => {
          timeout = undefined;
          n(new Error('Timeout! ' + key));
          n = false;
        }, 5000);
      });
      this.awaiter = this.awaiter.then(() => promise);
      this.resolved.set(key, promise);
    }
    const entry = this.resolved.get(key);
    if (!Array.isArray(entry) && entry && entry.then) {
      throw entry;
    }
    const [err, value] = entry;
    if (err) {
      throw err;
    }
    return value;
  }
}
