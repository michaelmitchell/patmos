// modules
import _ from 'lodash';
import fs from 'fs';
import patrun from 'patrun';
import yaml from 'js-yaml';

// helpers
import { load_all_from_config } from './lib/config';
import logger from './lib/logger';

// load default config
export const defaults = yaml.safeLoad(fs.readFileSync('./config/default.yaml'));

/**
 *
 */
export class Patmos {

  /**
   * constructor - description
   *
   * @param  {type} options
   * @return {type}
   */
  constructor(options) {
    this.options = _.assign(defaults, options);

    //
    this.log = logger;
    this.log.level = this.options.log.level;

    // method store
    this.store = patrun({gex: this.options.gex});

    // middleware
    this.clients = [];
    this.middleware = [];

    // root config scope
    let scope = this.scope();

    load_all_from_config(scope, options);
  }

  /**
   * add - add a method to the service
   *
   * @param  {type} pattern
   * @param  {type} method
   * @return {type}
   */
  add(pattern, method) {
    this.log.debug('add()', pattern);

    //@TODO
    // - validate pattern
    // - check existing pattern
    // - validate method
    //
    this.store.add(pattern, method)

    return this;
  }

  /**
   * attach - apply a client middleware
   *
   * @param  {type} pattern
   * @param  {type} middleware
   * @return {type}
   */
  attach(pattern, middleware) {
    if (!middleware) {
      middleware = pattern;
      pattern = {};
    }

    this.log.debug('attach()', pattern, middleware ? middleware.name : 'unknown');

    let scope = this.scope(pattern, ['add', 'exec', 'find', 'has', 'list', 'remove']);
    let fn = middleware(scope);

    // only add middleware that returns a function
    if (typeof fn === 'function') {
      this.clients.push([pattern, fn]);
    }

    return this;
  }

  /**
   * exec
   *
   * @async
   * @param  {type} message
   * @return {type}
   */
  async exec(message) {
    this.log.debug('exec()', message);

    //reverse pattern match for middleware
    let test = patrun({gex: this.options.gex}).add(message, true);

    //
    let clients = [];

    // partial match client middleware
    for (let [pattern, middleware] of this.clients) {
      if (test.list(pattern).length > 0) {
        clients.push(middleware);
      }
    }

    //
    let requests = [];

    // partial match middleware
    for (let [pattern, middleware] of this.middleware) {
      if (test.list(pattern).length > 0) {
        requests.push(middleware);
      }
    }

    //
    let responses = [];

    // apply request middleware
    for (let request of requests) {
      try {
        let response = await request(message);

        if (typeof response === 'function') {
          responses.push(response);
        }
      }
      catch (e) {
        throw e;
      }
    }

    // default
    let result = null;

    for (let request of clients) {
      try {
        let response = await request(message);

        if (typeof response === 'function') {
          result = await response(result) || null;

          if (result !== null) {
            break; // first result is used
          }
        }
      }
      catch (e) {
        throw e;
      }
    }

    // apply response middleware before returning
    if (result) {
      for (let response of responses) {
        try {
          await response(result);
        }
        catch (e) {
          throw e;
        }
      }
    }

    return result;
  }

  /**
   * expose - add a server middleware
   *
   * @param  {type} pattern
   * @param  {type} middleware
   * @return {type}
   */
  expose(pattern, middleware) {
    return this.use(pattern, middleware);
  }

  /**
   * find - find a method by a specific pattern
   *
   * @param  {type} pattern
   * @return {type}
   */
  find(pattern) {
    this.log.debug('find()', pattern);

    return this.store.find(pattern);
  }

  /**
   * has - check if a local method exists
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  has(pattern) {
    this.log.debug('has()', pattern);

    return !!this.store.find(pattern);
  }

  /**
   * list- list methods by a pattern subset
   *
   * @param  {type} pattern
   * @return {type}
   */
  list(pattern) {
    this.log.debug('list()', pattern);

    return this.store.list(pattern);
  }

  /**
   * remove - remove a method from the service
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  remove(pattern) {
    this.log.debug('remove()', pattern);

    this.store.remove(pattern);

    return this;
  }

  /**
   * store - create pattern scoped functions
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  scope(pattern = {}, methods = null) {
    this.log.debug('scope()', pattern);

    // init scope
    let scope = {
      parent: this, // access to parent scope
      pattern: pattern // the pattern this scope is tied to
    };

    // create scoped functions
    let scopify = (fn, args, chain = false) => {
      let [x, ...y] = args;
      let result = fn.call(this, {...x, ...pattern}, ...y);
      return chain ? scope : result;
    };

    //
    scope = _.assign(scope, {
      add: (...args) => scopify(this.add, args, true),
      attach: (p, m) => scopify(this.use, m ? [p, m] : [{}, p], true),
      exec: async (m) => await this.exec({...m, ...pattern}),
      expose: (p, m) => scopify(this.expose, m ? [p, m] : [{}, p], true),
      find: (...args) => scopify(this.find, args),
      has: (...args) => scopify(this.has, args),
      list: (...args) => scopify(this.list, args),
      remove: (...args) => scopify(this.remove, args, true),
      scope: (...args) => scopify(this.scope, args),
      use: (p, m) => scopify(this.use, m ? [p, m] : [{}, p], true)
    });

    //
    if (typeof methods === 'array') {
      scope = _.pick(scope, methods);
    }

    return scope;
  }

  /**
   * use - apply a middleware
   *
   * @param  {type} pattern
   * @param  {type} middleware
   * @return {type}
   */
  use(pattern, middleware) {
    if (!middleware) {
      middleware = pattern;
      pattern = {};
    }

    this.log.debug('use()', pattern, middleware ? middleware.name : 'unknown');

    let scope = this.scope(pattern, ['add', 'exec', 'find', 'has', 'list', 'remove']);
    let fn = middleware(scope);

    // only add middleware that returns a request function
    if (typeof fn === 'function') {
      this.middleware.push([pattern, fn]);
    }

    return this;
  }
}

// export factory
export default function(options) {
  return new Patmos(options)
}
