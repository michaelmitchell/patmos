//
import R, {__, chain, compose, map, pipe, tap} from 'ramda';
import {Maybe, Either} from 'ramda-fantasy';

//
const {Just, Nothing, isJust} = Maybe;
const {Left: Failure, Right: Success, isRight: isSuccess} = Either;
const isSomething = R.either(isJust, isSuccess);

//
const isString = R.is(String);
const isObject = R.is(Object);
const isFunction = R.is(Function);
const isFunctor = R.both(isObject, R.hasIn('map'));

// errors
const A_NOT_ALLOWED = 'A_NOT_ALLOWED';
const B_NOT_ALLOWED = 'B_NOT_ALLOWED';

// logging functions
const logAfter = R.curry((fn, x) => compose(tap(fn), x));
const logBefore = R.curry((fn, x) => compose(x, tap(fn)));

//
const loggable = compose(
  logAfter(x => console.log('[DEBUG] [::before] ' + x)),
  logAfter(x => console.log('[DEBUG] [::after] ' + x))
);

const loggableN = (n) => compose(
  logBefore(x => console.log('[DEBUG] [' + n + '::before] ' + x)),
  logAfter(x => console.log('[DEBUG] [' + n + '::after] ' + x)),
);

//
const maybeOf = (x) => isFunctor(x) ? x : Maybe.of(x);

//
const maybeText  = (x) => isString(x) ? Just(x) : Nothing();

// validate with Either monad
const validate = R.cond([
  [R.equals('a'), x => Failure(A_NOT_ALLOWED)],
  [R.equals('b'), x => Failure(B_NOT_ALLOWED)],
  [true, x => Success(x)]
]);

// format
const format = (x) => R.toUpper(x);

// handle monads
const handle = R.prop('value');

// composed method to handle a request
const handleRequest = pipe(
  compose(loggableN('maybeOf'))
    (maybeOf),
  compose(loggableN('maybeText'), chain)
    (maybeText),
  compose(loggableN('validate'), chain)
    (validate),
  compose(loggableN('format'), map)
    (format),
  compose(loggable)
    (handle)
);

let res = handleRequest('b');

console.log('res', res);
