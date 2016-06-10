/**
 * patmos-rest-client - create a rest client for patmos
 *
 * @param  {type} options description
 * @return {type}         description
 */
export default function(options) {
  // configure rest client based on options
  //
  return function rest_client(scope) {
    // attach any global listeners and actions
    //
    return async (req) => async (res) => {
      return {hello: 'world', rest: true};
    }
  }
}
