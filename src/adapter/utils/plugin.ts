import { ICollection } from 'debe';

export function hasPlugin(collection: ICollection, name: string) {
  return collection.plugins.indexOf(name) !== -1;
}
export function addPlugin(collection: ICollection, name: string) {
  if (hasPlugin(collection, name)) {
    return;
  }
  return collection.plugins.push(name);
}
