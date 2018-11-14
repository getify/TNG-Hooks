# TNG-Hooks

[![Build Status](https://travis-ci.org/getify/tng-hooks.svg?branch=master)](https://travis-ci.org/getify/tng-hooks)
[![npm Module](https://badge.fury.io/js/tng-hooks.svg)](https://www.npmjs.org/package/tng-hooks)
[![Dependencies](https://david-dm.org/getify/tng-hooks.svg)](https://david-dm.org/getify/tng-hooks)
[![devDependencies](https://david-dm.org/getify/tng-hooks/dev-status.svg)](https://david-dm.org/getify/tng-hooks?type=dev)
[![Coverage Status](https://coveralls.io/repos/github/getify/tng-hooks/badge.svg?branch=master)](https://coveralls.io/github/getify/tng-hooks?branch=master)

**TNG-Hooks** (/ˈting ho͝oks/) is inspired by [React Hooks](..). It's a simple implementation of `useState(..)` that works for non-React standalone functions. It even supports [React's "Custom Hooks"](https://reactjs.org/docs/hooks-custom.html) pattern.

## Environment Support

This utility uses ES6 (aka ES2015) features. If you need to support environments prior to ES6, transpile it first (with Babel, etc).

## At A Glance

**TNG-Hooks** provides a `TNG(..)` utility that wraps regular, stand-alone (non-React) functions, providing them the ability to call `useState(..)` inside them to store persistent (across invocations) state for each function -- essentially the same as [React's `useState(..)` hook](https://reactjs.org/docs/hooks-state.html) for function components.

```js
[renderUsername,onClickUsername] = TNG(renderUsername,onClickUsername);

function renderUsername(username) {
    var [activated,setActivated] = useState(false);

    usernameElem.innerHTML = username;

    if (!activated) {
        setActivated(true);
        let expanded = false;
        usernameElem.addEventListener("click",onClickUsername,false);
    }
}

function onClickUsername() {
    var [expanded,setExpanded] = useState(false);

    if (!expanded) {
        setExpanded(true);
        renderUsername(user.longName)
    }
    else {
        setExpanded(false);
        renderUsername(user.shortName);
    }
}

// ...

var user = { shortName: "KS", longName: "Kyle Simpson", };
renderUsername(user.shortName);
```

[Demo](https://codepen.io/getify/pen/dQvEGW?editors=1010)

In the above snippet, `activated` is persistent (across invocations) state for the `renderUsername(..)` function, and `expanded` is separate persistent state for the `onClickUsername(..)` function.

**Note:** Since TNG does not currently implement [React's `useEffect(..)` hook](https://reactjs.org/docs/hooks-effect.html), this example is emulating the one-time click handler attachment via a persistent `activated` state.

If `useState(..)` is used inside a non-TNG-wrapped function, it's emulating a [React "Custom Hook"](https://reactjs.org/docs/hooks-custom.html), and so that function must be called from another TNG-wrapped function; otherwise, an error will be thrown. See [custom hooks](#tng-custom-hooks) below for more information.

## Overview

**TNG-Hooks** is inspired by [React's Hooks](https://reactjs.org/docs/hooks-overview.html) mechanism. It implements similar capabilities but for stand-alone (non-React) functions.

`TNG(..)` is a utility to wrap one or more functions so they are able to maintain a persistent hook context across multiple invocations.

For example:

```js
// wrap one function at a time
foo = TNG(foo);

// wrap multiple functions
[bar,baz] = TNG(bar,baz);

function foo(..) { .. }
function bar(..) { .. }
function baz(..) { .. }
```

The same function can be TNG wrapped multiple times, with each one getting its own hook context:

```js
function foo(..) { .. }

var [A,B] = TNG(foo,foo);
var C = TNG(foo);

// later:
A();
B();
C();
```

### TNG `useState(..)` Hook

The `useState(..)` hook utility allows a function to persist some state across multiple invocations, without relying on global variables or having to manually create a closure to store that state. This only works for functions that have been adapted via the `TNG(..)` wrapper utility to have a hooks context.

For example:

```js
hit = TNG(hit);

function hit() {
    var [count,updateCount] = useState(0);

    updateCount(++count);

    console.log(`Hit count: ${count}`);
}

hit();       // Hit count: 1
hit();       // Hit count: 2
hit();       // Hit count: 3
```

The `useState(..)` function takes a single value (or a function which returns a value). This value is used only the first time, as the initial value for that unit of state.

The return value of `useState(..)` is an tuple (2-element array) containing the current value of that unit of state, as well as a function to use to set/update that unit of state. You can name this unit of state whatever is appropriate, and also name the set/update function whatever is appropriate.

In the above snippet, we used array destructuring to set `count` and `updateCount` from the tuple returned from `useState(..)`.

### TNG "Custom Hooks"

If a non-TNG-wrapped function uses `useState(..)`, it behaves like a [React "Custom Hook"](https://reactjs.org/docs/hooks-custom.html). A custom hook must be called from a TNG-wrapped function so it has a hook context.

For example:

```js
// a "custom hook", so ***not*** a TNG-wrapped function
function useHitCounter() {
    var [count,updateCount] = useState(0);

    updateCount(++count);

    return count;
}

// will be TNG-wrapped, one handler for each button
function onClick(evt) {
    var hitCount = useHitCounter();  // using a "custom hook"

    console.log(`Button #${evt.target.id}: ${hitCount}`);
}

var fooBtn = document.getElementById("foo-btn");
var barBtn = document.getElementById("bar-btn");

fooBtn.addEventListener("click",TNG(onClick),false);
barBtn.addEventListener("click",TNG(onClick),false);
```

[Demo](https://codepen.io/getify/pen/VVbZOd?editors=1010)

**Note:** Unlike React, TNG does not ***require or even ask you to*** name your "custom hooks" in the format `useWHATEVER(..)` with a `use` prefix. You *can do so* if you prefer.

The `useHitCounter(..)` custom hook -- which again is just a normal non-wrapped function that happens to use `useState(..)`! -- adopts the hook context of the TNG-wrapped function which invoked it. In this example, the source TNG-wrapped function is either one of the two click handlers (produced via the two `TNG(..)` calls) that were bound, respectively, to each button.

In other words, the line `var [count,updateCount] = useState(0);` acts as if it had been called inside of one of the click handlers, even though it's actually in a separate function. That makes `useHitCounter(..)` a custom hook, that can be called from any number of TNG-wrapped functions.

## npm Package

```
npm install tng-hooks
```

And to require it in a node script:

```js
var { TNG, useState, } = require("tng-hooks");
```

## Builds

[![Build Status](https://travis-ci.org/getify/tng-hooks.svg?branch=master)](https://travis-ci.org/getify/tng-hooks)
[![npm Module](https://badge.fury.io/js/tng-hooks.svg)](https://www.npmjs.org/package/tng-hooks)

The distribution library file (`dist/tng-hooks.js`) comes pre-built with the npm package distribution, so you shouldn't need to rebuild it under normal circumstances.

However, if you download this repository via Git:

1. The included build utility (`scripts/build-core.js`) builds (and ~~minifies~~) `dist/tng-hooks.js` from source. **Note:** Minification is currently disabled. **The build utility expects Node.js version 6+.**

2. To install the build and test dependencies, run `npm install` from the project root directory.

    - **Note:** This `npm install` has the effect of running the build for you, so no further action should be needed on your part.

4. To manually run the build utility with npm:

    ```
    npm run build
    ```

5. To run the build utility directly without npm:

    ```
    node scripts/build-core.js
    ```

## Tests

A comprehensive test suite is included in this repository, as well as the npm package distribution. The default test behavior runs the test suite using `src/tng-hooks.src.js`.

1. You can run the tests in a browser by opening up `tests/index.html` (**requires ES6+ browser environment**).

2. The included Node.js test utility (`scripts/node-tests.js`) runs the test suite. **This test utility expects Node.js version 6+.**

3. Ensure the test dependencies are installed by running `npm install` from the project root directory.

    - **Note:** Starting with npm v5, the test utility is **not** run automatically during this `npm install`. With npm v4, the test utility automatically runs at this point.

4. To run the test utility with npm:

    ```
    npm test
    ```

    Other npm test scripts:

    * `npm run test:dist` will run the test suite against `dist/tng-hooks.js` instead of the default of `src/tng-hooks.src.js`.

    * `npm run test:package` will run the test suite as if the package had just been installed via npm. This ensures `package.json`:`main` properly references `dist/tng-hooks.js` for inclusion.

    * `npm run test:all` will run all three modes of the test suite.

5. To run the test utility directly without npm:

    ```
    node scripts/node-tests.js
    ```

### Test Coverage

[![Coverage Status](https://coveralls.io/repos/github/getify/tng-hooks/badge.svg?branch=master)](https://coveralls.io/github/getify/tng-hooks?branch=master)

If you have [Istanbul](https://github.com/gotwarlost/istanbul) already installed on your system (requires v1.0+), you can use it to check the test coverage:

```
npm run coverage
```

Then open up `coverage/lcov-report/index.html` in a browser to view the report.

To run Istanbul directly without npm:

```
istanbul cover scripts/node-tests.js
```

**Note:** The npm script `coverage:report` is only intended for use by project maintainers. It sends coverage reports to [Coveralls](https://coveralls.io/).

## License

All code and documentation are (c) 2018 Kyle Simpson and released under the [MIT License](http://getify.mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
