import { DebeBackend } from '../backend';
import { IMiddleware } from '../types';

export function hasMiddleware(dispatcher: DebeBackend, name?: string) {
  if (!name) {
    return false;
  }
  return !!dispatcher.middlewares.find(x => x.name === name);
}

export function addMiddleware(
  dispatcher: DebeBackend,
  middleware: IMiddleware
) {
  if (!dispatcher.middlewares) {
    throw new Error(
      'Dispatcher has no middlewares. Make sure this is a BackendDispatcher'
    );
  }
  if (hasMiddleware(dispatcher, middleware.name)) {
    return;
  }
  dispatcher.middlewares.push(middleware);
}
