/**
 * patmos-timestamp
 *
 * middleware example that adds a timestamp to all messages via an existing store
 * method for Date.now()
 *
 * @param {type} store instance of the patrun microservice store
 * @return {type} description
 */
export default function timestamp(scope) {
  return async (req) => {
    // prevent recursion
    if (req.role === 'middleware' && cmd === 'timestamp') {
      return;
    }

    let {result} = await scope.exec({role: 'middleware', cmd: 'timestamp'});
    let sentAt = result;

    if (!sentAt) {
      sentAt = Date.now();
    }

    // modified the message
    Object.assign(req, {sentAt});

    return async (res) => {
      let {result} = await scope.exec({role: 'middleware', cmd: 'timestamp'});
      let recievedAt = result;

      if (!recievedAt) {
        recievedAt = Date.now();
      }

      Object.assign(res, {sentAt, recievedAt});
    }
  }
}
