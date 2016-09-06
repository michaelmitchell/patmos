//
import Benchmark from "benchmark"

import R, { curry } from 'ramda';
import { chainMethod, chainReducer, method, reducer, sideEffect } from "../lib/as-stated";


// test
function Patmos(initialState = {}) {
  this.state = initialState;
}

const add = function (state, a, b) {
  const newState = Object.assign({}, state, {
    result: a + b
  });

  return newState;
};

Patmos.prototype.add = chainReducer << curry << add;

Patmos.prototype.getState = sideEffect << function (state) {
  this.bananaboatalksjdas = 1;
  return this;
}

console.log(new Patmos().getState());

/**/
new Benchmark.Suite()
  .add('raw add', function() {
    add({}, 1, 2);
  })
  .add('proto add', function() {
    Patmos.prototype.add({}, 1, 2);
  })
  .add('inst add', function() {
    new Patmos({}).add(1, 2);
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  //.run({ 'async': true });
/**/
