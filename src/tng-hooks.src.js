(function UMD(context,definition){
	/* istanbul ignore next */if (typeof define === "function" && define.amd) { define(definition); }
	/* istanbul ignore next */else if (typeof module !== "undefined" && module.exports) { module.exports = definition(); }
	/* istanbul ignore next */else { Object.assign(context,definition()); }
})(this,function DEF(){
	"use strict";

	var buckets = new WeakMap();
	var tngStack = [];

	return {
		TNG, useState, useReducer, useEffect,
		useMemo, useCallback, useRef, useThrottle
	};


	// ******************

	function TNG(...fns) {
		fns = fns.map(function mapper(fn){
			tngf.reset = reset;
			return tngf;


			// ******************

			function tngf(...args) {
				tngStack.push(tngf);
				var bucket = getCurrentBucket();
				bucket.nextStateSlotIdx = 0;
				bucket.nextEffectIdx = 0;
				bucket.nextMemoizationIdx = 0;

				try {
					return fn.apply(this,args);
				}
				finally {
					// run (cleanups and) effects, if any
					try {
						runEffects(bucket);
					}
					finally {
						tngStack.pop();
					}
				}
			}

			function runEffects(bucket) {
				for (let [idx,[effect,guards]] of bucket.effects.entries()) {
					try {
						if (typeof effect == "function") {
							effect();
						}
					}
					finally {
						bucket.effects[idx][0] = undefined;
					}
				}
			}

			function reset() {
				tngStack.push(tngf);
				var bucket = getCurrentBucket();
				try {
					// run all pending cleanups
					for (let cleanup of bucket.cleanups) {
						if (typeof cleanup == "function") {
							cleanup();
						}
					}
				}
				finally {
					tngStack.pop();
					bucket.stateSlots.length = 0;
					bucket.effects.length = 0;
					bucket.cleanups.length = 0;
					bucket.memoizations.length = 0;
					bucket.nextStateSlotIdx = 0;
					bucket.nextEffectIdx = 0;
					bucket.nextMemoizationIdx = 0;
				}
			}
		});

		return (fns.length < 2) ? fns[0] : fns;
	}

	function getCurrentBucket() {
		if (tngStack.length > 0) {
			let tngf = tngStack[tngStack.length - 1];
			let bucket;
			if (!buckets.has(tngf)) {
				bucket = {
					nextStateSlotIdx: 0,
					nextEffectIdx: 0,
					nextMemoizationIdx: 0,
					stateSlots: [],
					effects: [],
					cleanups: [],
					memoizations: [],
				};
				buckets.set(tngf,bucket);
			}

			return buckets.get(tngf);
		}
	}

	function useState(initialVal) {
		var bucket = getCurrentBucket();
		if (bucket) {
			return useReducer(function reducer(prevVal,vOrFn){
				return typeof vOrFn == "function" ?
					vOrFn(prevVal) :
					vOrFn;
			},initialVal);
		}
		else {
			throw new Error("useState() only valid inside an Articulated Function or a Custom Hook.");
		}
	}

	function useThrottle(fn, timer) {
		if(!fn) { throw new TypeError('useThrottle() requires a function argument')}
		if(!timer) { throw new TypeError('useThrottle() requires a timer argument')}

		var bucket = getCurrentBucket();
		if (bucket) {
			const slotIdx = bucket.nextStateSlotIdx;

			if (!(slotIdx in bucket.stateSlots)) {
				const slot = [
					fn,
					timer,
					0
				];
				bucket.stateSlots[bucket.nextStateSlotIdx++] = slot;
			}

			return function throttleFunction(...args) {
				const [fn, timer, lastExecution] = bucket.stateSlots[slotIdx];
				const currentTime = Date.now();

				if(lastExecution + timer < currentTime) {
					try {
						fn(...args);
					} finally {
						bucket.stateSlots[slotIdx][2] = currentTime;
					}
				}
			}
		}
		else {
			throw new Error("useThrottle() only valid inside an Articulated Function or a Custom Hook.");
		}
	}

	function useReducer(reducerFn,initialVal,...initialReduction) {
		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this state-slot for this bucket?
			if (!(bucket.nextStateSlotIdx in bucket.stateSlots)) {
				let slot = [
					typeof initialVal == "function" ? initialVal() : initialVal,
					function updateSlot(v){
						slot[0] = reducerFn(slot[0],v);
					},
				];
				bucket.stateSlots[bucket.nextStateSlotIdx] = slot;

				// run the reducer initially?
				if (initialReduction.length > 0) {
					bucket.stateSlots[bucket.nextStateSlotIdx][1](initialReduction[0]);
				}
			}

			return [...bucket.stateSlots[bucket.nextStateSlotIdx++]];
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
			// force assumption of change in guards
			return true;
		}

		// guards lists of different length?
		if (guards1.length !== guards2.length) {
			// guards changed
			return true;
		}

		// check guards lists for differences
		//    (only shallow value comparisons)
		for (let [idx,guard] of guards1.entries()) {
			if (!Object.is(guard,guards2[idx])) {
				// guards changed
				return true;
			}
		}

		// assume no change in guards
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

		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this effect-slot for this bucket?
			if (!(bucket.nextEffectIdx in bucket.effects)) {
				bucket.effects[bucket.nextEffectIdx] = [];
			}

			let effectIdx = bucket.nextEffectIdx;
			let effect = bucket.effects[effectIdx];

			// check guards?
			if (guardsChanged(effect[1],guards)) {
				// define effect handler
				effect[0] = function effect(){
					// run a previous cleanup first?
					if (typeof bucket.cleanups[effectIdx] == "function") {
						try {
							bucket.cleanups[effectIdx]();
						}
						finally {
							bucket.cleanups[effectIdx] = undefined;
						}
					}

					// invoke the effect itself
					var ret = fn();

					// cleanup function returned, to be saved?
					if (typeof ret == "function") {
						bucket.cleanups[effectIdx] = ret;
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
			inputGuards = [fn];
		}

		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this memoization-slot for this bucket?
			if (!(bucket.nextMemoizationIdx in bucket.memoizations)) {
				bucket.memoizations[bucket.nextMemoizationIdx] = [];
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
			var [ref] = useState({ current: initialValue, });
			return ref;
		}
		else {
			throw new Error("useRef() only valid inside an Articulated Function or a Custom Hook.");
		}
	}
});
