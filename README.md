# TNG-Hooks

[![Build Status](https://travis-ci.org/getify/TNG-Hooks.svg?branch=master)](https://travis-ci.org/getify/TNG-Hooks)
[![npm Module](https://badge.fury.io/js/tng-hooks.svg)](https://www.npmjs.org/package/tng-hooks)
[![Dependencies](https://david-dm.org/getify/tng-hooks.svg)](https://david-dm.org/getify/tng-hooks)
[![devDependencies](https://david-dm.org/getify/tng-hooks/dev-status.svg)](https://david-dm.org/getify/tng-hooks?type=dev)
[![Coverage Status](https://coveralls.io/repos/github/getify/tng-hooks/badge.svg?branch=master)](https://coveralls.io/github/getify/tng-hooks?branch=master)

## Overview

**TNG-Hooks** (/ˈting ho͝oks/) provides hooks (i.e., `useState(..)`, `useReducer(..)`, `useEffect(..)`, etc) for decorating regular, standalone functions with useful state and effects management. Custom hooks are also supported.

TNG is inspired by the conventions and capabilities of [React's Hooks](https://reactjs.org/docs/hooks-overview.html), so much of TNG resembles React Hooks. The growing collections of information and [examples](https://usehooks.com/) about React's Hooks will also be useful in sparking ideas for TNG usage.

However, this is a separate project with its own motivations and specific behaviors. TNG will remain similar to React Hooks where it makes sense, but there will also be deviations as appropriate.

### Articulated Functions

An **Articulated Function** is the TNG equivalent of a React function component: a regular, standalone function decorated with a TNG hooks-context, which means hooks are valid to use during its invocation.

Unlike a normal pure function, which takes all its inputs and computes output(s) without producing any side-effects, the most straightforward way to think about an Articulated Function is that it is **stateful** (maintains its own state) and **effectful** (spins off side-effects).

These will often be used to model the rendering of UI components, as is seen with React components. But Articulated Functions are useful for tracking any kind of state, as well as applying various side effects (asynchrony, Ajax calls, database queries, etc).

Similar to [React's "Custom Hooks"](https://reactjs.org/docs/hooks-custom.html), TNG's Articulated Functions can also invoke other non-Articulated Functions, which allows those function calls to adopt the active hooks-context and use any current hooks, as if they *were* Articulated. These non-articulated-but-hooks-capable functions are [TNG's Custom Hooks](#custom-hooks).

### Quick Examples

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

TNG provides hooks which deliberately resemble React's hooks. However, as TNG is a separate project, there are some important nuances and differences to pay close attention to.

### `TNG(..)`

`TNG(..)` is a utility to produce [Articulated Functions](#articulated-functions) from normal, stanadlone functions. Articulated Functions adopt an active hooks-context to enable hooks capabilities.

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
A();        // own separate TNG hooks-context
B();        // ditto
C();        // ditto
```

Articulated Functions have the same signature as the functions they wrap, including any arguments, return value, and the ability to be invoked with a `this` context if desired.

#### Resetting Hooks-Context

Articulated Functions also have a method defined on them called `reset()`. The `reset()` method resets the internal TNG hooks-context of an Articulated Function, including any state slots, effects, etc.

For example:

```js
function hit() {
    var [count,updateCount] = useState(0);

    count++;
    updateCount(count);

    console.log(`Hit count: ${count}`);
}

hit = TNG(hit);

hit();       // Hit count: 1
hit();       // Hit count: 2
hit();       // Hit count: 3

hit.reset();

hit();       // Hit count: 1
```

Also, if an Articulated Function has any [pending effect cleanup functions](#effect-cleanups), `reset()` will trigger them. See [`useEffect(..)`](#useeffect-hook) for more information on effects and cleanups.

### `useState(..)` Hook

The TNG `useState(..)` hook, like [React's `useState(..)` hook](https://reactjs.org/docs/hooks-state.html), allows an Articulated Function to persist a unit of state across multiple invocations, without relying on global variables or having to manually create a closure to store that state.

For example:

```js
function hit() {
    var [count,updateCount] = useState(0);

    count++;
    updateCount(count);

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

    console.log(`Hit count: ${count+1}`);
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

    console.log(`Hit count: ${count+amount}`);
}

function updateCounter(prevCount,val) {
    return prevCount + val;
}

hit = TNG(hit);

hit();       // Hit count: 1
hit();       // Hit count: 2
hit(8);      // Hit count: 10
```

Optionally, you can pass a third argument to `useReducer(..)` (value `5` in the following snippet), which specifies a value to be used in invoking the reducer immediately on this initial pass:

```js
function hit(amount = 1) {
    var [count,incCounter] = useReducer(updateCounter,0,5);
    incCounter(amount);

    console.log(`Hit count: ${count+amount}`);
}

function updateCounter(prevCount,val) {
    return prevCount + val;
}

hit = TNG(hit);

hit();       // Hit count: 6
hit();       // Hit count: 7
hit(3);      // Hit count: 10
```

The line `useReducer(updateCounter,0,5)` immediately invokes `updateCounter(0,5)`, which returns `5`, and the state unit (named `count` here) is then initially set to *that* `5` value.

### `useEffect(..)` Hook

Like [React's `useEffect(..)` hook](https://reactjs.org/docs/hooks-effect.html), the TNG `useEffect(..)` hook will conditionally run side-effect code "after" the current Articulated Function completes its invocation.

For example:

```js
function hit() {
    var [count,updateCount] = useState(0);

    updateCount(onUpdateCount);

    useEffect(function logAfter(){
        console.log(`Hit count: ${count+1}`);
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

The `useEffect(..)` utility accepts an optional second argument, which is a list of values to guard whether the effect should be invoked. See also the related discussion of the [input-guards list for `useMemo(..)`](#user-content-inputguards).

`useEffect(..)`'s guards list is optional because sometimes effects should be invoked every time. As shown above, if the guards list is omitted, the effect is always invoked:

```js
function updateCounter(count) {
    useEffect(function onUpdate(){
        // unconditional effect, runs every time
    });
}

updateCounter = TNG(updateCounter);
```

But in some cases, conditional guards can be quite helpful for performance optimizations (e.g., preventing unnecessary invocations of an effect).

If the guards list is provided and includes any values, the list's current values are compared to the previous guards list values provided when the effect was last invoked; the conditional effect is invoked only if a value in the guards list has changed from before, or if this is the first invocation of that conditional effect; otherwise the effect invocation is skipped.

<a name="emptyguards"></a>

As a special case of this conditional guards list behavior, passing an empty list (`[]`) *every time* is the most straight-forward way to ensure an effect runs only once, the first time:

```js
function renderButton(label) {
    // only run this effect once, initially
    useEffect(function onSetup(){
        buttonElem.addEventListener("click",onClick);
    },[]);

    // ..
}

renderButton = TNG(renderButton);
```

The list of values you pass as the conditional guards should be any (and all!) state values that the effect depends on.

For example, if an effect function closes over (uses) two variables, `name` and `age`, then the effect's conditional guards list should include both of them (as `[name,age]`). Thus, the effect will only be invoked if either `name` or `age` (or both) have changed since the last time the effect was actually invoked.

```js
function renderPerson(person) {
    var { name, age } = person;

    useEffect(function onChanged(){
        nameElem.innerText = name;
        ageElem.innerText = age;
    },[name,age]);
}

renderPerson = TNG(renderPerson);
```

<a name="effectsameguards"></a>

As stated, the use of the guards list **is optional**. But if you choose to pass the guards list, it's a very good idea and *best practice* to always **pass the same fixed guards list** to each invocation of a conditional effect (even though the values in the list will change).

In other words, avoid dynamically constructing and passing different guards lists (or sometimes no guards list at all) to the same conditional effect across different invocations. This would lead to very confusing behavior and be more susceptible to bugs. Moreover, it's likely to be rare for an effect to depend on different state values on subsequent invocations; try to avoid this if possible, perhaps by breaking into separate conditional effects, each with their own fixed guards list.

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

renderButton = TNG(renderButton);
```

The first time the Articulated Function `renderButton(..)` is invoked, the `onSetup()` effect will subscribe its event listener. The `onCleanup()` cleanup function returned from the effect will be saved by TNG internally. The next time `renderButton(..)` is invoked (and thus the `onSetup()` effect is invoked), the saved previous `onCleanup()` function will *first* be triggered -- in this example, unsubscribing the event listener and preventing a subsequent double event subscription.

**Note:** Since effects are not invoked until *after* the Articulated Function is complete, that means the cleanup function saved from the previous invocation of an effect will also not be triggered until *after* the current invocation of the Articulated Function is complete.

Each invocation of an effect triggers its own previous cleanup (if any). But the "final"  invocation of a cleanup -- whenever the Articulated Function (and its effects) won't be invoked anymore -- would obviously not have anything to trigger it. If the cause of this *final state* is the end of the lifetime of the program/browser page, this is likely not a problem.

But if you need to ensure manually that any pending *final* cleanup(s) are actually triggered, the [`reset()` method of the Articulated Function](#resetting-hooks-context) will trigger any pending cleanups.

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

Keep in mind that `reset()` also resets the internal TNG hooks-context of the Articulated Function, including all state slots, effects, etc.

### `useMemo(..)` Hook

Like [React's `useMemo(..)` hook](https://reactjs.org/docs/hooks-reference.html#usememo), the TNG `useMemo(..)` hook will invoke a function and return its value. But additionally, this return value is memoized (aka "remembered") so that if the same function (exact same reference!) is evaluated again, the function won't actually be invoked, but its memoized value will be returned.

Memoization of a function's return value can be a very helpful performance optimization, preventing the function from being called unnecessarily when the same value would be returned anyway. Memoization should only be used when a function is likely to be called multiple times (with the same output returned), where this performance optimization will be beneficial.

Keep in mind that memoization means TNG stores the last return value output for each memoized function, which could have implications on memory usage and/or GC behavior. Only memoize functions if they match this intended usage and performance pattern.

**Note:** `useMemo(..)` does not pass any arguments when invoking the function. The memoized function must therefore already have access to any necessary "inputs", either by closure or some other means, and should use only those inputs to produce its output. A memoized function should always return the same output given the same *state* of all its inputs. Otherwise, any expected differing output would not be returned, which would almost certainly cause bugs in the program.

For example:

```js
function computeMeaningOfLife() {
    // ..
    console.log("Computing...");
    return 42;
}

function askTheQuestion() {
    var v = useMemo(computeMeaningOfLife);
    return v;
}

askTheQuestion = TNG(askTheQuestion);

askTheQuestion();       // Computing...
                        // 42
askTheQuestion();       // 42
```

In this snippet, the first invocation of `askTheQuestion()` invokes the `computeMeaningOfLife()` function. But on the second invocation of `askTheQuestion()`, the memoized `42` output is returned without invoking `computeMeaningOfLife()`.

In that above snippet, across both invocations, the exact same function reference of `computeMeaningOfLife` is passed to `useMemo(..)`. But each time a different function reference is passed, it will be invoked.

In the following snippet, the `computeMeaningOfLife()` is a nested function -- in this case, an inline function expression -- and is thus different for each invocation of `askTheQuestion()`. As a result, `computeMeaningOfLife()` is always invoked, defeating the whole point of memoization:

```js
function askTheQuestion() {
    var v = useMemo(function computeMeaningOfLife() {
        // ..
        console.log("Computing...");
        return 42;
    });
    return v;
}

askTheQuestion = TNG(askTheQuestion);

askTheQuestion();       // Computing...
                        // 42
askTheQuestion();       // Computing...
                        // 42
```

It appears as if nested (inside the Articulated Function) functions -- whether inline expressions or just inner function declarations -- cannot be usefully memoized, which seems like a major drawback!

<a name="inputguards"></a>

However, this nested function drawback can be addressed. Similar to [conditional effects via the optional second argument to `useEffect(..)`](#conditional-effects), `useMemo(..)` accepts an optional second argument: an input-guards list.

While the input-guards list is strictly optional, you will probably want to use it most of the time, especially since it enables proper memoization of nested functions.

For example:

```js
function getW(x,y) {
    var z = 3 * (x + y);

    var w = useMemo(function computeW(){
        return x * y / z;
    },[x,y,z]);

    return w;
}

getW = TNG(getW);

getW(3,5);      // 0.625
getW(3,5);      // 0.625 -- memoized!
getW(4,6);      // 0.8
```

The `[x,y,z]` array in this snippet acts as the input-guards list for the memoized `computeW()` nested function.

The first invocation of `getW(..)` passes `[3,5,24]` as the input-guards list to `useMemo(..)`, and which invokes the function, producing the `0.625` output. The second invocation of `getW(..)` passes the same input-guards list values (`3`, `5`, and `24`) into `useMemo(..)`, so the `computeW()` function is not invoked, and the previous return value of `0.625` is simply returned. The third invocation of `getW(..)` passes in `[4,6,30]` as the input-guards list, so `computeW()` is now invoked again, this time producing `0.8`.

Though it may be tempting to think of the input-guards list as "conditional memoization", similar to [conditional effects](#conditional-effects) based on their guards list, the meaning here is slightly different. It is still conditional invocation, but with a different motivation.

The memoization input-guards list should contain all the memoized function's "inputs": any value the function relies on, that might change over time. These values are not actually passed in as arguments; they just represent "inputs" conceptually, not directly.

The values in this list should not be thought of as conditionally invoking the memoized function, but rather as deciding if the function *would* produce a new value if invoked.

If any of the input-guards have changed, the assumption is that the memoized function would produce a new output, so it *should* be invoked to get that new output. But if they haven't changed, the assumption is that the already memoized output value is still the expected return value, so the memoized function can safely be skipped.

In other words, the better mental model here is: **the input-guards list determines if the current memoized value is still valid or not.**

Similar to [`useEffect(..)`](#user-content-emptyguards), always passing an empty input-guards list `[]` to `useMemo(..)` ensures that the memoized function will only ever be invoked once. Also similar to the [discussion of using the same guards list for `useEffect(..)`](#user-content-effectsameguards), it's best practice that if you pass an input-guards list to `useMemo(..)`, always pass the same list (even though its values may change).

**Note:** As shown above, passing an input-guards list produces the memoization behavior (conditional skipping) even for a nested function, which addresses the previously discussed drawback. Further, if you omit the input-guards list (not just passing the `[]` empty list!), the function reference itself becomes the only input-guard. So, if the function is exactly the same reference each time, its memoized output value will always be returned. But if the function reference is different each time (as it is with nested functions), it always has to be invoked. **Bottom Line: Only omit the input-guards list if you will always be passing the same function reference.**

### `useCallback(..)` Hook

Like [React's `useCallback(..)` hook](https://reactjs.org/docs/hooks-reference.html#usecallback), the TNG `useCallback(..)` hook conditionally selects (via memoization) either the previous version of a function, if a set of input-guards haven't changed, or the new version of the function if the input-guards have changed.

For example:

```js
function requestData(data) {
    var cb = useCallback(
        function onData(resp){
            console.log(`User (${data.userID}) data: ${resp}`);
        },
        [data.userID]
    );
    ajax(API_URL,data,cb);
}

requestData = TNG(requestData);

requestData({ userID: 1 });
// User (1): ...

requestData({ userID: 1 });
// User (1): ...

requestData({ userID: 2 });
// User (2): ...
```

In this snippet, the `onData(..)` function is conditionally guarded by the input-guards list `[data.userID]`, which means that `cb` will remain the same instance of that `onData(..)` function as long as `data.userID` stays the same. In other words, the first invocation of `requestData(..)`, with `data.userID` of `1`, defines (and memoizes) an `onData(..)` nested function expression, and assigns it to `cb`.

For the second invocation of `requestData(..)`, where `data.userID` is still `1`, the new `onData(..)` nested function expression is just discarded, and the previously saved `onData(..)` function reference is returned to `cb` instead.

Once the `data.userID` changes (from `1` to `2`) for the third invocation of `requestData(..)`, that new `onData(..)` nested function expression replaces the previous function reference, and is returned to `cb`.

**Note:** This particular example is only illustrative of how the `useCallback(..)` hook works, but would actually have worked the same if the hook had not been used. It takes more complicated examples to illustrate where this hook creates clear benefits.

### `useRef(..)` Hook

Similar to [React's `useRef(..)` hook](https://reactjs.org/docs/hooks-reference.html#useref), the TNG `useRef(..)` hook creates an object stored persistently in a state slot (via the [`useState(..)` hook](#usestate-hook)), and creates a property on it called `current` which holds a specified initial value, if any.

For example:

```js
function hit() {
    var counter = useRef(0);

    counter.current++;

    console.log(`Hit count: ${counter.current}`);
}

hit = TNG(hit);

hit();       // Hit count: 1
hit();       // Hit count: 2
hit();       // Hit count: 3
```

It may be more convenient to pass around the reference to this persistent object, and make any updates to its `current` property (or add/remove other properties), than to have to pass around both a state value and its updater function.

### Custom Hooks

If any TNG hooks are used in a non-Articulated Function, it behaves essentially like a [React "Custom Hook"](https://reactjs.org/docs/hooks-custom.html). A TNG Custom Hook ***must be called***, directly or indirectly, from an Articulated Function, so that it has an active TNG hooks-context available to use.

For example:

```js
// a Custom Hook, ***not*** an Articulated Function
function useHitCounter() {
    // inherited TNG hooks-context
    var [count,updateCount] = useState(0);

    count++;
    updateCount(count);

    return count;
}

// will be TNG(..) Articulated twice, once as
// each button's click handler
function onClick(evt) {
    // using a Custom Hook
    var hitCount = useHitCounter();

    console.log(`Button #${evt.target.id}: ${hitCount}`);
}

var fooBtn = document.getElementById("foo-btn");
var barBtn = document.getElementById("bar-btn");

// each click handler is an Articulated `onClick()`
fooBtn.addEventListener("click",TNG(onClick),false);
barBtn.addEventListener("click",TNG(onClick),false);
```

**[Run Demo](https://codepen.io/getify/pen/VVbZOd?editors=1010)**

**Note:** Unlike React, TNG does not ***require*** naming Custom Hooks in the format `useWHATEVER(..)` with a `use` prefix. You *can do so* if you prefer, as we did in the above snippet. See the [rules of TNG hooks](#hook-call-rules) below.

The `useHitCounter(..)` Custom Hook -- again, just a normal non-Articulated Function that uses a TNG hook like `useState(..)`! -- inherits the TNG hooks-context of the Articulated Function that invoked it. In this example, the invoking Articulated Function is either one of the two click handlers (produced via the two `TNG(..)` calls) that were bound, respectively, as each button's click handler.

In other words, the line `var [count,updateCount] = useState(0);` acts as if it had actually been called inside of one of the click handlers, even though it's in the separate `useHitCounter(..)` function; that's what makes `useHitCounter(..)` a Custom Hook, meaning it can be called from any Articulated Function.

### Hook Call Rules

Similar to [the rules of React's hooks](https://reactjs.org/docs/hooks-rules.html#only-call-hooks-at-the-top-level), there are some rules/guides that you should keep in mind when using **TNG-Hooks**.

1. All TNG hooks ***must always*** be called in the same order within an Articulated Function (and any Custom Hooks it calls). That is, you must never have an invocation of an Articulated Function that skips over an earlier hook call and tries to invoke one of the subsequent hook calls. ***THIS WILL BREAK!***

    However, it is still technically possible to have hook calls in conditional situations (or even loops!), as long as you are very careful to never skip calls in an unsafe ordering manner.

    If you have three hook calls (A, B, and C) in a function, these are the valid call ordering scenarios:

    - A, B, C
    - A, B
    - A

    Even though stopping short in the calling order is possible, it's still a best practice for reducing confusion to always call A, B, **and** C; avoid stopping short if possible.

    Moreover, these are invalid calling order scenarios that ***definitely will break***:

    - B, C
    - A, C
    - B
    - C

2. To avoid tripping on the intricasies of those calling order scenarios, it is ***strongly recommended*** that you only call TNG hooks from the top-level of the function, not inside of any loops or conditional statements.

    This is considered a best practice in terms of readability of your functions. But it also happens to be the easiest way to ensure that the hooks are always called, and thus always called in the same order, ***which is critical*** as described above.

3. Custom Hooks ***do not have to be*** named like `useXYZ(..)` with a `use` prefix. However, it's a *good suggestion* to do so, because it keeps in line with the [conventions from React's "Custom Hooks"](https://reactjs.org/docs/hooks-custom.html#using-a-custom-hook).

## Environment Support

This utility uses ES6 (aka ES2015) features. If you need to support environments prior to ES6, transpile it first (with Babel, etc).

## npm Package

```
npm install tng-hooks
```

And to require it in a node script:

```js
var { TNG, useState, useReducer, /* .. */ } = require("tng-hooks");
```

## Builds

[![Build Status](https://travis-ci.org/getify/TNG-Hooks.svg?branch=master)](https://travis-ci.org/getify/TNG-Hooks)
[![npm Module](https://badge.fury.io/js/tng-hooks.svg)](https://www.npmjs.org/package/tng-hooks)

The distribution library file (`dist/tng-hooks.js`) comes pre-built with the npm package distribution, so you shouldn't need to rebuild it under normal circumstances.

However, if you download this repository via Git:

1. The included build utility (`scripts/build-core.js`) builds (and minifies) `dist/tng-hooks.js` from source. **The build utility expects Node.js version 6+.**

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

All code and documentation are (c) 2019 Kyle Simpson and released under the [MIT License](http://getify.mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
