"use strict";

QUnit.test( "API", function test(assert){
	assert.expect( 2 );

	assert.ok( _isFunction( TNG ), "TNG()" );
	assert.ok( _isFunction( useState ), "useState()" );
} );

QUnit.test( "TNG(..)", function test(assert){
	function foo(x,y) { return `foo ${x} ${y}`; }
	function bar(x,y) { return `bar ${x} ${y}`; }
	function baz(x,y) { return `baz ${x} ${y}`; }

	var rExpected = "foo 1 2";
	var pExpected = "bar 3 4";
	var qExpected = "baz 5 6";

	foo = TNG(foo);
	[bar,baz] = TNG(bar,baz);

	var rActual = foo(1,2);
	var pActual = bar(3,4);
	var qActual = baz(5,6);

	assert.expect( 3 );
	assert.strictEqual( rActual, rExpected, "single function wrap: foo" );
	assert.strictEqual( pActual, pExpected, "multiple function wrap: bar" );
	assert.strictEqual( qActual, qExpected, "multiple function wrap: baz" );
} );

QUnit.test( "useState(..)", function test(assert){
	function foo() {
		var [x,setX] = useState(-2);
		var [y,setY] = useState(function negOne() { return -1; });

		setX(x += 3);
		setY(y += 3);
		var z = bar();

		return `foo ${x} ${y} ${z}`;
	}

	function bar() {
		var [z,setZ] = useState(0);
		z += 3;
		setZ(z => z + 3);
		return z;
	}

	function baz() {
		var [z,setZ] = useState(0);
		return "oops";
	}

	var rExpected = "foo 1 2 3";
	var pExpected = "foo 4 5 6";
	var qExpected = "foo 7 8 9";
	var tExpected = "error";

	[foo,bar] = TNG(foo,bar);

	var rActual = foo();
	var pActual = foo();
	var qActual = foo();
	try {
		var tActual = baz();
	}
	catch (err) {
		var tActual = "error";
	}

	assert.expect( 4 );
	assert.strictEqual( rActual, rExpected, "initial call: foo" );
	assert.strictEqual( pActual, pExpected, "second call: foo" );
	assert.strictEqual( qActual, qExpected, "third call: foo" );
	assert.strictEqual( tActual, tExpected, "call without TNG wrapping context" );
} );

QUnit.test( "useState(..) in custom hook", function test(assert){
	function foo() {
		var [x,setX] = useState(-1);
		var y = baz(0);

		setX(x += 2);

		return `foo ${x} ${y}`;
	}

	function bar() {
		var [x,setX] = useState(9);
		var y = baz(10);

		setX(x += 2);

		return `bar ${x} ${y}`;
	}

	function baz(origY) {
		var [y,setY] = useState(origY);
		setY(y += 2);
		return y;
	}

	var rExpected = "foo 1 2";
	var pExpected = "bar 11 12";
	var qExpected = "foo 3 4";
	var tExpected = "bar 13 14";

	[foo,bar] = TNG(foo,bar);

	var rActual = foo();
	var pActual = bar();
	var qActual = foo();
	var tActual = bar();

	assert.expect( 4 );
	assert.strictEqual( rActual, rExpected, "initial call: foo" );
	assert.strictEqual( pActual, pExpected, "initial call: bar" );
	assert.strictEqual( qActual, qExpected, "second call: foo" );
	assert.strictEqual( tActual, tExpected, "second call: bar" );
} );




function _hasProp(obj,prop) {
	return Object.hasOwnProperty.call( obj, prop );
}

function _isFunction(v) {
	return typeof v == "function";
}

function _isObject(v) {
	return v && typeof v == "object" && !_isArray( v );
}

function _isArray(v) {
	return Array.isArray( v );
}
