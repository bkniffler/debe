import { ensureArray, queryToArray } from 'debe';

export function createFilter(query: [string, ...any[]]) {
  if (!query.length) {
    return;
  }
  const q = queryToArray(query);
  return function filter(item: any) {
    for (var i = 0; i < q.length; i++) {
      const [left, operand, right] = q[i];
      if (operand === '>=' && !(item[left] >= right)) {
        return false;
      } else if (operand === '>' && !(item[left] > right)) {
        return false;
      } else if (operand === '<=' && !(item[left] <= right)) {
        return false;
      } else if (operand === '<' && !(item[left] < right)) {
        return false;
      } else if (
        operand === 'IN' &&
        ensureArray(right).indexOf(item[left]) === -1
      ) {
        return false;
      } else if (
        (operand === '=' || operand === '==') &&
        !((item[left] || null) == (right || null))
      ) {
        return false;
      } else if (
        operand === '!=' &&
        !((item[left] || null) != (right || null))
      ) {
        return false;
      }
    }
    return true;
  };
}

export function sort(arr: any[], orderer: string | string[]): any[] {
  if (Array.isArray(orderer)) {
    return orderer.reduce((arr, str) => sort(arr, str), arr);
  }
  const [fieldName = '', direction = ''] = (orderer || '').split(' ');
  if (fieldName) {
    const isDesc = direction.toUpperCase() === 'DESC';
    const compare = (a: any, b: any) => {
      if (a[fieldName] < b[fieldName]) return isDesc ? 1 : -1;
      if (a[fieldName] > b[fieldName]) return isDesc ? -1 : 1;
      return 0;
    };
    return arr.sort(compare);
  }
  return arr;
}
