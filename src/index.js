// modules
import _ from "lodash";
import fs from "fs";
import nid from "nid";
import patrun from "patrun";
import yaml from "js-yaml";

// helpers
import { method_name, pattern_name } from "./lib/common";
import { scopify, scopify_chainable } from "./lib/scope";
import { load_all_from_config } from "./lib/config";
import logger from "./lib/logger";

// load default config
export const defaults = yaml.safeLoad(fs.readFileSync("./config/default.yaml"));

// different scope tyopes
export const SCOPE_CLIENT = "client";
export const SCOPE_DEFAULT = "default";
export const SCOPE_MIDDLEWARE = "middleware";
export const SCOPE_SERVER = "server";

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

    this.log.info("init");

    load_all_from_config(this.scope(), options);

    this.log.info("init complete");
  }

  /**
   * add - add a method to the service
   *
   * @param  {type} pattern
   * @param  {type} method
   * @return {type}
   */
  add(pattern, method) {
    this.log.info("add " + method_name(method) + " " + pattern_name(pattern));

    //@TODO
    // - validate pattern
    // - check existing pattern
    // - validate method
    //
    this.store.add(pattern, method);

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

    this.log.info("attach " + method_name(middleware) + " " + pattern_name(pattern));

    let scope = this.scope(pattern, SCOPE_CLIENT);
    let fn = middleware(scope);

    // only add middleware that returns a function
    if (typeof fn === "function") {
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
    let requestId = nid(8); // for logging

    this.log.info("exec " + requestId + " " + JSON.stringify(message));

    //reverse pattern match for middleware
    let test = patrun({gex: this.options.gex}).add(message, true);

    //
    let requests = [];

    // partial match middleware
    for (let [pattern, middleware] of this.middleware) {
      if (test.list(pattern).length > 0) {
        requests.push(middleware);
      }
    }

    this.log.silly("exec " + requestId + " matched " + requests.length + " request middlewares");

    //
    let clients = [];

    // partial match client middleware
    for (let [pattern, middleware] of this.clients) {
      if (test.list(pattern).length > 0) {
        clients.push(middleware);
      }
    }

    this.log.silly("exec " + requestId + " matched " + clients.length + " client middlewares");

    //
    let responses = [];

    // apply request middleware
    for (let request of requests) {
      try {
        let response = await request(message);

        if (typeof response === "function") {
          responses.push(response);
        }
      }
      catch (e) {
        this.log.error("exec " + requestId, e);
        throw e; // rethrow error
      }
    }

    this.log.debug("request " + requestId + " " + JSON.stringify(message));
    this.log.silly("request " + requestId + " has " + responses.length + " response middlewares");

    // default
    let result = null;
    let i = 1;

    for (let request of clients) {
      try {
        let response = await request(message);

        if (typeof response === "function") {
          result = await response(result) || null;

          if (result !== null) {
            this.log.silly("response was returned by client middleware " + i);
            break; // first result is used
          }
        }

        i++;
      }
      catch (e) {
        this.log.error("request " + requestId, e);
        throw e; // rethrow error
      }
    }

    this.log.debug("response " + requestId + " " + JSON.stringify(result));

    // apply response middleware before returning
    if (result) {
      for (let response of responses) {
        try {
          await response(result);
        }
        catch (e) {
          this.log.error("response " + requestId, e);
          throw e; // rethrow error
        }
      }
    }

    this.log.info("result " + requestId + " " + JSON.stringify(result));

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
    if (!middleware) {
      middleware = pattern;
      pattern = {};
    }

    this.log.info("expose " + method_name(middleware) + " " + pattern_name(pattern));

    let scope = this.scope(pattern, SCOPE_SERVER);

    middleware(scope);

    return this;
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
    this.log.info("remove " + pattern_name(pattern));

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
      pattern: pattern, // the pattern this scope is tied to
      log: this.log // easier access to logging functions
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
      // server middleware limited scope and scopified exec method
    case SCOPE_SERVER:
      _.assign(scope, _.pick(api, ["add", "attach", "find", "has", "list", "remove", "use"]), {
        exec: (...args) => scopify(this.exec, scope, args)
      });
      break;
    case SCOPE_CLIENT:
    case SCOPE_MIDDLEWARE:
        // middleware gets limited scope
      _.assign(scope, _.pick(api, ["add", "find", "has", "list", "remove"]), {
          // middleware exec function is not scopified to prevent recursion
        exec: async (m) => {
            // exec cannot be called with a subset of the scopes pattern
          let test = patrun({gex: this.options.gex}).add(m, true);

          if (test.list(pattern).length > 0) {
            this.log.warn("executing superset of scope in middleware is not allowed, use __dangerouslyExec instead.", {
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

    this.log.info("use " + method_name(middleware) + " " + pattern_name(pattern));

    let scope = this.scope(pattern, SCOPE_MIDDLEWARE);
    let fn = middleware(scope);

    // only add middleware that returns a request function
    if (typeof fn === "function") {
      this.middleware.push([pattern, fn]);
    }

    return this;
  }
}

// export factory
export default function(options) {
  return new Patmos(options);
}
