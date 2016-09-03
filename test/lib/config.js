import { expect } from 'chai';

//
import * as common from '../../src/lib/config';

//
describe('lib', () => {
  describe('common', () => {
    //
    describe('apply_middlewares', () => {
      it('return a function');
      it('it load middleware from config or function for supplied config');
    });

    //
    describe('load_all_from_config', () => {
      it('should add all supplied clients');
      it('should add all supplied methods');
      it('should add all supplied middleware');
      it('should add all supplied servers');
      it('should add recursively configure from scope config');
    });

    //
    describe('load_from_config', () => {
      it('should have a default pattern if none is supplied');
      it('can use a module supplied directly');
      it('can load a module relative to the main module');
      it('can load an npm module');
      it('throws an error if a module was supplied by not found');
      it('can find a method by string');
      it('can apply arguments to a method');
      it('can use the default export of a module');
      it('must return a pattern and method');
    });
  });
});
