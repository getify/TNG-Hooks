(function UMD(context,definition){
	/* istanbul ignore next */if (typeof define === "function" && define.amd) { define(definition); }
	/* istanbul ignore next */else if (typeof module !== "undefined" && module.exports) { module.exports = definition(); }
	/* istanbul ignore next */else { Object.assign(context,definition()); }
})(this,function DEF(){
	"use strict";

	var buckets = new WeakMap();
	var currentBucket = [];

	return { TNG, useState, useReducer, };


	// ******************

	function TNG(...fns) {
		fns = fns.map(function mapper(fn){
			return function tngf(...args) {
				if (buckets.has(tngf)) {
					let bucket = buckets.get(tngf);
					bucket.nextIdx = 0;
				}
				currentBucket.push(tngf);
				try {
					return fn.apply(this,args);
				}
				finally {
					currentBucket.pop();
				}
			};
		});
		if (fns.length < 2) return fns[0];
		return fns;
	}

	function getCurrentBucket() {
		if (currentBucket.length > 0) {
			let tngf = currentBucket[currentBucket.length - 1];
			let bucket;
			if (!buckets.has(tngf)) {
				bucket = { nextIdx: 0, slots: [], };
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
			throw new Error("Only use useState() inside of (or functions called from) TNG-wrapped functions.");
		}
	}

	function useReducer(reducerFn,initialVal,...initialReduction) {
		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this slot for this bucket?
			if (!(bucket.nextIdx in bucket.slots)) {
				let slot = [
					typeof initialVal == "function" ? initialVal() : initialVal,
					function updateSlot(v){
						slot[0] = reducerFn(slot[0],v);
					},
				];
				bucket.slots[bucket.nextIdx] = slot;

				// run the reducer initially?
				if (initialReduction.length > 0) {
					bucket.slots[bucket.nextIdx][1](initialReduction[0]);
				}
			}
			return [...bucket.slots[bucket.nextIdx++]];
		}
		else {
			throw new Error("Only use useReducer() inside of (or functions called from) TNG-wrapped functions.");
		}
	}
});
