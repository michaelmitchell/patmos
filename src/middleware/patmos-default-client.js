/**
 * patpos-default-client
 *
 * @param  {type} msg description
 * @return {type}     description
 */

export default function default_client(scope) {
  return async (req) => async (res) => {
    let method = scope.find(req);

    if (typeof method === 'function') {
      return await method(req);
    }
  }
}
