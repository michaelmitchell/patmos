// babel operator overload
import fs from "fs";
import path from "path";
import patrun from "patrun";
import nid from "nid";
import R, {__, apply, append, assoc, curry, dissoc, equals, evolve, filter, forEach,
  head, is, lens, lensPath, lensProp, map, merge, tail, transpose, reduce, over,
  partial, prop, tap } from "ramda";
import Rx from 'rxjs/Rx';
import yaml from "js-yaml";

// initial service state
export const initialState = {
  gex: true,
  log: {
    level: "info"
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
  const updater = over << lensPath(path);

  return apply(updater, args);
}


/**
 * alias for over with some helpers
 */
const update = function (prop, ...args) {
  const updater = over << lensProp(prop);

  return apply(updater, args);
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
const observableFactory = function (fn) {
  return fn.length === 2 ? Rx.Observable.bindCallback(fn) : fn;
}

//
const mergeStream = (stream, fn) => stream.mergeMap(val => fn(val));

//
const exec = curry << async function (state, message) {
  const reqId = nid(8); // for logging

  log("exec " + reqId + " " + JSON.stringify(message));

  const test = patrun({gex: state.gex}).add(message, true);
  const service = Patmos(state);

  // init middleware
  const middlewares = state.middleware
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service >> locateMethod(x));

  log("exec " + reqId + " matched " + middlewares.length + " middlewares");

  const clients = state.clients
    >> filter(x => (test.list(x.pattern).length > 0))
    >> map(x => service >> locateMethod(x));

  log("exec " + reqId + " matched " + clients.length + " clients")
 
  //
  const prepareRequest = middlewares
    >> map(([ req ]) => observableFactory(req))
    >> reduce(mergeStream, Rx.Observable.of(message)); 
    
  const request = await prepareRequest.toPromise(); 

  console.log('request', request);

  //
  const getResponse = clients
    >> map((req) => observableFactory(req))
    >> reduce(mergeStream, Rx.Observable.of(request));

  const response = await getResponse.toPromise();
  
  console.log('response', response);

  //
  const prepareResponse = middlewares
    >> map(([ _, res ]) => observableFactory(res))
    >> reduce(mergeStream, Rx.Observable.of(response)); 
  
  const result = await prepareResponse.toPromise();

  console.log('result', result);

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

//
const log = function (...args) {
  apply(console.log, args);
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

const callbackmw = (service) => [
  (req, callback) => {
    console.log('req 1', req);
    callback(assoc("req1", true, req));
  },
  (res, callback) => {
    console.log('res 1');
    callback(assoc("res", true, res));
  }
];

// example middleware spec
const promisemw = (service) => [
  async (req) => {
    console.log('req 2', req);
    return assoc("req2", true, req);
  },
  async (res) => {
    console.log('res 2');
    return assoc("res", true, res);
  }
];

const client = (service) => async (req) => {
  return {body: "hello world"};
}

let service = factory()
  .add({a: 1}, () => "howdy")
  .use({}, callbackmw)
  .use({a: '*'}, promisemw)
  .attach({}, client);

//console.log(service.getState());

service.exec({a: 1, body: "hi"});

// middleware
