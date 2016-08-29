// babel operator overload
import fs from "fs";
import path from "path";
import patrun from "patrun";
import R, {apply, append, assoc, curry, equals, evolve, filter, forEach, is, map, merge } from "ramda";
import yaml from "js-yaml";

// type checks
const isFunction = is(Function);

// default config
export const defaults = "./config/default.yaml"
  >> fs.readFileSync
  >> yaml.safeLoad;

/**
 * Patmos service
 *
 * @param  {object} state
 * @return {object}
 */
const Patmos = function (state = {}) {
  const spec = {
    add: chain(add),
    attach: chain(attach),
    exec: exec,
    expose: chain(expose),
    find: find,
    has: has,
    list: list,
    remove: chain(remove),
    use: chain(use),
  };

  // patrun is mutable, replace store to avoid side effects
  const store = patrun({gex: state.gex});

  // add methods to store
  if (state.methods) {
    state.methods
      >> map(fromConfig)
      >> forEach(args => apply(store.add, args))
  }

  // add/replace old store
  const newState = R.assoc('store', store, state);

  return spec
    >> map(f => f(newState))
    >> assoc('state', newState);
}

//
const fromConfig = function (config) {
  let pattern = config.pattern || {};
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

  return [pattern, method];
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
  const transform = evolve({
    methods: append({pattern, method})
  });

  return transform(state);
}

/**
 * attach - apply a client
 *
 * @param {obejct} state
 * @param {type} pattern
 * @param {type} middleware
 * @return {obejct}
 */
const attach = curry << function (state, pattern, middleware) {
  let method = middleware << Patmos(state);

  if (isFunction(method)) {
    const transform = evolve({
      clients: append({pattern, method})
    });

    return transform(state);
  }

  return state;
}


//
const chain =  (fn) => (state) => (...args) => {
  const result = R.apply(fn(state), args);

  return isFunction(result)
    ? chain(result)
    : Patmos(result);
}

//
const exec = curry << function ({ store }, message) {
  console.log(store.find(message));

  return message;
}

const expose = curry << function (state, pattern, middleware) {
  let method = middleware << Patmos(state);

  if (isFunction(method)) {
    const transform = evolve({
      servers: append({pattern, method})
    });

    return transform(state);
  }

  return state;
}

/**
 * find - find a method by a specific pattern
 *
 * @param {obejct} state
 * @param {string} pattern
 * @return {function}
 */
const find = curry << function ({ store }, pattern) {
  return store.find(pattern)
}

/**
 * has - check if a method exists
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {boolean}
 */
const has = curry << function ({ store }, pattern) {
  return !!store.find(pattern)
}

/**
 * list- list methods by a pattern subset
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {array}
 */
const list = curry << function ({ store }, pattern) {
  return store.list(pattern);
}

/**
 * remove - remove a method from the service
 *
 * @param {obejct} state
 * @param {type} pattern
 * @return {object}
 */
const remove = curry << function (state, pattern) {
  const transform = evolve({
    methods: filter(x => !equals(x,  pattern))
  });

  return transform(state);
}

/**
 * use - apply a middleware
 *
 * @param {obejct} state
 * @param {type} pattern
 * @param {type} middleware
 * @return {obejct}
 */
const use = curry << function (state, pattern, middleware) {
  let method = middleware << Patmos(state);

  if (isFunction(method)) {
    const transform = evolve({
      middleware: append({pattern, method})
    });

    return transform(state);
  }

  return state;
}

//
const factory = function (config) {
  return Patmos << merge(defaults, config);
}

export default factory;

(serivice) => {

  return [
    (handleRequest),
    handleResponse
  ]
}

//
// exec message
// find middleware
// execute middleware request
// return middleware modified request
// send middleware request
// execute middleware response
// return middleware modified response;

// middleware example
(service) => [
  async (req) => {
    // prevent recursion
    if (req.role === 'middleware' && cmd === 'timestamp') {
      return;
    }

    let {result} = await scope.exec({role: 'middleware', cmd: 'timestamp'});
    let sentAt = result;

    if (!sentAt) {
      sentAt = Date.now();
    }

    return Object.assign(req, {sentAt});
  },
  async (res) => {
    let {result} = await scope.exec({role: 'middleware', cmd: 'timestamp'});
    let recievedAt = result;

    if (!recievedAt) {
      recievedAt = Date.now();
    }

    return Object.assign(res, {sentAt, recievedAt});
  }
];
