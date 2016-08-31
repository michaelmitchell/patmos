require("source-map-support").install();

import fs from "fs";
import path from "path";
import patrun from "patrun";
import nid from "nid";

import R, {__, apply, append, assoc, curry, dissoc, equals, evolve, filter, forEach,
  head, is, lens, lensPath, lensProp, map, merge, tail, transpose, reduce, over,
  partial, prop, tap } from "ramda";

import Rx from 'rx';
import yaml from "js-yaml";

//
import log from "./lib/logger";


// initial service state
export const initialState = {
  gex: true,
  log: {
    level: "silly"
  },
  clients: [
    {
      pattern: {},
      module: "patmos-default-client"
    }
  ]
};

/**
 * Patmos service
 *
 * @param  {object} state
 * @return {object}
 */
export const Patmos = function (state = initialState) {
  const chain = passThrough(Patmos);

  log.level = state.log.level;

  const spec = {
    add: chain(add),
    attach: chain(attach),
    exec: exec,
    expose: chain(expose),
    find: find,
    getState: getState,
    getStore: getStore,
    has: has,
    list: list,
    remove: chain(remove),
    use: chain(use),
  };

  const newState = state
    >> createStore;

  return spec >> map(f => partial(f, [newState]));
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

/**
 * alias for over with some helpers
 */
const updateIn = function (path, ...args) {
  return apply(over(lensPath(path)), args);
}

/**
 * alias for over with some helpers
 */
const update = function (prop, ...args) {
  return apply(over(lensProp(prop)), args);
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

//
const createObservable = function (fn) {
  return fn.length === 2
    ? Rx.Observable.fromNodeCallback(fn)
    : (...args) => Rx.Observable.fromPromise(apply(fn, args));
}

//
const concatMapReducer = (stream, factory) => {
  return stream.concatMap((val, i) => factory(val, i));
}

//
const exec = curry << async function (state, message) {
  const reqId = nid(8); // for logging

  log.info("exec " + reqId + " " + JSON.stringify(message));

  const test = patrun({gex: state.gex}).add(message, true);
  const service = Patmos(state);

  // init middleware
  const middlewares = state.middleware
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service >> locateMethod(x));

  log.silly("exec " + reqId + " matched " + middlewares.length + " middlewares");

  //
  const prepareRequest = middlewares
    >> filter(([ req ]) => isFunction(req))
    >> map(([ req ]) => (val, i) => {
      const fn = createObservable(req);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly("exec " + reqId + " request middleware " + JSON.stringify(val));

          return fn(val)
        })
        .catch(e => {
          log.error("exec " + reqId + " request middleware error " + e.toString());

          return Rx.Observable.of(val);
        });
    })
    >> reduce(concatMapReducer, Rx.Observable.of(message));

  const request = await prepareRequest.toPromise();

  log.debug("request " + reqId + " " + JSON.stringify(message));

  // init clients
  const clients = state.clients
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service >> locateMethod(x));

  log.silly("exec " + reqId + " matched " + clients.length + " clients")

  //
  const getResponse = clients
    >> filter(req => isFunction(req))
    >> map(req => (val, i) => {
      const fn = createObservable(req);

      return Rx.Observable.just(fn)
        .flatMap(fn => fn(val))
        .catch(Rx.Observable.of(val))
    })
    >> reduce(concatMapReducer, Rx.Observable.of(request));

  const response = await getResponse.toPromise();

  log.debug("response " + reqId + " " + JSON.stringify(response));

  //
  const prepareResponse = middlewares
    >> filter(([ _, res ]) => isFunction(res))
    >> map(([ _, res ]) => (val, i) => {
      const fn = createObservable(res);

      return Rx.Observable.just(fn)
        .flatMap(fn => {
          log.silly("exec " + reqId + " response middleware " + JSON.stringify(val));

          return fn(val)
        })
        .catch(e => {
          log.error("exec " + reqId + " response middleware error " + e.toString());

          return Rx.Observable.of(val);
        })
    })
    >> reduce(concatMapReducer, Rx.Observable.of(response));

  const result = await prepareResponse.toPromise();

  log.info("result " + reqId + " " + JSON.stringify(result));;

  return result;
}

const expose = curry << function (state, pattern, method) {
  //return state >> update('servers', append({pattern, method}));
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

/**
 * createStore - creates the patrun store from state methods
 */
const createStore = function (state) {
  // patrun is mutable, replace store to avoid side effects
  const store = patrun({gex: state.gex});

  // add methods to store
  if (state.methods) {
    state.methods
      >> map(locateMethod)
      >> forEach(args => apply(store.add, args))
  }

  return state >> assoc("_store", store);
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

const client = (service) => async (req) => {
  return {body: "hello world"};
}

let service = factory()
  .add({a: 1}, () => "howdy")
  .use({}, promisemw)
  .use({a: '*'}, callbackmw)
  .attach({}, client);

//console.log(service.getState());


const main = async function () {
  try {
   let result = await service.exec({a: 1, body: "hi"});
  }
  catch (e) {
    console.log(e.stack.toString());
  }
}

main();



// middleware
