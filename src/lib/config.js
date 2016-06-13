import path from 'path';

export function load_all_from_config(scope, config) {
  // attach clients from config
  if (config.clients) {
    for (let client of config.clients) {
      if (typeof client === 'object') {
        let params = load_from_config(client);

        if (params && params.length > 0) {
          scope.attach.apply(scope, params);
        }
      }
      else if (typeof client === 'function') {
        scope.attach.apply(scope, [client]);
      }
    }
  }

  // add methods from config
  if (config.methods) {
    for (let method of config.methods) {
      if (typeof method === 'object') {
        let params = load_from_config(method);

        if (params && params.length > 0) {
          scope.add.apply(scope, params);
        }
      }
    }
  }

  // attach middleware from config
  if (config.middleware) {
    for (let middleware of config.middleware) {
      if (typeof middleware === 'object') {
        let params = load_from_config(middleware);

        if (params && params.length > 0) {
          scope.use.apply(scope, params);
        }
      }
      else if (typeof middleware === 'function') {
        scope.use.apply(scope, [middleware]);
      }
    }
  }

  // attach servers from config
  if (config.servers) {
    for (let server of config.servers) {
      if (typeof server === 'object') {
        let params = load_from_config(server);

        if (params && params.length > 0) {
          scope.expose.apply(scope, params);
        }
      }
      else if (typeof server === 'function') {
        scope.expose.apply(scope, [server]);
      }
    }
  }

  // parse scoped configs
  if (config.scopes) {
    for (let scopeConfig of config.scopes) {
      let pattern = scopeConfig.pattern || {};
      let newScope = scope.scope(pattern);

      delete scopeConfig.pattern;

      load_all_from_config(newScope, scopeConfig)
    }
  }
}

//
export function load_from_config(config) {
  let pattern = config.pattern || {};
  let module = config.module;

  // load node modul if defined
  if (typeof module === 'string') {
    // include config modules relative to the main module
    if (module.substr(0, 1) === '.') {
      let root = path.dirname(require.main.filename);
      module = require(root + '/' + module);
    }
    else {
      module = require(module);
    }

    if (!module) {
      throw 'module not found';
    }
  }

  //
  let method = config.method;

  if (module && typeof method === 'string') {
    method = module[method || 'default'];
  }
  else if (module && typeof method === 'object') {
    method = module[method.name || 'default'].apply({}, method.args || []);
  }
  else if (module) {
    method = module.default;
  }

  return [pattern, method];
}
