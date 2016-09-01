require("source-map-support").install();

import fs from "fs";
import path from "path";
import patrun from "patrun";
import nid from "nid";

import R, {__, apply, append, assoc, curry, defaultTo, dissoc, equals, evolve, filter, forEach,
  head, is, lens, lensPath, lensProp, map, merge, tail, transpose, reduce, over,
  partial, prop, tap } from "ramda";

import Rx from 'rx';
import yaml from "js-yaml";

//
import log from "./lib/logger";

// helpers that can probably be moved to a module
const updateIn = function (path, ...args) {
  return apply(over(lensPath(path)), args);
}

const update = function (prop, ...args) {
  return apply(over(lensProp(prop)), args);
}


// initial service state
export const initialState = {
  gex: true,
  log: {
    level: "silly"
  }
};

/**
 * Patmos service
 *
 * @param  {object} state
 * @return {object}
 */
export const Patmos = function (state = initialState, pattern = {}) {
  const chain = passThrough(Patmos);
  const scope = limitTo(pattern);

  log.level = state.log.level;

  const spec = {
    add: chain << scope << add,
    attach: chain << scope << attach,
    dispatch: scope << dispatch,
    exec: scope << exec,
    expose: chain << scope << expose,
    find: scope << find,
    getState: getState,
    getStore: getStore,
    has: scope << has,
    list: scope << list,
    remove: chain << scope << remove,
    use: chain << use
  };

  const newState = state
    >> createStore;

  return spec
    >> map(f => partial(f, [newState]))
    >> merge({
      log
    });
}

/**
 * add - add a method to the service
 *
 * @param {obejct} state
 * @param  {type} pattern
 * @param  {type} method
 * @return {type}
 */
const add = curry << function (state, pattern, method) {
  return state >> update('methods', append({pattern, method}));
}

/**
 * attach - apply a client
 *
 * @param {obejct} state
 * @param {type} pattern
 * @param {type} middleware
 * @return {obejct}
 */
const attach = curry << function (state, pattern, method) {
  return state >> update('clients', append({pattern, method}));
}

// creates observable from middleware function/promise
const createObservable = function (fn) {
  return fn.length === 2
    ? Rx.Observable.fromNodeCallback(fn)
    : (...args) => {
      const result = apply(fn, args);

      return (result instanceof Promise)
        ? Rx.Observable.fromPromise(result)
        : Rx.Observable.just(result);
    }
}

// chains clients
const clientReducer = (stream, client) => {
  return stream.catch(client)
}

/**
 * createStore - creates the patrun store from state methods
 */
const createStore = function (state) {
  // patrun is mutable, replace store to avoid side effects
  const store = patrun({gex: state.gex});

  // add methods to store
  if (state.methods) {
    state.methods
      >> forEach(x => {
        const fn = locateMethod(x);

        store.add(x.pattern, fn);
      })
  }

  return state >> assoc("_store", store);
}

//
const exec = curry << function (state, message) {
  const fn = find(state, message);

  if (isFunction(fn)) {
    const observable = createObservable(fn);

    return observable(message).toPromise();
  }

  return Promise.resolve();
}

//
const dispatch = curry << async function (state, message) {
  const reqId = nid(8); // for logging

  log.info("exec " + reqId + " " + JSON.stringify(message));

  const test = patrun({gex: state.gex}).add(message, true);
  const service = getServiceFor(state, message);

  // init middleware
  const middlewares = defaultTo([], state.middleware)
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service(x) >> locateMethod(x));

  log.silly("exec " + reqId + " matched " + middlewares.length + " middlewares");

  //
  const prepareRequest = middlewares
    >> filter(([ req ]) => isFunction(req))
    >> map(([ req ]) => (val, i) => {
      const fn = createObservable(req);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly("exec " + reqId + " request middleware before " + JSON.stringify(val));

          return fn(val)
        })
        .tap(val => {
          log.silly("exec " + reqId + " request middleware after " + JSON.stringify(val));
        })
        .catch(e => {
          log.error("exec " + reqId + " request middleware error " + e.toString());

          return Rx.Observable.of(val);
        });
    })
    >> reduce(middlewareReducer, Rx.Observable.of(message));

  const request = await prepareRequest.toPromise();

  // init clients
  const clients = defaultTo([], state.clients)
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service(x) >> locateMethod(x));

  log.silly("exec " + reqId + " matched " + clients.length + " clients")
  log.debug("exec " + reqId + " request " + JSON.stringify(request));

  //
  const getResponse = clients
    >> append((req) => exec)
    >> filter(req => isFunction(req))
    >> map(req => {
      const fn = createObservable(req);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly("exec " + reqId + " client request " + JSON.stringify(request));

          return fn(request);
        })
        .retry(3)
        .tap(res => {
          log.silly("exec " + reqId + " client response " + JSON.stringify(res));
        }, err => {
          log.silly("exec " + reqId + " client error " + JSON.stringify(err));
        });
    })
    >> reduce(clientReducer, Rx.Observable.throw(request));

  // execute clients or return nothing
  const response = await getResponse
    .onErrorResumeNext(Rx.Observable.return())
    .toPromise();

  log.debug("exec " + reqId + " response " + JSON.stringify(response));

  //
  const prepareResponse = middlewares
    >> filter(([ _, res ]) => isFunction(res))
    >> map(([ _, res ]) => (val, i) => {
      const fn = createObservable(res);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly("exec " + reqId + " response middleware before " + JSON.stringify(val));

          return fn(val)
        })
        .tap(val => {
          log.silly("exec " + reqId + " response middleware after " + JSON.stringify(val));
        })
        .catch(e => {
          log.error("exec " + reqId + " response middleware error " + e.toString());

          return Rx.Observable.of(val);
        });
    })
    >> reduce(middlewareReducer, Rx.Observable.of(response));

  const result = await prepareResponse.toPromise();

  log.info("exec " + reqId + " result " + JSON.stringify(result));;

  return result;
}

