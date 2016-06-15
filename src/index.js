// modules
import _ from 'lodash';
import fs from 'fs';
import patrun from 'patrun';
import yaml from 'js-yaml';

// helpers
import { scopify, scopify_chainable } from './lib/scope';
import { load_all_from_config } from './lib/config';
import logger from './lib/logger';

// load default config
export const defaults = yaml.safeLoad(fs.readFileSync('./config/default.yaml'));

// different scope tyopes
export const SCOPE_DEFAULT = 'default';
export const SCOPE_MIDDLEWARE = 'middleware';

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
    load_all_from_config(this.scope(), options);
  }

  /**
   * add - add a method to the service
   *
   * @param  {type} pattern
   * @param  {type} method
   * @return {type}
   */
  add(pattern, method) {
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

    let scope = this.scope(pattern, SCOPE_MIDDLEWARE);
    let fn = middleware(scope);

    // only add middleware that returns a function
    if (typeof fn === 'function') {
      this.clients.push([pattern, fn]);
    }

    return this;
  }

  /**
   * run
   *
   * @async
   * @param  {type} message
   * @return {type}
   */
  async exec(message) {
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
    return this.store.find(pattern);
  }

  /**
   * has - check if a local method exists
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  has(pattern) {
    return !!this.store.find(pattern);
  }

  /**
   * list- list methods by a pattern subset
   *
   * @param  {type} pattern
   * @return {type}
   */
  list(pattern) {
    return this.store.list(pattern);
  }

  /**
   * remove - remove a method from the service
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  remove(pattern) {
    this.store.remove(pattern);

    return this;
  }

  /**
   * store - create pattern scoped functions
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  scope(pattern = {}, type = SCOPE_DEFAULT) {
    // init scope
    let scope = {
      parent: this, // access to parent scope
      pattern: pattern // the pattern this scope is tied to
    };

    // scopified api functions
    let api = {
      add: (...args) => scopify_chainable(this.add, scope, args),
      attach: (p, m) => scopify_chainable(this.attach, scope, m ? [p, m] : [{}, p]),
      expose: (p, m) => scopify_chainable(this.expose, scope, m ? [p, m] : [{}, p]),
      find: (...args) => scopify(this.find, scope, args),
      has: (...args) => scopify(this.has, scope, args),
      list: (...args) => scopify(this.list, scope, args),
      remove: (...args) => scopify_chainable(this.remove, scope, args),
      scope: (...args) => scopify(this.scope, scope, args),
      use: (p, m) => scopify_chainable(this.use, scope, m ? [p, m] : [{}, p])
    };

    //
    switch (type) {
      case SCOPE_DEFAULT:
        // default scope includes all scopified api methods
        _.assign(scope, api, {
          exec: (...args) => scopify(this.exec, scope, args)
        });
        break;
      case SCOPE_MIDDLEWARE:
        // middleware gets limited scope
        _.assign(scope, _.pick(api, ['add', 'find', 'has', 'list', 'remove']), {
          // middleware exec function is not scopified to prevent recursion
          exec: async (m) => {
            // exec cannot be called with a subset of the scopes pattern
            let test = patrun({gex: this.options.gex}).add(m, true);

            if (test.list(pattern).length > 0) {
              this.log.warn('executing a subset of scope in middleware is not allowed, use __dangerouslyExec instead.', {
                scope: pattern,
                message: m
              });
            }
            else {
              return await this.exec(m);
            }
          },
          // override scope check by using root exec function
          __dangerouslyExec: this.exec.bind(this)
        });
        break;
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

    let scope = this.scope(pattern, SCOPE_MIDDLEWARE);
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
