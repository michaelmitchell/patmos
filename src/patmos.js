import _ from 'lodash';
import patrun from 'patrun';
import winston from 'winston';
import defaultClient from './middleware/patmos-default-client';

//
export const defaults = {
  // Glob matching using gex.
  gex: true,
  log: {
    level: 'warn'
  }
};

//
export let log = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: () => new Date().toISOString(),
      formatter: (options) => {
        let level = options.level.toUpperCase();
        let message = (undefined !== options.message ? options.message : '')
        let metadata = (options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : '');

        return '[' + options.timestamp() +'] ' + level + ': ' + message + ' ' + metadata;
      }
    })
  ]
});

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

    // change logging level
    log.level = options.log.level;

    //
    this.logger = log;
    this.store = patrun({gex: this.options.gex});

    // middlewares
    this.clients = [];
    this.middleware = [];

    this.attach(defaultClient);
  }

  /**
   * add - add a method to the service
   *
   * @param  {type} pattern
   * @param  {type} method
   * @return {type}
   */
  add(pattern, method) {
    log.debug('add()', pattern);

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

    log.debug('attach()', pattern, middleware ? middleware.name : 'unknown');

    //TODO
    // - validate middleware creator
    // - validate returned middleware
    let fn = middleware(this.scope(pattern)); //init middleware

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
    log.debug('exec()', message);

    //@TODO
    // - validate message
    // - validate client
    // - validate results
    // - replace middleware with pattern matching library with "findAll"

    //reverse pattern match
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
        log.error('exec() request middleware error', e.message);
      }
    }

    // result from client middleware
    let result = null;

    for (let request of clients) {
      try {
        let response = await request(message);

        if (typeof response === 'function') {
          result = await response(result) || null;

          if (result !== null) {
            break;
          }
        }
      }
      catch (e) {
        log.error('exec() client middleware error', e.message);
      }
    }

    // apply response middleware
    if (result) {
      for (let response of responses) {
        try {
          await response(result);
        }
        catch (e) {
          log.error('exec() response middleware error', e.message);
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
    log.debug('find()', pattern);

    return this.store.find(pattern);
  }

  /**
   * has - check if a local method exists
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  has(pattern) {
    log.debug('has()', pattern);

    return !!this.store.find(pattern);
  }

  /**
   * list
   *
   * @param  {type} pattern
   * @return {type}
   */
  list(pattern) {
    log.debug('list()', pattern);

    return this.store.list(pattern);
  }

  /**
   * remove - remove a method from the service
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  remove(pattern) {
    log.debug('remove()', pattern);

    this.store.remove(pattern);

    return this;
  }

  /**
   * store - create pattern scoped functions
   *
   * @param  {type} pattern description
   * @return {type}         description
   */
  scope(pattern = {}) {
    log.debug('scope()', pattern);

    // create
    let fn = (fn, args, chain = false) => {
      let [x, ...y] = args;
      let result = fn.call(this, {...x, ...pattern}, ...y);
      return chain ? scope : result;
    };

    //
    let scope = {
      pattern: pattern, // the pattern this scope is tied to
      add: (...args) => fn(this.add, args, true),
      attach: (p, m) => fn(this.use, m ? [p, m] : [{}, p], true),
      exec: async (m) => await this.exec({...m, ...pattern}),
      expose: (p, m) => fn(this.expose, m ? [p, m] : [{}, p], true),
      find: (...args) => fn(this.find, args),
      has: (...args) => fn(this.has, args),
      list: (...args) => fn(this.list, args),
      remove: (...args) => fn(this.remove, args, true),
      use: (p, m) => fn(this.use, m ? [p, m] : [{}, p], true),
    };
    
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

    log.debug('use()', pattern, middleware ? middleware.name : 'unknown');

    //TODO
    // - validate middleware creator
    // - validate returned middleware
    let fn = middleware(this.scope(pattern)); //init middleware

    // only add middleware that returns a function
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
