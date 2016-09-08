//
import { apply, curry, is, over, lensPath, lensProp } from 'ramda';
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
}

//
export const catchReducer = function (stream, observable) {
  return stream.catch(observable);
}

//
export const concatMapReducer = function (stream, factory) {
  return stream.concatMap(factory);
}

//
export const isFunction = is(Function);

//
export const updateIn = function (path, ...args) {
  return apply(over(lensPath(path)), args);
}

//
export const update = function (prop, ...args) {
  return apply(over(lensProp(prop)), args);
}
