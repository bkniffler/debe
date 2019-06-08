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
  async waitPending(timeout = 20): Promise<void> {
    const promises = [];
    for (let entry of this.resolved.values()) {
      if (!Array.isArray(entry) && entry && entry.then) {
        promises.push(entry);
      }
    }
    if (promises.length === 0) {
      return;
    }
    await Promise.all(promises);
    await new Promise(yay => setTimeout(yay, timeout));
    return this.waitPending(timeout);
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
  has(key: string) {
    return this.resolved.has(key);
  }
  read<T = any>(
    key: string,
    fetch: (set: (error: any, value: T) => void) => void
  ) {
    if (!this.resolved.has(key)) {
      let yay: any = undefined;
      let nay: any = undefined;
      this.resolved.set(
        key,
        new Promise((y, n) => {
          yay = y;
          nay = n;
        })
      );
      let timetime: any = setTimeout(() => {
        if (!timetime) {
          return;
        }
        timetime = undefined;
        this.resolved.set(key, [err, undefined]);
        nay(new Error('Timeout! ' + key));
      }, 5000);

      fetch((err, v) => {
        if (!timetime) {
          return;
        }
        clearTimeout(timetime);
        this.resolved.set(key, [err, v]);
        setTimeout(() => {
          this.emitter.emit(key, err, v);
        });
        yay(v);
      });
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
