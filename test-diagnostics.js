// Demo file to test Problems Panel
// This file intentionally contains items that will trigger diagnostics

// TODO: This is a todo comment that will show up in problems
// FIXME: This is a fixme comment

// Using console.log (will trigger warning)
console.log("This will trigger a warning");

// Using var instead of let/const (will trigger warning)
var oldStyleVariable = "Should use let or const";

// Using debugger statement (will trigger warning)
debugger;

// More console.log statements
console.log("Another console statement");
console.log("And another one");

// Normal code that won't trigger warnings
const properConstant = "This is fine";
let properVariable = 42;

function testFunction() {
  console.log("Console in function"); // Will trigger warning
  var localVar = "Should be let or const"; // Will trigger warning
  return localVar;
}

// Another TODO comment
// TODO: Refactor this function

export default testFunction;
