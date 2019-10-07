(function UMD(context,definition){
	/* istanbul ignore next */if (typeof define === "function" && define.amd) { define(definition); }
	/* istanbul ignore next */else if (typeof module !== "undefined" && module.exports) { module.exports = definition(); }
	/* istanbul ignore next */else { Object.assign(context,definition()); }
})(this,function DEF(){
	"use strict";

	const HOOKS_CONTEXT_OPEN = 0;
	const HOOKS_CONTEXT_ACTIVE = 1;
	const HOOKS_CONTEXT_PENDING = 2;
	const HOOKS_CONTEXT_READY = 3;
	const HOOKS_CONTEXT_LOCKED = 4;

	var recognizedHooksContexts = new WeakSet();
	var hooksContextState = new WeakMap();
	var buckets = new WeakMap();
	var hooksContextAF = new WeakMap();
	var AFevents = new WeakMap();
	var hooksContextStack = [];
	var schedulingQueue = Queue();
	var tick;

	TNG.auto = auto;

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
				var bucket, hooksContext;

				// passed-in hooks-context?
				if (args[0] && recognizedHooksContexts.has(args[0])) {
					hooksContext = args.shift();

					if (hooksContextAF.has(hooksContext)) {
						if (hooksContextAF.get(hooksContext) !== af) {
							throw new Error("Context belongs to a different articulated function");
						}
					}
					else {
						hooksContextAF.set(hooksContext,af);
					}

					let currentHooksContextState = hooksContextState.get(hooksContext);

					if ([ HOOKS_CONTEXT_OPEN, HOOKS_CONTEXT_READY, ].includes(currentHooksContextState)) {
						bucket = buckets.get(hooksContext);
						hooksContextState.set(hooksContext,HOOKS_CONTEXT_ACTIVE);
						hooksContextStack.push(hooksContext);
					}
					else if ([ HOOKS_CONTEXT_ACTIVE, HOOKS_CONTEXT_LOCKED, ].includes(currentHooksContextState)) {
						throw new Error("Context currently in use");
					}
					else if (currentHooksContextState == HOOKS_CONTEXT_PENDING) {
						throw new Error("Context has pending effects that must first be applied");
					}
				}
				// need a fresh hooks-context
				else {
					hooksContext = newHooksContext(af);
					hooksContextStack.push(hooksContext);
					bucket = getCurrentBucket(hooksContext);
				}

				// ready the bucket for use
				bucket.nextStateSlotIdx = 0;
				bucket.nextEffectIdx = 0;
				bucket.nextMemoizationIdx = 0;

				// invoke the original function
				hooksContext.return = undefined;
				hooksContext.return = fn.apply(hooksContext,args);
				hooksContextStack.pop();
				var newState =
					(bucket.effects.length > 0) ?
					HOOKS_CONTEXT_PENDING :
					HOOKS_CONTEXT_ACTIVE;
				hooksContextState.set(hooksContext,newState);

				return hooksContext;
			}
		});

		return (fns.length < 2) ? fns[0] : fns;
	}

	function newHooksContext(af) {
		var hooksContext = {
			[Symbol.toStringTag]: "TNG-Context",
			get state() {
				return hooksContextState.get(hooksContext);
			},
			return: undefined,
			effects() {
				if (hooksContext.state != HOOKS_CONTEXT_LOCKED) {
					if (hooksContextState.get(hooksContext) === HOOKS_CONTEXT_PENDING) {
						hooksContextState.set(hooksContext,HOOKS_CONTEXT_LOCKED);
						let bucket = buckets.get(hooksContext);
						runEffects(bucket);
						hooksContextState.set(hooksContext,HOOKS_CONTEXT_READY);
						return hooksContext;
					}
					else {
						throw new Error("Context has no pending effects");
					}
				}
			},
			reset() {
				if (![ HOOKS_CONTEXT_OPEN, HOOKS_CONTEXT_LOCKED, ].includes(hooksContext.state)) {
					hooksContextState.set(hooksContext,HOOKS_CONTEXT_LOCKED);
					let bucket = buckets.get(hooksContext);
					hooksContextStack.push(hooksContext);

					// run all pending cleanups
					for (let cleanupIdx = 0; cleanupIdx < bucket.cleanups.length; cleanupIdx++) {
						let cleanupFn = bucket.cleanups[cleanupIdx];
						if (isFunction(cleanupFn)) {
							cleanupFn();
						}

						// is cleanup entry still valid (not already reset)?
						if (bucket.cleanups[cleanupIdx]) {
							bucket.cleanups[cleanupIdx] = undefined;
						}

						scheduleEventNotification(hooksContext,"cleanup",cleanupIdx,cleanupFn);
					}

					// reset all context/bucket state
					hooksContextStack.pop();
					hooksContextState.set(hooksContext,HOOKS_CONTEXT_OPEN);
					hooksContext.return = undefined;
					bucket.stateSlots.length = 0;
					bucket.effects.length = 0;
					bucket.cleanups.length = 0;
					bucket.memoizations.length = 0;
					bucket.nextStateSlotIdx = 0;
					bucket.nextEffectIdx = 0;
					bucket.nextMemoizationIdx = 0;

					return hooksContext;
				}
			},
			clone() {
				if (hooksContext.state == HOOKS_CONTEXT_READY) {
					let currentBucket = buckets.get(hooksContext);
					let newContext = newHooksContext(af);

					// copy context state and bucket
					hooksContextState.set(newContext,hooksContext.state);
					newContext.return = hooksContext.return;
					let newBucket = {
						nextStateSlotIdx: currentBucket.nextStateSlotIdx,
						nextEffectIdx: currentBucket.nextEffectIdx,
						nextMemoizationIdx: currentBucket.nextMemoizationIdx,
						stateSlots: currentBucket.stateSlots.map(function cloneStateSlot(slot,slotIdx){
							return initStateSlot(slot.slice(0,2),slotIdx,newContext);
						}),
						effects: currentBucket.effects.map(function cloneEffect(effectEntry,effectIdx){
							var guards = effectEntry[0] ? [ ...effectEntry[0], ] : undefined;
							return [ guards, ];
						}),
						cleanups: [],
						memoizations: currentBucket.memoizations.map(function cloneMemoization(memoization){
							return [ memoization[0], [ ...memoization[1], ], ];
						}),
					};
					buckets.set(newContext,newBucket);

					return newContext;
				}
				else {
					throw new Error("Context not ready to be cloned");
				}
			},
		};

		recognizedHooksContexts.add(hooksContext);
		hooksContextState.set(hooksContext,HOOKS_CONTEXT_OPEN);
		hooksContextAF.set(hooksContext,af);

		return hooksContext;
	}

	function auto(...fns) {
		fns = fns.map(function mapper(fn){
			return initAutoContext(TNG(fn));
		});

		return (fns.length < 2) ? fns[0] : fns;
	}

	function initAutoContext(fn,hooksContext) {
		autoContext.reset = function reset(){
			if (hooksContext) {
				hooksContext.reset();
			}
		};
		autoContext.clone = function clone(){
			var ctx = hooksContext ? hooksContext.clone() : undefined;
			return initAutoContext(fn,ctx);
		};
		autoContext.subscribe = subscribe.bind(fn);
		autoContext.unsubscribe = unsubscribe.bind(fn);
		return autoContext;


		// ******************

		function autoContext(...args){
			if (hooksContext) {
				args = [ hooksContext, ...args, ];
			}
			hooksContext = fn(...args).effects();
			return hooksContext.return;
		}
	}

	function runEffects(bucket) {
		for (let effectIdx = 0; effectIdx < bucket.effects.length; effectIdx++) {
			let runEffectFn = bucket.effects[effectIdx][1];

			if (isFunction(runEffectFn)) {
				runEffectFn();
			}

			// is effect entry still valid (not already reset)?
			if (bucket.effects[effectIdx]) {
				// unset the run-effect function from the entry
				bucket.effects[effectIdx][1] = undefined;
			}
		}
	}

	function subscribe(listeners) {
		var evts = AFevents.get(this);
		for (let type of ["state","effect","cleanup",]) {
			if (type in listeners) {
				evts.on(type,listeners[type]);
			}
		}
		return this;
	}

	function unsubscribe(listeners) {
		var evts = AFevents.get(this);
		for (let type of ["state","effect","cleanup",]) {
			if (type in listeners) {
				evts.off(type,listeners[type]);
			}
		}
		return this;
	}

	function getCurrentHooksContext() {
		if (hooksContextStack.length > 0) {
			return hooksContextStack[hooksContextStack.length - 1];
		}
	}

	function getCurrentBucket(hooksContext = getCurrentHooksContext()) {
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
			if (
				// state slot not yet initialized?
				!(bucket.nextStateSlotIdx in bucket.stateSlots) &&
				// lazily calculate initial value?
				isFunction(initialVal)
			) {
				initialVal = initialVal();
			}

			return useReducer(function reducer(prevVal,vOrFn){
				return isFunction(vOrFn) ? vOrFn(prevVal) : vOrFn;
			},initialVal);
		}
		else {
			throw new Error("useState() only valid inside an Articulated Function or a Custom Hook");
		}
	}

	function useReducer(reducerFn,initialVal,initialReductionFn) {
		var hooksContext = getCurrentHooksContext();
		var bucket = getCurrentBucket(hooksContext);
		if (bucket) {
			let slotIdx = bucket.nextStateSlotIdx++;
			let slot = bucket.stateSlots[slotIdx];

			// need to create this state slot for this bucket?
			if (!slot) {
				// creating state slots allowed in this hooks-context state?
				if (hooksContextState.get(hooksContext) == HOOKS_CONTEXT_OPEN) {
					// was an `initialReductionFn(..)` provided to lazily
					// calculate the initial slot value?
					let slotVal = isFunction(initialReductionFn) ?
						initialReductionFn(initialVal) :
						initialVal;

					slot = bucket.stateSlots[slotIdx] = [slotVal,reducerFn,];
					initStateSlot(slot,slotIdx,hooksContext);
				}
				else {
					throw new Error("Context shape cannot be modified");
				}
			}

			// NOTE: [ slotValue, updateSlot() ]
			return [ slot[0], slot[2], ];
		}
		else {
			throw new Error("useReducer() only valid inside an Articulated Function or a Custom Hook");
		}
	}

	function initStateSlot(slot,slotIdx,hooksContext) {
		slot[2] = function updateSlot(v){
			var prevSlotVal = slot[0];
			slot[0] = slot[1](prevSlotVal,v);
			scheduleEventNotification(hooksContext,"state",slotIdx,prevSlotVal,slot[0]);
		};
		return slot;
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

	function useEffect(effectFn,...guards) {
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
		var bucket = getCurrentBucket(hooksContext);
		if (bucket) {
			let effectIdx = bucket.nextEffectIdx++;
			let effectEntry = bucket.effects[effectIdx];

			// need to create this effect entry for this bucket?
			if (!effectEntry) {
				// creating effect entries allowed in this hooks-context state?
				if (hooksContextState.get(hooksContext) == HOOKS_CONTEXT_OPEN) {
					effectEntry = bucket.effects[effectIdx] = [];
				}
				else {
					throw new Error("Context shape cannot be modified");
				}
			}

			// check guards?
			if (guardsChanged(effectEntry[1],guards)) {
				Object.assign(effectEntry,[
					guards,
					function runEffect(){
						// run a previous cleanup first?
						var cleanupFn = bucket.cleanups[effectIdx];
						if (isFunction(cleanupFn)) {
							cleanupFn();

							// is cleanup entry still valid (not already reset)?
							if (bucket.cleanups[effectIdx]) {
								bucket.cleanups[effectIdx] = undefined;
							}

							scheduleEventNotification(hooksContext,"cleanup",effectIdx,cleanupFn);
						}

						// invoke the effect itself
						var ret = effectFn();

						// cleanup function returned, to be saved?
						if (isFunction(ret)) {
							bucket.cleanups[effectIdx] = ret;
						}

						scheduleEventNotification(hooksContext,"effect",effectIdx,effectFn);
					}
				]);
			}
		}
		else {
			throw new Error("useEffect() only valid inside an Articulated Function or a Custom Hook");
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
		var bucket = getCurrentBucket(hooksContext);
		if (bucket) {
			// need to create this memoization slot for this bucket?
			if (!(bucket.nextMemoizationIdx in bucket.memoizations)) {
				// creating memoization slots allowed in this hooks-context state?
				if (hooksContextState.get(hooksContext) == HOOKS_CONTEXT_OPEN) {
					bucket.memoizations[bucket.nextMemoizationIdx] = [];
				}
				else {
					throw new Error("Context shape cannot be modified");
				}
			}

			let memoization = bucket.memoizations[bucket.nextMemoizationIdx];

			// check input-guards?
			if (guardsChanged(memoization[1],inputGuards)) {
				// invoke the to-be-memoized function
				memoization[0] = fn();
				memoization[1] = inputGuards;
			}

			bucket.nextMemoizationIdx++;

			// return the memoized value
			return memoization[0];
		}
		else {
			throw new Error("useMemo() only valid inside an Articulated Function or a Custom Hook");
		}
	}

	function useCallback(fn,...inputGuards) {
		if (getCurrentBucket()) {
			return useMemo(function callback(){ return fn; },...inputGuards);
		}
		else {
			throw new Error("useCallback() only valid inside an Articulated Function or a Custom Hook");
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
			throw new Error("useRef() only valid inside an Articulated Function or a Custom Hook");
		}
	}

	function scheduleEventNotification(hooksContext,type,...args) {
		var af = hooksContextAF.get(hooksContext);
		var evts = AFevents.get(af);
		schedule(evts.emit,[type,hooksContext,...args,]);
	}

	function events() {
		var listeners = {
			state: new Set(),
			effect: new Set(),
			cleanup: new Set(),
		};
		return {
			on(type,listener) {
				listeners[type].add(listener);
			},
			off(type,listener) {
				listeners[type].delete(listener);
			},
			emit(type,...args) {
				for (let listener of listeners[type]) {
					try {
						listener(...args);
					}
					catch (err) {}
				}
			},
		};
	}

	// Note: using a queue instead of array for efficiency
	function Queue() {
		var first, last, item;

		return {
			add(fn,args) {
				item = new Item(fn,args);
				if (last) {
					last.next = item;
				}
				else {
					first = item;
				}
				last = item;
				item = undefined;
			},
			drain() {
				var f = first;
				first = last = null;

				while (f) {
					f.fn(...f.args);
					f = f.next;
				}
			},
		};
	}

	function Item(fn,args) {
		this.fn = fn;
		this.args = args;
		this.next = undefined;
	}

	function schedule(fn,args) {
		schedulingQueue.add(fn,args);
		if (!tick) {
			tick = Promise.resolve().then(onTick);
		}
	}

	function onTick() {
		schedulingQueue.drain();
		tick = null;
	}

	function isFunction(v) {
		return (typeof v == "function");
	}

});
