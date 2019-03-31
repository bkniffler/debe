export function createFilter(query: [string, ...any[]]) {
  if (!query.length) {
    return;
  }
  let questions: number = 0;
  const q = query[0].split('AND').map((part: string) =>
    part.split(' ').reduce<string[]>((arr, x) => {
      x = x.trim();
      if (x === '?') {
        arr.push(query[(questions += 1)]);
      } else if (x) {
        arr.push(x);
      }
      return arr;
    }, [])
  );
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
        (operand === '=' || operand === '==') &&
        !(item[left] == right)
      ) {
        return false;
      } else if (operand === '!=' && !(item[left] != right)) {
        return false;
      }
    }
    return true;
  };
}
