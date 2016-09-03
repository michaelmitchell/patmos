import { expect } from 'chai';

describe('patmos', () => {
  //
  describe('defaults', () => {
    it('has gex set to true');
    it('has log level "info"');
    it('should have the default patmos client');
  });

  describe('consts', () => {
    it('SCOPE_CLIENT should be "client"');

    it('SCOPE_DEFAULT should be "default"');
    it('SCOPE_MIDDLEWARE should be "middleware"');
    it('SCOPE_MIDDLEWARE should be "server"');
  });

  describe('factory', () => {
    it('should return an instance of patmos');
  });

  describe('instance', () => {
    describe('constructor', () => {
      it('should have merged options');
      it('should have the same log level as the options');
      it('should have a patrun store');
      it('should have clients that match the options');
      it('should have methods that match the options');
      it('should have middleware that match the options');
    });

    describe('add', () => {
      it('should add a method to the store');
      it('it should return a chainable instance');
    });

    describe('attach', () => {
      it('have a default pattern if only a middleware is supplied');
      it('should init a middleware constructor with a client scope');
      it('should add a client middleware if one is returned by the constructor');
      it('should not add a client middleware if none is returned by the constructor');
      it('it should return a chainable instance');
    });

    describe('exec', () => {
      it('should have tests');
    });

    describe('expose', () => {
      it('have a default pattern if only a middleware is supplied');
      it('should init a middleware constructor with a server scope');
      it('should not add a middleware');
      it('it should return a chainable instance');
    });

    describe('find', () => {
      it('should find a method by a specified pattern');
      it('should not find a method if the pattern does not exist');
    });

    describe('has', () => {
      it('should return true if a method exists by a specified pattern');
      it('should return false if a method does not exists by a specified pattern');
    });

    describe('list', () => {
      it('it should list all methods matched');
      it('it not list anything if no methods are matched');
    });

    describe('remove', () => {
      it('it should remove a method by a specified pattern');
      it('it should not remove a method if the pattern does not exist');
    });

    describe('scope', () => {
      it('should have tests');
    });

    describe('use', () => {
      it('have a default pattern if only a middleware is supplied');
      it('should init a middleware constructor with a middleware scope');
      it('should add a middleware if one is returned by the constructor');
      it('should not add a middleware if none is returned by the constructor');
      it('it should return a chainable instance');
    });
  });
});
