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

	function initializeSlot(bucket,slot,initialVal,updateSlotFn) {
		slot[0] = typeof initialVal == "function" ? initialVal() : initialVal;
		slot[1] = updateSlotFn;
		bucket.slots[bucket.nextIdx] = slot;
	}

	function useState(initialVal) {
		var bucket = getCurrentBucket();
		if (bucket) {
			// need to create this slot for this bucket?
			if (!(bucket.nextIdx in bucket.slots)) {
				let slot = [];
				initializeSlot(bucket,slot,initialVal,function updateSlot(vOrFn){
					slot[0] =
						typeof vOrFn == "function" ?
						vOrFn(slot[0]) :
						vOrFn;
				});
			}
			return [...bucket.slots[bucket.nextIdx++]];
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
				let slot = [];
				initializeSlot(bucket,slot,initialVal,function updateSlot(v){
					slot[0] = reducerFn(slot[0],v);
				});
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