//
const expose = curry << function (state, pattern, method) {
  const service  = Patmos(state, pattern);

  method(service); // initiate server

  return state >> update('servers', append({pattern, method}));
}

/**
 * find - find a method by a specific pattern
 *
 * @param {obejct} state
 * @param {string} pattern
 * @return {function}
 */
const find = curry << function (state, pattern) {
  return getStore(state).find(pattern)
}

/**
 * getState - gets the current service state with the store removed
 *
 * @param {obejct} state
 * @return {function}
 */
const getState = (state) => {
  return dissoc("_store", state);
}

/**
 * getStore - gets or creates the patrun store from state;
 *
 * @param {obejct} state
 * @return {function}
 */
const getStore = function (state) {
  return state._store || createStore(state)._store;
}


// gets a middleware service with safe exec function replacement and limited scope
const getServiceFor = curry << function (state, message, { pattern }) {
  const test = patrun({gex: state.gex}).add(message, true);
  const service = Patmos(state, pattern);

  if (test.list(pattern).length > 0) {
    return merge(service, {
      // can execute outside of the service pattern scope
      __dangerouslyExec: exec(state),

      // prevent accidental recursion inside of middleware
      exec: () => {
        log.error("exec inside a superset of the middleware pattern is not allowed, use  __dangerouslyExec instead. "
          + JSON.stringify({pattern, message}));
      }
    });
  }

  return service;
}

/**
 * has - check if a method exists
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {boolean}
 */
const has = curry << function (state, pattern) {
  return !!getStore(state).find(pattern)
}

/**
 * isFunction
 */
const isFunction = is(Function);

/**
 * list- list methods by a pattern subset
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {array}
 */
const list = curry << function (state, pattern) {
  return getStore(state).list(pattern);
}

// limit a function to a specific superset of a pattern
// expects state and pattern to be the first params
const limitTo = curry << function(scope, fn) {
  return (...args) => {
    let [state, pattern, ...rest] = args;

    return fn(state, merge(pattern, scope), ...rest);
  }
}

//
const locateMethod = function (config) {
  let module = config.module;

  // load node module if defined
  if (typeof module === "string") {
    // include config modules relative to the main module
    if (module.substr(0, 1) === ".") {
      let root = path.dirname(require.main.filename);
      module = require(root + "/" + module);
    }
    else {
      module = require(module);
    }

    if (!module) {
      throw "module not found";
    }
  }

  //
  let method = config.method;

  if (module && typeof method === "string") {
    method = module[method || "default"];
  }
  else if (module && typeof method === "object") {
    method = module[method.name || "default"].apply({}, method.args || []);
  }
  else if (module) {
    method = module.default;
  }

  return method;
}

// chains middlewares
const middlewareReducer = (stream, factory) => {
  return stream.concatMap((val, i) => factory(val, i));
}

/**
 * yup, this...
 */
const passThrough = curry << function (target, fn) {
  return (...args) => {
    const result = apply(fn, args);

    return isFunction(result)
      ? passThrough(result)
      : target(result);
  }
}

/**
 * remove - remove a method from the service
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {object}
 */
const remove = curry << function (state, pattern) {
  return state >> update("methods", filter(x => !equals(x.pattern,  pattern)));
}

/**
 * use - apply a middleware
 *
 * @param {obejct} state
 * @param {type} pattern
 * @param {type} middleware
 * @return {obejct}
 */
const use = curry << function (state, pattern, method) {
  return state >> update('middleware', append({pattern, method}));
}

// service factor
const factory = function (config) {
  return Patmos << merge(initialState, config);
}

export default factory;

//
const callbackmw = (service) => [
  (req, callback) => {
    callback("errrror", assoc("req1", true, req));
  },
  (res, callback) => {
    callback("Error 2", assoc("res", true, res));
  }
];

// example middleware spec
const promisemw = (service) => [
  async (req) => {
    return assoc("req2", true, req);
  },
  async (res) => {
    return assoc("res", true, res);
  }
];

const client1 = (service) => async (req) => {
  return {body: "hello client 1"};
}

const client2 = (service) => async (req) => {
  return {body: "hello client 2"};
}

const client3 = (service) => async (req) => {
  return {body: "hello client 3"};
}

let service = factory()
  .add({a: 1}, (msg, cb) => cb(null, "howdy"));

service.expose({role: "api", type: "rest", resource: "auth"}, (service) => {
  // nothing
})

//console.log(service.getState());


const main = async function () {
  try {
   let result = await service.dispatch({a: 1, body: "hi"});

   console.log(result);
  }
  catch (e) {
    console.log(e.stack.toString());
  }
}

main();



// middleware
