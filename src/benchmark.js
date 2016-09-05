//
import Benchmark from "benchmark"
import R from "ramda";


// applies reducer to state and returns chain
const chainReducer = function (fn) {
  const reducer = function (...args) {
    const state = fn.apply(this, [this.state].concat(args));

    this.state = Object.assign({}, state);

    return this;
  };

  reducer.test = fn;

  return reducer;
}

// applies a reducer to state and returns a value;
const reducer = function (fn) {

}

const sideEffect = function (fn) {

}

function Patmos(initialState = {}) {
  this.state = initialState;
}

Patmos.prototype.add = chainReducer << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b
  });
}
