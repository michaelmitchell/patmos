'use strict';

var _babelPolyfill = require('babel-polyfill');

var _babelPolyfill2 = _interopRequireDefault(_babelPolyfill);

var _sourceMapSupport = require('source-map-support');

var _patmos = require('./patmos');

var _patmos2 = _interopRequireDefault(_patmos);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

(0, _sourceMapSupport.install)();

// load default config
var config = _jsYaml2.default.safeLoad(_fs2.default.readFileSync('./config/example.yaml'));
var service = (0, _patmos2.default)(config);

// entry point
var main = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            console.log('very appy');

          case 1:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function main() {
    return ref.apply(this, arguments);
  };
}();

main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7QUFDQTs7QUFJQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBSkE7OztBQU9BLElBQU0sU0FBUyxpQkFBSyxRQUFMLENBQWMsYUFBRyxZQUFILENBQWdCLHVCQUFoQixDQUFkLENBQWY7QUFDQSxJQUFNLFVBQVUsc0JBQU8sTUFBUCxDQUFoQjs7O0FBR0EsSUFBSTtBQUFBLHNEQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFDVCxvQkFBUSxHQUFSLENBQVksV0FBWjs7QUFEUztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxHQUFQOztBQUFBO0FBQUE7QUFBQTtBQUFBLEdBQUo7O0FBSUEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwb2x5ZmlsbCBmcm9tICdiYWJlbC1wb2x5ZmlsbCc7XG5pbXBvcnQgeyBpbnN0YWxsIH0gZnJvbSAnc291cmNlLW1hcC1zdXBwb3J0JztcblxuaW5zdGFsbCgpO1xuXG5pbXBvcnQgcGF0bW9zIGZyb20gJy4vcGF0bW9zJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeWFtbCBmcm9tICdqcy15YW1sJztcblxuLy8gbG9hZCBkZWZhdWx0IGNvbmZpZ1xuY29uc3QgY29uZmlnID0geWFtbC5zYWZlTG9hZChmcy5yZWFkRmlsZVN5bmMoJy4vY29uZmlnL2V4YW1wbGUueWFtbCcpKTtcbmNvbnN0IHNlcnZpY2UgPSBwYXRtb3MoY29uZmlnKTtcblxuLy8gZW50cnkgcG9pbnRcbmxldCBtYWluID0gYXN5bmMgKCkgPT4ge1xuICBjb25zb2xlLmxvZygndmVyeSBhcHB5Jyk7XG59O1xuXG5tYWluKCk7XG4iXX0=