import {
  Flow,
  createFlow,
  ITrackerArg,
  treeizeTracker,
  ISkill
} from '../index';
const fetch = require('node-fetch');

test('basic', async () => {
  const flow = new Flow();
  flow.addSkill((type, value, flow) => {
    value.push(1);
    flow(value);
  });
  flow.addSkill((type, value, flow) => {
    value.push(2);
    flow(value);
  });
  flow.addSkill((type, value, flow) => {
    value.push(3);
    flow(value);
  });
  flow.addSkill((type, value, flow) => {
    flow(value);
  });
  const result = await flow.run<any>('hans', [0], {});
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(4);
});

test('context', async () => {
  const flow = new Flow();
  flow.addSkill((type, value, flow) => {
    flow.set('1', 1);
    flow.set('2', 2);
    flow(value);
  });
  flow.addSkill((type, value, flow) => {
    flow(
      [...value, flow.get('1'), flow.get('2'), flow.get('3', 3)].reduce(
        (result, num) => result + num
      )
    );
  });
  const result = await flow.run<any>('context', [0], {});
  expect(result).toBe(6);
});

test('callback', cb => {
  const flow = new Flow();
  flow.addSkill((type, value, flow) => {
    flow(value);
  });
  flow.run<any>('context', [0], {}, (err?: any, result?: any) => {
    expect(err).toBeFalsy();
    expect(result && result[0]).toBe(0);
    cb();
  });
});

test('tracker', async () => {
  const flow = new Flow();
  flow.addSkill((type, value, flow) => {
    flow(value);
  });
  const tracker: any = [];
  await flow.run<any>('context', [0], {
    tracker: x => tracker.push(x)
  });
  expect(tracker.length).toBe(3);
});

test('depending', async () => {
  const flow = new Flow();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  // flow.addSkill(skillB);
  flow.addSkill([skillA, skillB, skillC]);
  const result = await flow.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position', async () => {
  const flow = new Flow();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  flow.addSkill([skillB, skillC]);
  flow.addSkill(skillA, 'BEFORE', skillB);
  const result = await flow.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position2', async () => {
  const flow = new Flow();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  flow.addSkill([skillA, skillC]);
  flow.addSkill(skillB, 'AFTER', skillA);
  const result = await flow.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('depending-with-position-bystring', async () => {
  const flow = new Flow();
  const skillC: ISkill = (type, value, flow) => {
    flow([...value, 3]);
  };
  const skillB: ISkill = (type, value, flow) => {
    flow([...value, 2]);
  };
  const skillA: ISkill = (type, value, flow) => {
    flow([...value, 1]);
  };
  // skillA['skills'] = ['skillB', skillC];
  // skillA['position'] = 'BEFORE';
  flow.addSkill([skillA, skillC]);
  flow.addSkill(skillB, 'AFTER', ['skillA']);
  const result = await flow.run<any>('context', [0], {});
  expect(result.join('')).toBe('0123');
});

test('edgecase', async () => {
  const flow = createFlow();
  flow.addSkill('1', (type, value, flow) => {
    (flow as any)();
  });
  flow.addSkill('1', (type, value, flow) => {
    (flow as any)();
  });
  flow.addSkill('2', (type, value, flow) => {
    (flow as any)();
  });
  expect(() => (flow.addSkill as any)()).toThrow();
  await flow.run<any>('context', [0]);
  expect(flow.skillCount).toBe(2);
});

test('reset', async () => {
  const flow = new Flow();
  flow.addSkill(async (type, value, flow) => {
    if (type === 'first') {
      flow.reset('third', 'hel');
    } else if (type === 'second') {
      await new Promise(yay => setTimeout(yay, 1000));
      flow.return('wor');
    } else if (type === 'secondb') {
      await new Promise(yay => setTimeout(yay, 500));
      flow.return('ld');
    } else {
      flow(
        value + 'lo',
        (x, n) => n(x + '!')
      );
    }
  });
  flow.addSkill(async (type, value, flow) => {
    const [part, part2] = await Promise.all([
      flow.run('second'),
      flow.run('secondb')
    ]);
    flow(`${value}, ${part}${part2}`);
  });
  const tracker: ITrackerArg[] = [];
  const result = await flow.run<any>('first', '', {
    tracker: x => tracker.push(x)
  });

  const tree = treeizeTracker(tracker);
  expect(Object.keys(tree).length).toBe(1);
  expect(tracker.length).toBe(14);
  expect('hello, world!').toBe(result);
});

test('sync', async () => {
  const flow = new Flow();
  flow.addSkill((type, value) => {
    value.push(1);
    return value;
  });
  const result = flow.runSync('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(2);
});

test('remove', async () => {
  const flow = new Flow();
  flow.addSkill('1', (type, value) => {
    value.push(1);
    return value;
  });
  expect(flow.skillCount).toBe(1);
  flow.removeSkill('1');
  expect(flow.skillCount).toBe(0);
  function skill1(type: string, value: any) {
    value.push(1);
    return value;
  }
  flow.addSkill(skill1);
  expect(flow.skillCount).toBe(1);
  flow.removeSkill(skill1);
  expect(flow.skillCount).toBe(0);
});

test('hooks', async () => {
  const flow = new Flow();
  flow.addSkill((type, value, flow) => {
    value.push(1);
    flow(
      value,
      (x, flow) => flow([...x, 5])
    );
  });
  flow.addSkill((type, value, flow) => {
    value.push(2);
    flow(
      value,
      (x, flow) => flow([...x, 4])
    );
  });
  flow.addSkill((type, value, flow) => flow([...value, 3]));
  const result = await flow.run<any>('hans', [0]);
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(6);
  expect(result.join('')).toBe('012345');
});

test('error', async () => {
  const flow = new Flow();
  flow.addSkill((type, value, flow) => {
    if (type !== 'hans') {
      flow.catch((err, next) => {
        next(undefined, 'hello');
      });
    }
    flow(value);
  });
  flow.addSkill((type, value, flow) => {
    if (type === 'hans3') {
      return flow('hans3');
    }
    throw new Error('Error :(');
  });

  let err: any;
  await flow.run<any>('hans', [0]).catch((er: any) => (err = er));
  const v = await flow.run<any>('hans2', [0]);
  const v2 = await flow.run<any>('hans3', [0]);
  expect(err).toBeTruthy();
  expect(v).toBe('hello');
  expect(v2).toBe('hans3');
  expect(() => flow.runSync('hans')).toThrow();
});

test('fetch', async () => {
  const flow = new Flow();
  let err: any = undefined;
  let retries = 0;
  flow.addSkill('retry', (type, value, flow) => {
    const maxRetries = flow.get('maxRetries', 0);
    const currentRetries = flow.get('retries', 0);
    if (currentRetries < maxRetries) {
      retries += 1;
      // Call reset on fail, providing the current retries as new context
      flow.catch(err =>
        flow.reset(type, value, { retries: currentRetries + 1 })
      );
    }
    flow(value);
  });
  flow.addSkill('error', async (type, value, flow) => {
    if (type === 'fetch') {
      flow.return(await fetch(value).then((response: any) => response.json()));
    } else {
      flow(value);
    }
  });
  await flow
    // Provide context
    .run('fetch', 'https://invalidurl.com', {
      maxRetries: 3
    })
    .catch((e: any) => (err = e));
  expect(retries).toBe(3);
  expect(err).toBeTruthy();
  const result1 = await flow.run(
    'fetch',
    'https://jsonplaceholder.typicode.com/todos/1'
  );
  expect(result1).toBeTruthy();
});
