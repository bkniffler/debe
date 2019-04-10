/**
 * @jest-environment node
 */
import * as Benchmark from 'benchmark';
import { Flow, generateID } from '../index';

if (process.env.BENCHMARK) {
  test('benchmark', async cb => {
    const suite = new Benchmark.Suite();
    const timeout = (result: any) => (cb: any) => {
      setTimeout(() => cb(result), 0);
    };

    // FN
    function callback(type: any, value: any, cb: any) {
      value.push(1);
      callback2(type, value, cb);
    }
    function callback2(type: any, value: any, cb: any) {
      value.push(2);
      callback3(type, value, cb);
    }
    function callback3(type: any, value: any, cb: any) {
      value.push(3);
      timeout(value)(cb);
    }
    // PROMISE
    function promise(type: any, value: any) {
      value.push(1);
      return new Promise(yay => yay(value))
        .then(value => promise2(type, value))
        .then(value => promise3(type, value));
    }
    function promise2(type: any, value: any) {
      value.push(2);
      return new Promise(yay => yay(value));
    }
    function promise3(type: any, value: any) {
      value.push(3);
      return new Promise(timeout(value));
    }
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
      timeout(value)(flow);
    });

    suite
      .add(
        'callback',
        function(defer: any) {
          callback('hans', [0], () => defer.resolve());
        },
        { defer: true }
      )
      .add(
        'promise',
        function(defer: any) {
          promise('hans', [0]).then(() => defer.resolve());
        },
        { defer: true }
      )
      .add(
        'flow',
        function(defer: any) {
          flow.run<any>('hans', [0], {}).then(() => defer.resolve());
        },
        { defer: true }
      )
      .on('complete', function() {
        const result = suite.reduce((store: any, i: any) => {
          console.log(String(i));
          return { ...store, [i.name]: i.hz };
        }, {});
        const perfScore = (100 / result['promise']) * result['flow'];
        const perfScore2 = (100 / result['callback']) * result['flow'];
        console.log('Score', perfScore, perfScore2);
        expect(perfScore).toBeGreaterThan(80);
        expect(perfScore2).toBeGreaterThan(80);
        cb();
      })
      .run({ maxTime: 2, async: true });
  }, 40000);
  test('benchmark-id', async cb => {
    const suite = new Benchmark.Suite();
    suite
      .add('wolfid', function() {
        generateID();
      })
      .add('randstring32', function() {
        Math.random()
          .toString(36)
          .substr(2, 9);
      })
      .on('complete', function() {
        const result = suite.reduce((store: any, i: any) => {
          console.log(String(i));
          return { ...store, [i.name]: i.hz };
        }, {});
        const perfScore = (100 / result['randstring32']) * result['wolfid'];
        console.log('Score', perfScore);
        expect(perfScore).toBeGreaterThan(100);
        cb();
      })
      .run({ maxTime: 2, async: true });
  }, 40000);
} else {
  test('blank', () => expect(true).toBe(true));
}
