//
export function method_name(method) {
  return (method.name ? method.name : "unknown");
}

//
export function pattern_name(pattern) {
  if (Object.keys(pattern).length > 0) {
    return "{" + Object.keys(pattern).map(function(k) {
      return k + "=" + pattern[k];
    }).join(",") + "}";
  }

  return "{default}";
}
