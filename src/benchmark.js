//
import Benchmark from "benchmark"
import R, { clone, concat, curry } from "ramda";

const __chainReducer = function (fn) {
  return function () {
    const newState = fn.apply(null, arguments);

    this.state = newState;

    return this;
  }
}

const chainReducer = function (fn) {
  return function (...args) {
    const state = clone(this.state);
    
    const newState = fn.apply(null, [state].concat(arguments));

    if (typeof newState === 'function') {
      return __chainReducer(newState);
    }

    this.state = newState;

    return this;
  }
}

// test
function Patmos(initialState = {}) {
  this.state = initialState;
}

Patmos.prototype.add = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b
  });
}

Patmos.prototype.add1 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 1
  });
}

Patmos.prototype.add2 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 2
  });
}

Patmos.prototype.add3 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 3
  });
}

Patmos.prototype.add4 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 4
  });
}

Patmos.prototype.add5 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 5
  });
}

Patmos.prototype.add6 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 6
  });
}

Patmos.prototype.add7 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 7
  });
}

Patmos.prototype.add8 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 8
  });
}

Patmos.prototype.add9 = chainReducer << curry << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 9
  });
}

const result = new Patmos({result: null})
  .add(3,4)


function PatmosFI(state = {}) {
  return {
    add: R.partial(PatmosFI.add, [state]),
    add1: R.partial(PatmosFI.add1, [state]),
    add2: R.partial(PatmosFI.add2, [state]),
    add3: R.partial(PatmosFI.add3, [state]),
    add4: R.partial(PatmosFI.add4, [state]),
    add5: R.partial(PatmosFI.add5, [state]),
    add6: R.partial(PatmosFI.add6, [state]),
    add7: R.partial(PatmosFI.add7, [state]),
    add8: R.partial(PatmosFI.add8, [state]),
    add9: R.partial(PatmosFI.add9, [state]),
    state: state
  }
}

function chain(fn) {
  return function (...args) {
    return PatmosFI(fn.apply(null, args));
  }
}

PatmosFI.add = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b 
  });
}

PatmosFI.add1 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 1
  });
}

PatmosFI.add2 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 2
  });
}

PatmosFI.add3 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 3
  });
}

PatmosFI.add4 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 4
  });
}

PatmosFI.add5 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 5
  });
}

PatmosFI.add6 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 6
  });
}

PatmosFI.add7 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 7
  });
}

PatmosFI.add8 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 8
  });
}

PatmosFI.add9 = chain << function (state, a, b) {
  return Object.assign({}, state, {
    result: a + b + 9
  });
}

const result2 = PatmosFI({result: null})
  .add(3,4);

/**/
new Benchmark.Suite()
  .add('ProtoFunctional', function() {
    const result = new Patmos({result: null})
      .add(3,4);
  })
  .add('Functional', function() {
    const result2 = PatmosFI({result: null})
      .add(3,4);
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ 'async': true });
/**/
