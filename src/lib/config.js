import path from "path";

//
export function apply_middlewares(fn, scope) {
  return (middlewares) => {
    for (let middleware of middlewares) {
      if (typeof middleware === "object") {
        let params = load_from_config(middleware);

        if (params && params.length > 0) {
          fn.apply(scope, params);
        }
      }
      else if (typeof middleware === "function") {
        fn.apply(scope, [middleware]);
      }
    }
  };
}

//
export function load_all_from_config(scope, config) {
  // attach clients from config
  if (config.clients) {
    apply_middlewares(scope.attach, scope)(config.clients);
  }

  // add methods from config
  if (config.methods) {
    apply_middlewares(scope.add, scope)(config.methods);
  }

  // attach middleware from config
  if (config.middleware) {
    apply_middlewares(scope.use, scope)(config.middleware);
  }

  // attach servers from config
  if (config.servers) {
    apply_middlewares(scope.expose, scope)(config.servers);
  }

  // load scopes config recursive
  if (config.scopes) {
    for (let scopeConfig of config.scopes) {
      let pattern = scopeConfig.pattern || {};
      let newScope = scope.scope(pattern);

      delete scopeConfig.pattern;

      load_all_from_config(newScope, scopeConfig);
    }
  }
}

//
export function load_from_config(config) {
  let pattern = config.pattern || {};
  let module = config.module;

  // load node modul if defined
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
