(function UMD(definition){
	/* istanbul ignore next */if (typeof define === "function" && define.amd) { define(definition); }
	/* istanbul ignore next */else if (typeof module !== "undefined" && module.exports) { module.exports = definition(); }
	/* istanbul ignore next */else { Object.assign(context,definition()); }
})(function DEF(){
	"use strict";

	var buckets = new WeakMap();
	var currentBucket = [];

	return { TNG, useState, };


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

	function useState(defVal) {
		if (currentBucket.length > 0) {
			let tngf = currentBucket[currentBucket.length - 1];
			let bucket;
			if (!buckets.has(tngf)) {
				bucket = { nextIdx: 0, slots: [], };
				buckets.set(tngf,bucket);
			}
			bucket = buckets.get(tngf);
			if (!(bucket.nextIdx in bucket.slots)) {
				let slot = [
					typeof defVal == "function" ? defVal() : defVal,
					function updateSlot(vOrFn){
						slot[0] =
							typeof vOrFn == "function" ?
							vOrFn(slot[0]) :
							vOrFn;
					}
				];
				bucket.slots[bucket.nextIdx] = slot;
			}
			return [...bucket.slots[bucket.nextIdx++]];
		}
		else {
			throw new Error("Only use useState() inside of (or functions called from) TNG-wrapped functions.");
		}
	}
});
