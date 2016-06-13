import polyfill from 'babel-polyfill';
import { install } from 'source-map-support';

install();

import patmos from './patmos';
import fs from 'fs';
import yaml from 'js-yaml';

// load default config
const config = yaml.safeLoad(fs.readFileSync('./config/example.yaml'));
const service = patmos(config);

// entry point
let main = async () => {
  console.log('very appy');
};

main();
