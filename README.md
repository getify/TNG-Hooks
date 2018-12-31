# TNG-Hooks

[![Build Status](https://travis-ci.org/getify/tng-hooks.svg?branch=master)](https://travis-ci.org/getify/tng-hooks)
[![npm Module](https://badge.fury.io/js/tng-hooks.svg)](https://www.npmjs.org/package/tng-hooks)
[![Dependencies](https://david-dm.org/getify/tng-hooks.svg)](https://david-dm.org/getify/tng-hooks)
[![devDependencies](https://david-dm.org/getify/tng-hooks/dev-status.svg)](https://david-dm.org/getify/tng-hooks?type=dev)
[![Coverage Status](https://coveralls.io/repos/github/getify/tng-hooks/badge.svg?branch=master)](https://coveralls.io/github/getify/tng-hooks?branch=master)

**TNG-Hooks** (/ˈting ho͝oks/) is inspired by [React Hooks](..). It's a simple implementation of hooks (i.e., `useState(..)`, `useReducer(..)`, `useEffect(..)`) that works for non-React standalone functions. It even supports the [Custom Hooks](#custom-hooks) pattern from [React's "Custom Hooks"](https://reactjs.org/docs/hooks-custom.html).

## Environment Support

This utility uses ES6 (aka ES2015) features. If you need to support environments prior to ES6, transpile it first (with Babel, etc).

## Quick Overview

**TNG-Hooks** provides the `TNG(..)` utility to generate **Articulated Functions**, which are just regular, standalone (e.g., non-React) functions wrapped with a TNG hooks-context -- so you can use TNG hooks inside them.

One of the most common TNG hooks is the [`useState(..)` hook](#usestate-hook), which stores persistent (across invocations) state for an Articulated Function, essentially the same as [React's `useState(..)` hook](https://reactjs.org/docs/hooks-state.html) does for a function component.

For example:

```js
// generating Articulated Functions (aka, wrapping with TNG hooks-context)
[renderUsername,onClickUsername] = TNG(renderUsername,onClickUsername);

function renderUsername(username) {
    // using the `useState(..)` hook
    var [activated,setActivated] = useState(false);

    usernameElem.innerHTML = username;

    // only run this code the first time
    if (!activated) {
        setActivated(true);
        usernameElem.addEventListener("click",onClickUsername,false);
    }
}

function onClickUsername() {
    // using the `useState(..)` hook
    var [expanded,setExpanded] = useState(false);

    // toggles based on `expanded` state
    if (!expanded) {
        setExpanded(true);
        renderUsername(user.longName);
    }
    else {
        setExpanded(false);
        renderUsername(user.shortName);
    }
}

// ...

var usernameElem = document.getElementById("username");
var user = { shortName: "KS", longName: "Kyle Simpson", };
renderUsername(user.shortName);
```

**[Run Demo](https://codepen.io/getify/pen/dQvEGW?editors=1010)**

In the above snippet, `activated` is persistent (across invocations) state for the `renderUsername(..)` Articulated Function, and `expanded` is separate persistent state for the `onClickUsername(..)` Articulated Function.

`activated` in the above snippet demonstrates how to perform an action just once, such as attaching a click handler to a DOM element. That works, but it's not ideal.

A much cleaner approach for handling side-effects conditionally is with the [`useEffect(..)` hook](#useEffect-hook), which is inspired by [React's `useEffect(..)` hook](https://reactjs.org/docs/hooks-effect.html).

For example:

```js
function renderUsername(username) {
    var [usernameElem,setElem] = useState(null);

    // using the `useEffect(..)` hook
    useEffect(function onActivate(){
        usernameElem = document.getElementById("username");
        usernameElem.addEventListener("click",onClickUsername,false);

        setElem(usernameElem);
    },[]);

    // using the `useEffect(..)` hook
    useEffect(function onUpdate(){
        usernameElem.innerHTML = username;
    },[username]);
}

function onClickUsername() {
    var [expanded,setExpanded] = useState(false);

    if (!expanded) {
        setExpanded(true);
        renderUsername(user.longName);
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

**[Run Demo](https://codepen.io/getify/pen/VqMzGK?editors=1010)**

In this snippet, the first `useEffect( .. , [] )` passes an empty array (`[]`) for its list of conditional state guards, which means that effect will only ever run the first time. The second `useEffect( .., [username] )` passes `[username]` for its list of conditional state guards, which ensures that its effect will only run if the `username` value is different from the previous applied invocation of that effect.

TNG hooks can also be used in a non-Articulated Function, which implies it will be treated essentially like a [React "Custom Hook"](https://reactjs.org/docs/hooks-custom.html); to have a TNG hooks-context available, the non-Articulated Custom Hook Function ***must be called*** from an Articulated Function, or an error will be thrown.

For example:

```js
// Custom Hook (adopt the TNG hooks-context from `showNav()`)
function useName(defaultName) {
    var [name,setName] = useState(defaultName);
    // ..
}

// Articulated Function
function showNav() {
    useName("user");
    // ..
}

showNav = TNG(showNav);
showNav();
```

See [TNG Custom Hooks](#custom-hooks) below for more information.

There are also some ***[IMPORTANT RULES](#hook-call-rules)*** to keep in mind with using TNG hooks in your Articulated Functions and Custom Hooks.

## API

**TNG-Hooks** is inspired by the conventions and capabilities of [React's Hooks](https://reactjs.org/docs/hooks-overview.html). As such, much of TNG resembles React Hooks.

**Note:** Despite the semblance, **TNG-Hooks** is a separate project with its own motivations and specific behaviors. Where it makes sense, we'll stay similar to React Hooks, but there will be deviations where those make sense.

### `TNG(..)`

`TNG(..)` wraps one or more functions, giving each a unique, persistent TNG hooks-context across its invocations, respectively. These wrapped functions are herein referred to as **Articulated Functions**.

For example:

```js
// wrap one function at a time
foo = TNG(foo);

// or, wrap multiple functions at once
[bar,baz] = TNG(bar,baz);

function foo(..) { .. }
function bar(..) { .. }
function baz(..) { .. }
```

The same function can actually be Articulated multiple times, with each one getting its own separate TNG hooks-context:

```js
function foo(..) { .. }

var [A,B] = TNG(foo,foo);
var C = TNG(foo);

// later:
A();        // with its own separate TNG hooks-context
B();        // ditto
C();        // ditto
```

Articulated Functions have the same signature as the functions they wrap, including any arguments, return value, and the ability to be invoked with a `this` context if desired.

They also have a method defined on them called `reset()`. The `reset()` method resets the internal TNG hooks-context of an Articulated Function, including any state slots and effects. Also, if an Articulated Function has any pending [cleanup functions](#effect-cleanups), `reset()` will trigger them.

```js
function hit() {
    var [count,updateCount] = useState(0);

    updateCount(++count);

    console.log(`Hit count: ${count}`);
}

hit = TNG(hit);

hit();       // Hit count: 1
hit();       // Hit count: 2
hit();       // Hit count: 3

hit.reset();

hit();       // Hit count: 1
```

### `useState(..)` Hook

The TNG `useState(..)` hook, like [React's `useState(..)` hook](https://reactjs.org/docs/hooks-state.html), allows an Articulated Function to persist a unit of state across multiple invocations, without relying on global variables or having to manually create a closure to store that state.

For example:

```js
function hit() {
    var [count,updateCount] = useState(0);

    updateCount(++count);

    console.log(`Hit count: ${count}`);
}

hit = TNG(hit);

hit();       // Hit count: 1
hit();       // Hit count: 2
hit();       // Hit count: 3
```

The `useState(..)` hook function takes either a direct value, or a function which returns that value. Whichever way it's provided, this value is used only the first time as the initial value for that unit of state.

The return value of `useState(..)` is a tuple (2-element array) containing the current value of that unit of state, as well as a function to use to set/update that unit of state. You can name this unit of state whatever is appropriate, and also name the set/update function whatever is appropriate.

In the above snippet, we used array destructuring to set `count` and `updateCount` from the tuple returned from `useState(..)`.

The setter/updater (`updateCount(..)` in the above snippet) normally receives a single value. Alternatively, you can pass a function, which will receive the current value of that state unit as its only argument, and which should return the new value for that state unit.

For example:

```js
function hit() {
    var [count,updateCount] = useState(0);

    updateCount(onUpdateCount);

    console.log(`Hit count: ${++count}`);
}

function onUpdateCount(oldCount) {
    return oldCount + 1;
}

hit = TNG(hit);

hit();       // Hit count: 1
hit();       // Hit count: 2
hit();       // Hit count: 3
```

This approach is helpful for determining the new state unit value based on its current value, especially if, as shown above, the setter/updater function is not inside the closure and cannot access the current state unit value directly.

In this particular example, the line `updateCount(onUpdateCount)` could also have been written with the same outcome as:

```js
updateCount( onUpdateCount(count) );
```

The `onUpdateCount(count)` is passed the current `count` value manually, which returns an updated value; that updated value is passed directly to `updateCount(..)` to be set.

### `useReducer(..)` Hook

Like [React's `useReducer(..)` hook](https://reactjs.org/docs/hooks-reference.html#usereducer), the TNG `useReducer(..)` hook is like a special case of [TNG's `useState(..)` hook](#usestate-hook) in that it also provides for persistent state storage across invocations; but it's especially helpful for certain cases when the state updates are more involved.

`useReducer(..)` expects a reducer function and an initial value for its state unit.

For example:

```js
function hit(amount = 1) {
    var [count,incCounter] = useReducer(updateCounter,0);
    incCounter(amount);

    console.log(`Hit count: ${(count += amount)}`);
}

function updateCounter(prevCount,val) {
    return prevCount + val;
}

hit = TNG(hit);

hit();       // Hit count: 1
hit();       // Hit count: 2
hit();       // Hit count: 3
```

Optionally, you can pass a third argument to `useReducer(..)` (argument `5` below), which specifies a value to be used in invoking the reducer immediately on this initial pass:

```js
function hit(amount = 1) {
    var [count,incCounter] = useReducer(updateCounter,0,5);
    incCounter(amount);

    console.log(`Hit count: ${(count += amount)}`);
}

function updateCounter(prevCount,val) {
    return prevCount + val;
}

hit = TNG(hit);

hit();       // Hit count: 6
hit();       // Hit count: 7
hit();       // Hit count: 8
```

The line `useReducer(updateCounter,0,5)` immediately invokes `updateCounter(0,5)`, which returns `5`, and the state unit (named `count` here) is then initially set to *that* value (`5`).

### `useEffect(..)` Hook

Like [React's `useEffect(..)` hook](https://reactjs.org/docs/hooks-effect.html), the TNG `useEffect(..)` hook will conditionally run side-effect code "after" the current Articulated Function completes its invocation.

For example:

```js
function hit() {
    var [count,updateCount] = useState(0);

    updateCount(onUpdateCount);

    useEffect(function logAfter(){
        console.log(`Hit count: ${++count}`);
    });

    console.log("Hit!");
}

function onUpdateCount(oldCount) {
    return oldCount + 1;
}

hit = TNG(hit);

hit();       // Hit!
             // Hit count: 1
hit();       // Hit!
             // Hit count: 2
hit();       // Hit!
             // Hit count: 3
```

Notice in the above snippet that despite the lexical ordering, the `console.log("Hit!")` is actually executed *before* the effect has a chance to run and log its message. That's because an effect, which is generally useful for side-effects, is run *after* the current invocation of the Articulated Function is complete, as if it appeared in a `finally { .. }` clause.

This doesn't mean async (or sync) behavior, only that it's "deferred" until "after" the Articulated Function completes. These relative terms are deliberately being left abstract at present, to allow for future evolution of TNG's functionality.

**CRITICAL NOTE:** DO NOT rely on any observed synchronous/asynchronous behavior of effects, nor any observed ordering between effects. Effects should always be treated as completely independent of each other. In the future, some effects may actually run asynchronously, which would likely affect the ordering between effects.

#### Conditional Effects

A conditional effect is invoked only under certain conditions, which can be quite useful in a variety of scenarios.

The most common scenario is when an effect involves costly DOM operations; for performance reasons, you'd only want those DOM operations to be processed if that part of the DOM actually needed to be updated because some related state values had changed. If the state values haven't changed, a conditional effect prevents the unnecessary DOM operations by skipping the effect.

The `useEffect(..)` utility accepts an optional second parameter, which is a list of values to guard whether the effect should be invoked.

If the guard list is omitted, the effect is always invoked:

```js
function updateCounter(count) {
    useEffect(function onUpdate(){
        // unconditional effect, runs every time
    });
}
```

If the guard list includes any values, the list's current values are compared to the previous guard values provided when the effect was last invoked; a conditional effect is invoked only if a value in the guard list has changed from before, otherwise it's skipped.

As a special case of this conditional guard behavior, passing an empty list (`[]`) *every time* is the most straight-forward way to ensure an effect runs only once, the first time:

```js
function renderButton(label) {
    // only run this effect initially
    useEffect(function onSetup(){
        buttonElem.addEventListener("click",onClick);
    },[]);

    // ..
}
```

The list of values you pass as the conditional guards should be any (and all!) state values that the effect depends on.

For example, if an effect function closes over (uses) two variables, `name` and `age`, then the effect's conditional guard list should include both of them (as `[name,age]`). Thus, the effect will only run if either/both `name` and `age` have changed.

```js
function renderPerson(person) {
    var { name, age } = person;

    useEffect(function onChanged(){
        nameElem.innerText = name;
        ageElem.innerText = age;
    },[name,age]);
}
```

**Note:** While not required, it's a very good idea and best practice to always pass the same guard list to an effect (even though the values can and do change). In other words, avoid dynamically constructing and passing different lists (or not list at all) to the same effect across different invocations of an Articulated Function. This would lead to very confusing behavior and be more susceptible to bugs. Moreover, it would be extremely rare for an effect to depend on different state values between its invocations; try to avoid this if possible by breaking the effect into separate effects.

#### Effect Cleanups

Effects do not receive any arguments, and their return values are generally ignored, with one exception. If an effect returns another function, that function is assumed to be a "cleanup function" for the effect. In other words, each effect can optionally define a cleanup function, which performs any necessary cleanup before the next invocation of that effect.

For example, if an effect assigns a DOM event handler, and the effect may run multiple times, subsequent invocations of the effect would otherwise be duplicating the event handling (which is likely to lead to bugs). To avoid this problem, define a cleanup function for the effect:

```js
function renderButton(label) {
    useEffect(function onSetup(){
        buttonElem.addEventListener("click",onClick);

        return function onCleanup(){
            buttonElem.removeEventListener("click",onClick);
        };
    });

    // ..
}
```

The first time the Articulated Function `renderButton(..)` is run, the `onSetup()` effect will subscribe its event listener. The `onCleanup()` cleanup function returned from the effect will be saved by TNG internally. The next time the `onSetup()` effect is invoked, that cleanup function will first be triggered -- in this example, unsubscribing the event listener and preventing double event subscription.

**Note:** Since effects are not invoked until *after* the Articulated Function is complete, that means the cleanup function saved from the previous invocation of an effect will also not be triggered until *after* the current invocation of the Articulated Function is complete.

Each invocation of an effect triggers its own previous cleanup (if any). But the "final"  invocation of a cleanup -- whenever the Articulated Function (and its effects) won't be invoked anymore -- would obviously not have anything to trigger it. If the cause of this *finality* is the end of the lifetime of the program/browser page, this is likely not a problem.

But if you need to ensure any *final* cleanup(s) are actually triggered, the `reset()` of the Articulated Function will trigger any pending cleanups. Keep in mind that `reset()` also resets the internal TNG hooks-context of the Articulated Function, including all state slots, effects, etc.

For example:

```js
renderButton("Click Me");

// ..

// operation pending, change button to an "undo"
renderButton("Undo...");

// ..

// operation complete, button being disabled/removed
renderButton.reset();
```

### Custom Hooks

If any TNG hooks are used in a non-Articulated Function, it behaves essentially like a [React "Custom Hook"](https://reactjs.org/docs/hooks-custom.html). A TNG Custom Hook ***must be called***, directly or indirectly, from an Articulated Function, so that it has a TNG hooks-context available.

For example:

```js
// a Custom Hook, ***not*** an Articulated Function
function useHitCounter() {
    // inherited TNG hooks-context
    var [count,updateCount] = useState(0);

    updateCount(++count);

    return count;
}

// will be TNG(..) Articulated two times, once as
// each button's click handler
function onClick(evt) {
    // using a Custom Hook
    var hitCount = useHitCounter();

    console.log(`Button #${evt.target.id}: ${hitCount}`);
}

var fooBtn = document.getElementById("foo-btn");
var barBtn = document.getElementById("bar-btn");

fooBtn.addEventListener("click",TNG(onClick),false);
barBtn.addEventListener("click",TNG(onClick),false);
```

**[Run Demo](https://codepen.io/getify/pen/VVbZOd?editors=1010)**

**Note:** Unlike React, TNG does not ***require*** name your Custom Hooks in the format `useWHATEVER(..)` with a `use` prefix. You *can do so* if you prefer, as we did in the above snippet. See the [rules of TNG hooks](#hook-call-rules) below.

The `useHitCounter(..)` Custom Hook -- again, just a normal non-Articulated Function that uses a TNG hook like `useState(..)`! -- inherits the TNG hooks-context of the Articulated Function that invoked it. In this example, the invoking Articulated Function is either one of the two click handlers (produced via the two `TNG(..)` calls) that were bound, respectively, as each button's click handler.

In other words, the line `var [count,updateCount] = useState(0);` acts as if it had actually been called inside of one of the click handlers, even though it's in the separate `useHitCounter(..)` function; that's what makes `useHitCounter(..)` a Custom Hook, meaning it can be called from any Articulated Function.

### Hook Call Rules

Similar to [the rules of React's hooks](https://reactjs.org/docs/hooks-rules.html#only-call-hooks-at-the-top-level), there are some rules/guides that you should keep in mind when using **TNG-Hooks**.

1. It is ***absolutely required*** that TNG hooks always be called in the same order. That is, that you must never have an invocation of an Articulated Function that skips over an earlier hook call and tries to invoke one of the subsequent hook calls. ***THIS WILL BREAK!***

    However, it is still technically possible to have hook calls in conditional situations (or even loops!), as long as you are very careful to never skip calls in an unsafe ordering manner.

    If you have three hook calls (A, B, and C) in a function, these are the valid call ordering scenarios:

    - A, B, C
    - A, B
    - A

    Even though not required, it's a best practice to always call A, B, **and** C; avoid stopping short in the calling order if possible.

    And these are invalid ordering scenarios that ***definitely will break***:

    - B, C
    - A, C
    - B
    - C

2. To avoid tripping on the intricasies of those ordering scenarios, it is ***strongly recommended*** that you only call TNG hooks from the top-level of the function, not inside of any loops or conditionals.

    This is considered a best practice in terms of readability of your functions. But it also happens to be the easiest way to ensure that the hooks are always called, and thus always called in the same order, ***which is critical***.

3. Custom Hooks ***do not have to be*** named like `useXYZ(..)` with a `use` prefix. However, it's a *good suggestion* to do so, because it keeps in line with the [conventions from React's "Custom Hooks"](https://reactjs.org/docs/hooks-custom.html#using-a-custom-hook).

## npm Package

```
npm install tng-hooks
```

And to require it in a node script:

```js
var { TNG, useState, useReducer, /* .. */ } = require("tng-hooks");
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

All code and documentation are (c) 2018-2019 Kyle Simpson and released under the [MIT License](http://getify.mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
