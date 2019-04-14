import { ICollectionInput, ICollection, fieldTypes } from '../types';

export function ensureCollection(collection: ICollectionInput): ICollection {
  if (!collection.fields) {
    collection.fields = {};
  } else if (Array.isArray(collection.fields)) {
    collection.fields = collection.fields.reduce(
      (result, field) => ({ ...result, [field]: fieldTypes.STRING }),
      {}
    );
  }
  if (!collection.index) {
    collection.index = {};
  } else if (Array.isArray(collection.index)) {
    collection.index = collection.index.reduce(
      (result, field) => ({ ...result, [field]: fieldTypes.STRING }),
      {}
    );
  }
  if (!collection.plugins) {
    collection.plugins = [];
  }
  if (!collection.specialFields) {
    collection.specialFields = {};
  }
  return collection as ICollection;
}
