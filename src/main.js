import patmos from './patmos';
import timestmap from './middleware/patmos-timestamp';
import restClient from './middleware/patmos-rest-client';
import restServer from './middleware/patmos-rest-server';

//
const service = patmos({
  log: {
    level: 'debug'
  }
});

// middleware, order matters
service.use(timestmap);
service.attach({resource: 'users'}, restClient());

// add timestamp function for timestamp middleware
service.add({role: 'middleware', cmd: 'timestamp'}, async() => ({result: 'hello'}));

// add methods to the patmos store
service.scope({resource: 'users'})
  .add({method: 'DEL'}, async () => ({msg: 'DEL users'}))
  .add({method: 'GET'}, async () => ({msg: 'GET users'}))
  .add({method: 'PUT'}, async () => ({msg: 'PUT users'}))
  .add({method: 'POST'}, async () => ({msg: 'POST users'}));

service.expose({resource: 'users'}, restServer());

// main function
async function main() {
  let result = await service.exec({resource: 'users', method: 'GET', item: 123});

  console.log('result', result);
}

main();
