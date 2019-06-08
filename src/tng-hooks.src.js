(function UMD(context,definition){
	/* istanbul ignore next */if (typeof define === "function" && define.amd) { define(definition); }
	/* istanbul ignore next */else if (typeof module !== "undefined" && module.exports) { module.exports = definition(); }
	/* istanbul ignore next */else { Object.assign(context,definition()); }
})(this,function DEF(){
	"use strict";

	const hooksContextState = Symbol("TNG Hooks Context State");
	const HOOKS_CONTEXT_EMPTY = 0;
	const HOOKS_CONTEXT_READY = 1;
	const HOOKS_CONTEXT_PENDING = 2;
	const HOOKS_CONTEXT_COMPLETE = 3;

	var hooksContexts = new WeakSet();
	var appliedHooksContexts = new WeakSet();
	var buckets = new WeakMap();
	var hooksContextAF = new WeakMap();
	var AFevents = new WeakMap();
	var hooksContextStack = [];

	return {
		TNG, useState, useReducer, useEffect,
		useMemo, useCallback, useRef,
	};


	// ******************

	function TNG(...fns) {
		fns = fns.map(function mapper(fn){
			AFevents.set(af,events());
			af.subscribe = subscribe;
			af.unsubscribe = unsubscribe;
			return af;


			// ******************

			function af(...args) {
				var bucket, nextHooksContext;

				// passed-in hooks-context?
				if (args[0] && hooksContexts.has(args[0])) {
					let hooksContext = args.shift();

					if (hooksContextAF.has(hooksContext)) {
						if (hooksContextAF.get(hooksContext) !== af) {
							throw new Error("Context associated with a different articulated function.");
						}
					}
					else {
						hooksContextAF.set(hooksContext,af);
					}

					if ([ HOOKS_CONTEXT_EMPTY, HOOKS_CONTEXT_COMPLETE, ].includes(hooksContext[hooksContextState])) {
						bucket = buckets.get(hooksContext);
						nextHooksContext = updateContextState(hooksContext,HOOKS_CONTEXT_READY);
						hooksContextAF.set(nextHooksContext,af);
						buckets.set(nextHooksContext,bucket);
						hooksContextStack.push(nextHooksContext);
					}
					else if (hooksContext[hooksContextState] == HOOKS_CONTEXT_READY) {
						throw new Error("Context currently in use.");
					}
					else if (hooksContext[hooksContextState] == HOOKS_CONTEXT_PENDING) {
						if (appliedHooksContexts.has(hooksContext)) {
							throw new Error("Context is stale.");
						}
						else {
							throw new Error("Context has pending effects that must be applied.");
						}
					}
				}
				// starting with a fresh hooks-context
				else {
					nextHooksContext = updateContextState(
						{
							return: undefined,
							effects() {
								if (this[hooksContextState] === HOOKS_CONTEXT_PENDING) {
									if (!appliedHooksContexts.has(this)) {
										appliedHooksContexts.add(this);
										let bucket = buckets.get(this);
										runEffects(bucket);
										let nextHooksContext = updateContextState(this,HOOKS_CONTEXT_COMPLETE);
										hooksContextAF.set(nextHooksContext,af);
										buckets.set(nextHooksContext,bucket);
										return nextHooksContext;
									}
									else {
										throw new Error("Context is stale.");
									}
								}
								else {
									throw new Error("Context has no pending effects.");
								}
							},
							reset,
						},
						HOOKS_CONTEXT_EMPTY
					);
					hooksContextAF.set(nextHooksContext,af);
					hooksContextStack.push(nextHooksContext);
					bucket = getCurrentBucket();
				}

				// ready the bucket for use
				bucket.nextStateSlotIdx = 0;
				bucket.nextEffectIdx = 0;
				bucket.nextMemoizationIdx = 0;

				try {
					nextHooksContext.return = fn.apply(nextHooksContext,args);
					let newState =
						(bucket.effects.length > 0) ?
						HOOKS_CONTEXT_PENDING :
						HOOKS_CONTEXT_READY;
					nextHooksContext = updateContextState(nextHooksContext,newState);
					buckets.set(nextHooksContext,bucket);
					return nextHooksContext;
				}
				finally {
					hooksContextStack.pop();
				}
			}
		});

		return (fns.length < 2) ? fns[0] : fns;
	}

	function updateContextState(hooksContext,nextState) {
		hooksContext = {
			[Symbol.toStringTag]: "TNG-Context",
			[hooksContextState]: nextState,
			...hooksContext,
		};
		Object.defineProperty(hooksContext,hooksContextState,{
			writable: false,
			configurable: false,
			enumerable: false,
		});
		hooksContexts.add(hooksContext);
		return hooksContext;
	}

	function runEffects(bucket) {
		for (let effectIdx = 0; effectIdx < bucket.effects.length; effectIdx++) {
			try {
				if (typeof bucket.effects[effectIdx][0] == "function") {
					bucket.effects[effectIdx][0]();
				}
			}
			finally {
				// is effect slot still valid (not already reset)?
				if (effectIdx < bucket.effects.length) {
					bucket.effects[effectIdx][0] = undefined;
				}
			}
		}
	}

	function reset() {
		var hooksContext = this;
		var af = hooksContextAF.get(hooksContext);
		var bucket = buckets.get(hooksContext);
		hooksContextStack.push(hooksContext);
		if (hooksContext[hooksContextState] != HOOKS_CONTEXT_EMPTY) {
			try {
				// run all pending cleanups
				for (let cleanupIdx = 0; cleanupIdx < bucket.cleanups.length; cleanupIdx++) {
					let cleanupFn = bucket.cleanups[cleanupIdx];
					try {
						if (typeof cleanupFn == "function") {
							cleanupFn();
						}
					}
					finally {
						// is cleanup slot still valid (not already reset)?
						if (cleanupIdx < bucket.cleanups.length) {
							bucket.cleanups[cleanupIdx] = undefined;
						}
						dispatchEvent(hooksContext,"cleanup",cleanupIdx,cleanupFn);
					}
				}
				hooksContext = updateContextState(hooksContext,HOOKS_CONTEXT_EMPTY);
				hooksContextAF.set(hooksContext,af);
				buckets.set(hooksContext,bucket);
				return hooksContext;
			}
			finally {
				hooksContextStack.pop();
				bucket.stateSlots.length = 0;
				bucket.effects.length = 0;
				bucket.cleanups.length = 0;
				bucket.memoizations.length = 0;
				bucket.nextStateSlotIdx = 0;
				bucket.nextEffectIdx = 0;
				bucket.nextMemoizationIdx = 0;
			}
		}
	}

	function events() {
		return {
			state: new Set(),
			effect: new Set(),
			cleanup: new Set(),
			dispatch(type,...args) {
				for (let listener of this[type]) {
					try {
						listener(...args);
					}
					catch (err) {}
				}
			},
		};
	}

	function dispatchEvent(hooksContext,type,...args) {
		var af = hooksContextAF.get(hooksContext);
		var evts = AFevents.get(af);
		evts.dispatch(type,af,hooksContext,...args);
	}

	function subscribe(listeners) {
		var evts = AFevents.get(this);
		for (let type of ["state","effect","cleanup",]) {
			if (type in listeners) {
				evts[type].add(listeners[type]);
			}
		}
		return this;
	}

	function unsubscribe(listeners) {
		var evts = AFevents.get(this);
		for (let type of ["state","effect","cleanup",]) {
			if (type in listeners) {
				evts[type].delete(listeners[type]);
			}
		}
		return this;
	}

	function getCurrentHooksContext() {
		if (hooksContextStack.length > 0) {
			return hooksContextStack[hooksContextStack.length - 1];
		}
	}

	function getCurrentBucket() {
		var hooksContext = getCurrentHooksContext();
		if (hooksContext) {
			if (!buckets.has(hooksContext)) {
				let bucket = {
					nextStateSlotIdx: 0,
					nextEffectIdx: 0,
					nextMemoizationIdx: 0,
					stateSlots: [],
					effects: [],
					cleanups: [],
					memoizations: [],
				};
				buckets.set(hooksContext,bucket);
			}

			return buckets.get(hooksContext);
		}
	}

	function useState(initialVal) {
		var bucket = getCurrentBucket();
		if (bucket) {
			return useReducer(function reducer(prevVal,vOrFn){
				return (typeof vOrFn == "function") ?
					vOrFn(prevVal) :
					vOrFn;
			},initialVal);
		}
		else {
			throw new Error("useState() only valid inside an Articulated Function or a Custom Hook.");
		}
	}

	function useReducer(reducerFn,initialVal,...initialReduction) {
		var hooksContext = getCurrentHooksContext();
		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this state slot for this bucket?
			if (!(bucket.nextStateSlotIdx in bucket.stateSlots)) {
				// creating state slots allowed in this hooks-context state?
				if (hooksContext[hooksContextState] == HOOKS_CONTEXT_EMPTY) {
					let slotIdx = bucket.nextStateSlotIdx;
					let slotVal = (typeof initialVal == "function") ? initialVal() : initialVal;
					let slot = [
						slotVal,
						function updateSlot(v){
							if (hooksContext[hooksContextState] != HOOKS_CONTEXT_COMPLETE) {
								let oldSlotVal = slot[0];
								try {
									slot[0] = reducerFn(slot[0],v);
								}
								finally {
									dispatchEvent(hooksContext,"state",slotIdx,oldSlotVal,slot[0]);
								}
							}
							else {
								throw new Error("State cannot be updated.");
							}
						},
					];
					bucket.stateSlots[bucket.nextStateSlotIdx] = slot;

					// run the reducer initially?
					if (initialReduction.length > 0) {
						bucket.stateSlots[bucket.nextStateSlotIdx][1](initialReduction[0]);
					}
				}
				else {
					throw new Error("Context is already initialized.");
				}
			}

			return [ ...bucket.stateSlots[bucket.nextStateSlotIdx++], ];
		}
		else {
			throw new Error("useReducer() only valid inside an Articulated Function or a Custom Hook.");
		}
	}

	// NOTE: both `guards1` and `guards2` are either
	//    `undefined` or an array
	function guardsChanged(guards1,guards2) {
		// either guards list not set?
		if (guards1 === undefined || guards2 === undefined) {
			return true;
		}

		// guards lists of different length?
		if (guards1.length !== guards2.length) {
			return true;
		}

		// check guards lists for differences
		//    (only shallow value comparisons)
		for (let [idx,guard,] of guards1.entries()) {
			if (!Object.is(guard,guards2[idx])) {
				return true;
			}
		}

		return false;
	}

	function useEffect(fn,...guards) {
		// passed in any guards?
		if (guards.length > 0) {
			// only passed a single guards list?
			if (guards.length == 1 && Array.isArray(guards[0])) {
				guards = guards[0];
			}
		}
		// no guards passed
		// NOTE: different handling than an empty guards list like []
		else {
			guards = undefined;
		}

		var hooksContext = getCurrentHooksContext();
		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this effect slot for this bucket?
			if (!(bucket.nextEffectIdx in bucket.effects)) {
				// creating state slots allowed in this hooks-context state?
				if (hooksContext[hooksContextState] == HOOKS_CONTEXT_EMPTY) {
					bucket.effects[bucket.nextEffectIdx] = [];
				}
				else {
					throw new Error("Context is already initialized.");
				}
			}

			let effectIdx = bucket.nextEffectIdx;
			let effect = bucket.effects[effectIdx];

			// check guards?
			if (guardsChanged(effect[1],guards)) {
				// define effect handler
				effect[0] = function effect(){
					// run a previous cleanup first?
					var cleanupFn = bucket.cleanups[effectIdx];
					if (typeof cleanupFn == "function") {
						try {
							cleanupFn();
						}
						finally {
							// is cleanup slot still valid (not already reset)?
							if (effectIdx < bucket.cleanups.length) {
								bucket.cleanups[effectIdx] = undefined;
							}
							dispatchEvent(hooksContext,"cleanup",effectIdx,cleanupFn);
						}
					}

					try {
						// invoke the effect itself
						let ret = fn();

						// cleanup function returned, to be saved?
						if (typeof ret == "function") {
							bucket.cleanups[effectIdx] = ret;
						}
					}
					finally {
						dispatchEvent(hooksContext,"effect",effectIdx,fn);
					}
				};
				effect[1] = guards;
			}

			bucket.nextEffectIdx++;
		}
		else {
			throw new Error("useEffect() only valid inside an Articulated Function or a Custom Hook.");
		}
	}

	function useMemo(fn,...inputGuards) {
		// passed in any input-guards?
		if (inputGuards.length > 0) {
			// only passed a single inputGuards list?
			if (inputGuards.length == 1 && Array.isArray(inputGuards[0])) {
				inputGuards = inputGuards[0];
			}
		}
		// no input-guards passed
		// NOTE: different handling than an empty inputGuards list like []
		else {
			// the function itself is then used as the only input-guard
			inputGuards = [fn,];
		}

		var hooksContext = getCurrentHooksContext();
		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this memoization slot for this bucket?
			if (!(bucket.nextMemoizationIdx in bucket.memoizations)) {
				// creating memoization slots allowed in this hooks-context state?
				if (hooksContext[hooksContextState] == HOOKS_CONTEXT_EMPTY) {
					bucket.memoizations[bucket.nextMemoizationIdx] = [];
				}
				else {
					throw new Error("Context is already initialized.");
				}
			}

			let memoization = bucket.memoizations[bucket.nextMemoizationIdx];

			// check input-guards?
			if (guardsChanged(memoization[1],inputGuards)) {
				try {
					// invoke the to-be-memoized function
					memoization[0] = fn();
				}
				finally {
					// save the new input-guards
					memoization[1] = inputGuards;
				}
			}

			bucket.nextMemoizationIdx++;

			// return the memoized value
			return memoization[0];
		}
		else {
			throw new Error("useMemo() only valid inside an Articulated Function or a Custom Hook.");
		}
	}

	function useCallback(fn,...inputGuards) {
		if (getCurrentBucket()) {
			return useMemo(function callback(){ return fn; },...inputGuards);
		}
		else {
			throw new Error("useCallback() only valid inside an Articulated Function or a Custom Hook.");
		}
	}

	function useRef(initialValue) {
		if (getCurrentBucket()) {
			// create a new {} object with a `current` property,
			// save it in a state slot
			let [ref,] = useState({ current: initialValue, });
			return ref;
		}
		else {
			throw new Error("useRef() only valid inside an Articulated Function or a Custom Hook.");
		}
	}
});
