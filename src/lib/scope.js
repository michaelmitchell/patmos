//
export function scopify(fn, scope, args) {
  let [x, ...y] = args;

  return fn.call(scope.parent, {...x, ...scope.pattern}, ...y);
}

//
export function scopify_chainable(fn, scope, args) {
  scopify(fn, scope, args);

  return scope;
}
