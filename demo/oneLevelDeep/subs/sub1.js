console.log( `Executing sub1 "${document.currentScript.src}"` ); 

console.log('_import("./sub2.js") CALLED FROM sub1.js' )
if (_import) {
	_import('./sub2.js'); // import a file from same folder
}