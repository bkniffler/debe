import { IItem } from '@debe/types';

export function isEqual(
  rowsA: IItem[] | IItem,
  rowsB: IItem[] | IItem,
  revisionField: string
) {
  if (rowsA === rowsB) {
    return true;
  }
  if ((!rowsA && rowsB) || (rowsA && !rowsB)) {
    return false;
  }
  function extrapolate(item: IItem) {
    return `${item.id}|${item[revisionField]}`;
  }
  function isEqualSingle(itemA: IItem, itemB: IItem) {
    if (itemA === itemB) {
      return true;
    }
    if ((!itemA && itemB) || (itemA && !itemB)) {
      return false;
    }
    return extrapolate(itemA) === extrapolate(itemB);
  }
  if (!Array.isArray(rowsA) && !Array.isArray(rowsB)) {
    return isEqualSingle(rowsA, rowsB);
  }
  if (rowsA.length !== rowsB.length) {
    return false;
  }
  if (rowsA.map(extrapolate).join('|') !== rowsB.map(extrapolate).join('|')) {
    return false;
  }
  return true;
}
