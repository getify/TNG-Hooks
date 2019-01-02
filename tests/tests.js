"use strict";

QUnit.test( "API", function test(assert){
	assert.expect( 5 );

	assert.ok( _isFunction( TNG ), "TNG()" );
	assert.ok( _isFunction( useState ), "useState()" );
	assert.ok( _isFunction( useReducer ), "useReducer()" );
	assert.ok( _isFunction( useEffect ), "useEffect()" );
	assert.ok( _isFunction(useMemo), "useMemo()" );
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

QUnit.test( "useReducer(..)", function test(assert){
	function foo() {
		var [x,increaseX] = useReducer( function computeNewX(prevX,val){ return prevX + val; }, -2 );
		var [y,setY] = useState(-1);
		var [z,increaseZ] = bar();

		increaseX(3);
		setY(y += 3);
		increaseZ(3);

		return `foo ${x} ${y} ${z}`;
	}

	function bar() {
		return useReducer( function computeNewZ(prevZ,val){ return prevZ + val; }, -2, 2 );
	}

	var rExpected = "foo -2 2 0";
	var pExpected = "foo 1 5 3";
	var qExpected = "foo 4 8 6";
	var tExpected = "error";

	foo = TNG(foo);

	var rActual = foo();
	var pActual = foo();
	var qActual = foo();
	try {
		var tActual = bar();
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

QUnit.test( "useEffect(..)", function test(assert){
	function foo(x,y,...rest) {
		var [count,updateCount] = useState(0);
		updateCount(++count);

		baz();	// "three"
		useEffect(function four(){
			assert.step("four");
			if (rest.length === 1) {
				return function eight(){
					assert.step("eight");
				};
			}
		});
		useEffect(function five(){
			assert.step("five");
		},[x,y]);
		useEffect(function six(){
			assert.step("six");
		},...rest);
		useEffect(function seven(){
			assert.step("seven");
		},rest);

		assert.step(`one: ${count}`);
		bar();	// "two"
	}

	// Articulated Function
	function bar() {
		useEffect(function two(){
			assert.step("two");
		});
	}

	// Custom Hook (not Articulated Function)
	function baz() {
		useEffect(function three(){
			assert.step("three");
		},[]);
	}

	// also not Articulated Function
	function bam() {
		assert.step("yep");

		useEffect(function nope(){
			assert.step("nope 2");
		});

		return "nope 1";
	}

	var rExpected = [
		"one: 1",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"----",
		"one: 2",
		"two",
		"eight",
		"four",
		"six",
		"seven",
		"-----",
		"one: 3",
		"two",
		"four",
		"five",
		"------",
		"-------",
		"one: 1",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven",
		"--------",
		"eight",
		"yep",
	];
	var pExpected = "error";

	[foo,bar] = TNG(foo,bar);

	// var rActual;
	foo(3,4,7);
	assert.step("----");
	foo(3,4,7,8);
	assert.step("-----");
	foo(4,5,7,8);
	assert.step("------");
	foo.reset();
	assert.step("-------");
	foo(3,4,7);
	assert.step("--------");
	foo.reset();
	foo.reset();

	try {
		var pActual = bam();
	}
	catch (err) {
		var pActual = "error";
	}

	assert.expect( 33 ); // note: 2 assertions + 31 `step(..)` calls
	assert.verifySteps( rExpected, "check conditional effects" );
	assert.strictEqual( pActual, pExpected, "call without TNG wrapping context" );
} );

QUnit.test("useMemo(..)", function test(assert) {
	function foo(item, rest) {
		return useMemo(function memoized() {
			return item;
		}, rest);
	}

	function baz(item, rest) {
		return useMemo(function memoized() {
			return item;
		}, rest);
	}

	var pExpected = "error";

	foo = TNG(foo);

	const itemA = {item: 'A'}
	const itemB = {item: 'B'}
	const itemC = {item: 'C'}
	const itemD = {item: 'D'}
	const itemE = {item: 'E'}
	const itemF = {item: 'F'}

	assert.expect(9);

	assert.strictEqual(foo(itemA), itemA, "useMemo(itemA) === itemA");
	assert.strictEqual(foo(itemB, [1]), itemB, "useMemo(itemB) === itemB");
	assert.strictEqual(foo(false, [1]), itemB, "useMemo(false) === itemB (again)");
	assert.strictEqual(foo(itemC, [2]), itemC, "useMemo(itemC) === itemC");
	assert.strictEqual(foo(false, [2]), itemC, "useMemo(false) === itemC (again)");
	assert.strictEqual(foo(itemD, [3]), itemD, "useMemo(itemD) === itemD");
	foo.reset();
	assert.strictEqual(foo(itemE, [3]), itemE, "useMemo(itemE) === itemE");
	assert.strictEqual(foo(itemF, []), itemF, "useMemo(itemF) === itemF");

	try {
		var pActual = baz();
	} catch (err) {
		var pActual = "error";
	}

	assert.strictEqual(pActual, pExpected, "call without TNG wrapping context");
});

QUnit.test( "use hooks from custom hook", function test(assert){
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
