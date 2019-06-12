import * as React from 'react';
export const useMemoOne = <T>(compute: any, deps?: any[] | any) => {
  const value = React.useRef('UNLOADED');
  const previousDeps = React.useRef(deps);

  if (
    value.current === 'UNLOADED' ||
    !shallowEqual(previousDeps.current, deps)
  ) {
    previousDeps.current = deps;
    value.current = compute();
  }

  return (value.current as any) as T;
};

var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
function is(x: any, y: any) {
  return (
    (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y) // eslint-disable-line no-self-compare
  );
}

function shallowEqual(objA: any, objB: any) {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  var keysA = Object.keys(objA);
  var keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (var i = 0; i < keysA.length; i++) {
    if (
      !hasOwnProperty$1.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}
