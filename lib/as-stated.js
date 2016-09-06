var R = require('ramda');

// factory for creating predictable state functions
function factory(targetFn, options) {
  return function () {
    var scope = options.sideEffect !== true
      ? this.constructor.prototype
      : this;

    var newState = targetFn.apply(scope, arguments);

    // support for curried functions
    if (typeof newState === 'function') {
      return factory(newState, options).bind(this);
    }

    if (options && options.reducer === true) {
      this.state = newState;
    }

    if (options && options.chain === true) {
      return this;
    }
    else {
      return newState;
    }
  }
}

/**
 * action
 * @param  {function} targetFn
 * @return {mixed} returnValue
 */
function method(targetFn) {
  return function () {
    if (this instanceof this.constructor) {
      var method = R.partial(targetFn, [this.state]);

      var innerFn = factory(method);

      return innerFn.apply(this, arguments);
    }
    else {
      return targetFn.apply(this, arguments);
    }
  }
}

/**
 * action
 * @param  {function} targetFn
 * @return {mixed} returnValue
 */
function sideEffect(targetFn) {
  return function () {
    if (this instanceof this.constructor) {
      var method = R.partial(targetFn, [this.state]);
      var innerFn = factory(method, { sideEffect: true });

      return innerFn.apply(this, arguments);
    }
    else {
      return targetFn.apply(this, arguments);
    }
  }
}

/**
 * action
 * @param  {function} targetFn
 * @return {mixed} returnValue
 */
function chainEffect(targetFn) {
  return function () {
    if (this instanceof this.constructor) {
      var method = R.partial(targetFn, [this.state]);
      var innerFn = factory(method, { chain: true, sideEffect: true });

      return innerFn.apply(this, arguments);
    }
    else {
      return targetFn.apply(this, arguments);
    }
  }
}

/**
 * chainAction
 * @param  {function} targetFn
 * @return {object} this
 */
function chainMethod(targetFn) {
  return function () {
    if (this instanceof this.constructor) {
      var method = R.partial(targetFn, [this.state]);
      var innerFn = factory(method, { chain: true });

      return innerFn.apply(this, arguments);
    }
    else {
      return targetFn.apply(this, arguments);
    }
  }
}

/**
 * chainReducer
 * @param  {function} targetFn
 * @return {object} this
 */
function chainReducer(targetFn) {
  return function () {
    if (this instanceof this.constructor) {
      var reducer = R.partial(targetFn, [this.state]);
      var innerFn = factory(reducer, { reducer: true, chain: true });

      return innerFn.apply(this, arguments);
    }
    else {
      return targetFn.apply(this, arguments);
    }
  }
}

/**
 * reducer
 * @param  {function} targetFn
 * @return {mixed} newState
 */
function reducer(targetFn) {
  return function () {
    if (this instanceof this.constructor) {
      var reducer = R.partial(targetFn, [this.state]);
      var innerFn = factory(reducer, { reducer: true });

      return innerFn.apply(this, arguments);
    }
    else {
      return targetFn.apply(this, arguments);
    }
  }
}

//
module.exports = {
  chainEffect: chainEffect,
  chainMethod: chainMethod,
  chainReducer: chainReducer,
  method: method,
  reducer: reducer,
  sideEffect: sideEffect
};
