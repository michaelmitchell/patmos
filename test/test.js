/*import { install } from 'source-map-support';

install();

import patmos from './index';
import fs from 'fs';
import yaml from 'js-yaml';

// load default config
const config = yaml.safeLoad(fs.readFileSync('./config/default.yaml'));
const service = patmos(config);

service.use((s) => {
  return async (req) => {
    return async (res) => {
    }
  }
})

// add methods to the patmos store
service.scope({resource: 'users'})
  .add({method: 'DEL'}, async () => ({msg: 'DEL users'}))
  .add({method: 'GET'}, async () => ({msg: 'GET users'}))
  .add({method: 'PUT'}, async () => ({msg: 'PUT users'}))
  .add({method: 'POST'}, async () => ({msg: 'POST users'}));

// entry point
let main = async () => {
  service.log.info('main');

  let result = await service.exec({resource: 'users', method: 'GET', item: 123});

  service.log.info('result', result);

  let scope = service.scope({resource: 'users'});

  let r1 = await scope.exec({method: 'DEL', item: 123});

  service.log.info('result', r1);

  let r2 = await scope.exec({method: 'PUT', item: 123});

  service.log.info('result', r2);
};

main();*/
