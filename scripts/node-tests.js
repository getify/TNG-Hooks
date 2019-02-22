#!/usr/bin/env node

var path = require("path");

/* istanbul ignore next */
if (process.env.TEST_DIST) {
	let o = require(path.join("..","dist","tng-hooks.js"));
	Object.assign(global,o);
}
/* istanbul ignore next */
else if (process.env.TEST_PACKAGE) {
	let o = require(path.join(".."));
	Object.assign(global,o);
}
else {
	let o = require(path.join("..","src","tng-hooks.src.js"));
	Object.assign(global,o);
}

global.QUnit = require("qunit");
global.sinon = require('sinon');

require("../tests/qunit.config.js");
require("../tests/tests.js");

QUnit.start();
