require('source-map-support').install();

import patrun from 'patrun';
import nid from 'nid';
import { append, assoc, curry, defaultTo, dissoc, equals, filter, forEach, map, merge, reduce, partial } from 'ramda';
import Rx from 'rx';

//
import { chainMethod, chainReducer, method, reducer } from '../lib/as-state';

//
import { catchReducer, concatMapReducer, createObservable, findMethod, isFunction, passThrough, update, updateIn } from './lib/helpers';
import log from './lib/log';

// initial service state
export const initialState = {
  gex: true,
  log: {
    level: 'info'
  }
};

/**
 * Patmos - description
 *
 * @param  {type} state = initialState description
 * @return {type}                      description
 */
export function Patmos(state = initialState) {
  this.state = state;
}

// logging
Patmos.prototype.log = log;

/**
 * add - add a method to the service
 *
 * @param {obejct} state
 * @param  {type} pattern
 * @param  {type} method
 * @return {type}
 */
Patmos.prototype.add = chainReducer << curry << function (state, pattern, method) {
  return update('methods', append({pattern, method}), state);
}

/**
 * attach - apply a client
 *
 * @param {obejct} state
 * @param {type} pattern
 * @param {type} middleware
 * @return {obejct}
 */
Patmos.prototype.attach = chainReducer << curry << function (state, pattern, method) {
  return update('clients', append({pattern, method}), state);
}

/**
 * dispatch - description
 *
 * @param  {type} state   description
 * @param  {type} message description
 * @return {type}         description
 */
Patmos.prototype.dispatch = method << curry << async function (state, message) {
  const reqId = nid(8); // for logging

  log.info('dispatch ' + reqId + ' ' + JSON.stringify(message));

  const test = patrun({gex: state.gex}).add(message, true);
  const service = getServiceForDispatch(state, message);

  // init middleware
  const middlewares = defaultTo([], state.middleware)
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service(x) >> findMethod(x));

  log.silly('dispatch ' + reqId + ' matched ' + middlewares.length + ' middlewares');

  // prepare request by applying middleware in series
  const prepareRequest = middlewares
    >> filter(([ req ]) => isFunction(req))
    >> map(([ req ]) => (val, i) => {
      const fn = createObservable(req);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly('dispatch ' + reqId + ' request middleware before ' + JSON.stringify(val));

          return fn(val);
        })
        .tap(val => {
          log.silly('dispatch ' + reqId + ' request middleware after ' + JSON.stringify(val));
        })
        .catch(e => {
          log.error('dispatch ' + reqId + ' request middleware error ' + e.toString());

          return Rx.Observable.of(val);
        });
    })
    >> reduce(concatMapReducer, Rx.Observable.of(message));

  // execute request middleware stream
  const request = await prepareRequest.toPromise();

  // find clients that match the message
  const clients = defaultTo([], state.clients)
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service(x) >> findMethod(x));

  log.silly('dispatch ' + reqId + ' matched ' + clients.length + ' clients');
  log.debug('dispatch ' + reqId + ' request ' + JSON.stringify(request));

  // returns response from first client to succeed
  const getResponse = clients
    >> append((req) => exec)
    >> filter(req => isFunction(req))
    >> map(req => {
      const fn = createObservable(req);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly('dispatch ' + reqId + ' client request ' + JSON.stringify(request));

          return fn(request);
        })
        .retry(3)
        .tap(res => {
          log.silly('dispatch ' + reqId + ' client response ' + JSON.stringify(res));
        }, err => {
          log.silly('dispatch ' + reqId + ' client error ' + JSON.stringify(err));
        });
    })
    >> reduce(catchReducer, Rx.Observable.throw(request));

  // execute client stream or returns nothing if they all fail
  const response = await getResponse
    .onErrorResumeNext(Rx.Observable.return())
    .toPromise();

  log.debug('dispatch ' + reqId + ' response ' + JSON.stringify(response));

  // prepare response by applying middleware in series
  const prepareResponse = middlewares
    >> filter(([ _, res ]) => isFunction(res))
    >> map(([ _, res ]) => (val, i) => {
      const fn = createObservable(res);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly('dispatch ' + reqId + ' response middleware before ' + JSON.stringify(val));

          return fn(val);
        })
        .tap(val => {
          log.silly('dispatch ' + reqId + ' response middleware after ' + JSON.stringify(val));
        })
        .catch(e => {
          log.error('dispatch ' + reqId + ' response middleware error ' + e.toString());

          return Rx.Observable.of(val);
        });
    })
    >> reduce(concatMapReducer, Rx.Observable.of(response));

  // execute response middleware stream
  const result = await prepareResponse.toPromise();

  log.info('dispatch ' + reqId + ' result ' + JSON.stringify(result));

  return result;
}

/**
 * exec - description
 *
 * @param  {type} state   description
 * @param  {type} message description
 * @return {type}         description
 */
Patmos.prototype.exec = method << curry << function (state, message) {
  const fn = find(state, message);

  if (isFunction(fn)) {
    const observable = message
      >> createObservable(fn);

    return observable.toPromise();
  }

  return Promise.resolve();
}

/**
 * expose - description
 *
 * @param  {type} state   description
 * @param  {type} pattern description
 * @param  {type} method  description
 * @return {type}         description
 */
Patmos.prototype.expose = chainReducer << curry << function (state, pattern, method) {
  const service = Patmos(state, pattern);

  //@TODO how to handle this?
  method(this); // initiate server

  return update('servers', append({pattern, method}), state);
}

/**
 * find - find a method by a specific pattern
 *
 * @param {obejct} state
 * @param {string} pattern
 * @return {function}
 */
Patmos.prototype.find = method << curry << function (state, pattern) {
  return getStore(state).find(pattern);
}

/**
 * getState - gets the current service state with the store removed
 *
 * @param {obejct} state
 * @return {function}
 */
Patmos.prototype.getState = method << function (state) {
  return dissoc('_store', state);
}

/**
 * getStore - gets or creates the patrun store from state;
 *
 * @param {obejct} state
 * @return {function}
 */
Patmos.prototype.getStore = method << function (state) {
  return state._store || createStore(state)._store;
}

/**
 * has - check if a method exists
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {boolean}
 */
Patmos.prototype.has = method << function (state, pattern) {
  return !!getStore(state).find(pattern);
}

/**
 * list- list methods by a pattern subset
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {array}
 */
Patmos.prototype.list = method << function (state, pattern) {
  return getStore(state).list(pattern);
}

/**
 * remove - remove a method from the service
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {object}
 */
Patmos.prototype.remove = chainReducer << function (state, pattern) {
  return update('methods', filter(x => !equals(x.pattern,  pattern)), state);
}

/**
 * use - apply a middleware
 *
 * @param {obejct} state
 * @param {type} pattern
 * @param {type} middleware
 * @return {obejct}
 */
Patmos.prototype.use = chainReducer << function (state, pattern, method) {
  return update('middleware', append({pattern, method}), state);
}

/**
 * default factory method for applying config to initial state
 */
export default function (config) {
  return new Patmos(merge(initialState, config));
}
