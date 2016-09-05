import R, {apply, curry, is, over, lensPath, lensProp } from 'ramda';
import Rx from 'rx';

//
export const createObservable = function (fn) {
  return fn.length === 2
    ? Rx.Observable.fromNodeCallback(fn)
    : (...args) => {
      const result = apply(fn, args);

      return (result instanceof Promise)
        ? Rx.Observable.fromPromise(result)
        : Rx.Observable.just(result);
    };
};

//
export const catchReducer = (stream, observable) => {
  return stream.catch(observable);
};

//
export const concatMapReducer = (stream, factory) => {
  return stream.concatMap(factory);
};

//
export const findMethod = function (config) {
  let module = config.module;

  // load node module if defined
  if (typeof module === 'string') {
    // include config modules relative to the main module
    if (module.substr(0, 1) === '.') {
      let root = path.dirname(require.main.filename);
      
      module = require(root + '/' + module);
    }
    else {
      module = require(module);
    }

    if (!module) {
      throw 'module not found';
    }
  }

  //
  let method = config.method;

  if (module && typeof method === 'string') {
    method = module[method || 'default'];
  }
  else if (module && typeof method === 'object') {
    method = module[method.name || 'default'].apply({}, method.args || []);
  }
  else if (module) {
    method = module.default;
  }

  return method;
};

//
export const isFunction = is(Function);

//
export const passThrough = curry << function (target, fn) {
  return (...args) => {
    const result = apply(fn, args);

    return isFunction(result)
      ? passThrough(result)
      : target(result);
  };
};

//
export const updateIn = function (path, ...args) {
  return apply(over(lensPath(path)), args);
};

//
export const update = function (prop, ...args) {
  return apply(over(lensProp(prop)), args);
};
