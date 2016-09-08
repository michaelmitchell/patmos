//
import Benchmark from "benchmark"

import R, { __, curry } from 'ramda';
import as, { chainReducer } from "../lib/as-stated";

// test
function Patmos(initialState = {}) {
  this.state = initialState;
}

// benchmark test
const add = function (state, a, b) {
  const newState = Object.assign({}, state, {
    result: a + b
  });

  return newState;
};

Patmos.prototype.add = chainReducer << add;

let result = new Patmos({})
  .add(1)(2);

console.log(result);

/**/
new Benchmark.Suite()
  .add('raw add', function() {
    add({}, 1, 2);
  })
  .add('proto test add', function() {
    Patmos.prototype.add.test({}, 1, 2);
  })
  .add('proto add', function() {
    Patmos.prototype.add({}, 1, 2);
  })
  .add('inst add', function() {
    new Patmos({}).add(1, 2);
  })
  .on('cycle', function(event) {
    console.log(String(event.target), process.memoryUsage());
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ 'async': true });
/**/
