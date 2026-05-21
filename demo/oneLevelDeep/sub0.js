console.log( `Executing sub0 "${document.currentScript.src}"` ); 
// "sub file:///C:/Users/153999/personal/gb_programming/!!_tests/testImport/sub.js"

console.log('_import("./subs/sub2.js") CALLED FROM sub0.js' )

if (_import) {
	_import('./subs/sub2.js'); // load a file from sub-folder
}