/**
 * patmos-rest-server - create a rest server transport for patmos
 *
 * @param  {type} options description
 * @return {type}         description
 */
export default function(options) {
  // configure server server based on options

  return function rest_server(scope) {
    let listen = async () => {
      let req = {method: 'GET'};

      console.log('exec rest-client', req);

      let result = await scope.exec(req);

      console.log('rest-client result', result);
    }

    setInterval(listen, 2000); // listen for incomming requests

    // return middleware
    return async (req) => {
      // req modifier
      return async (res) => {
        // res modifier
      }
    }
  }
}
