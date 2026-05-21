	/**
	 * @author Glen Byram
	 * @constructor
	 * @public
	 * @summary This constructor function creates a global function, to
	 * load external files (.js, .css) on demand. Recommended name "_import(..)"
	 * @description IIFE to create an _import(url) method. The url can be absolute or 
	 * relative. Relative paths are resolved relative to the file that calls _import(..),
	 * NOT relative to the main HTML file.
	 * Warning: relative paths with "../" will fail if the parent is above the root of the 
	 * server path.
	 * By default, the method will post success (Promise.resolve) messages to console.log, 
	 * and failures (Promise.reject) to console.warn. The global handlers can be exented 
	 * in the constructor.
	 * @param {function|false} successFn - override for default handler when files are loaded
	 * @param {function|false} failFn - override for default handler when files fail to load
	 * - if null is passed, the default is used.
	 * - if false is passed, nothing is called on resolve &/or reject
	 * - successFn :: Array of {string url}, caller: {string url}, isQueued? {boolean} } => null
	 * - failFn    :: Object {string url}, caller: {string url} } => null
	 * @example of usage
	 * create: 	const [yourObjectName] = (function(successFn,failFn) {.... // as below
	 * apply:	if ([yourObjectName]) {[yourObjectName]( "myScript.js", "./other.json", "https:a.com/style.css") }
	 * */

const _import = (function(globalResultFn=null) {
	/**
	 * @public
	 * @summary This is the function returned by the constructor.
	 * @param {Array of {String}} urlStrings - absolute or relative path to file to be loaded
	 * @returns {Array of {Promise}} - one promise for each input URL
	 * */
	const importFunction = (...urlStrings) => {
		const resultPromises = urlStrings.map( _promiseImportOneFile );
		Promise.allSettled( resultPromises ) 
			.then( _allHandler );  // allSettled will post array of {status:__, value:__}
			return resultPromises; // Maybe this is useless? Not up to me :)
	} // importFunction(...)

	  /**
	   * @private
	   * @summary A list of the absolute URLs corresponding to calls to the main import function.
	   * */
	const _urlsImported = []; // the state variable for this object

	  /**
	   * @private
	   * @summary Intercepts results from any resolved call to the main import function.
	   * If another handler was passed to the constructor, this function will be called first
	   * followed by the other handler.
	   * */
	const _default_allHandler = (resultArray) => { 
			resultArray.forEach( (result ) => {
				if (result.status === "fulfilled") {
					const value = result.value;
					console.log(`${value.isDuplicate?'Queued':'Loaded'} ${value.file}` )
				} else {
					const value = result.reason;
					console.log(`Failed to load ${value.file} imported by ${value.caller}`)
				}
			}) 
	}; // _default_allHandler

	  /**
	   * @private
	   * @summary Intercepts results from any resolved call to the main import function.
	   * */
	const _allHandler = ( globalResultFn )
		? ( (arg) => {_default_allHandler(arg);globalResultFn(arg);} )
		: _default_allHandler;


	  /**
	   * @private
	   * @summary Loads target JS file into <head> of HTML file & executes it.
	   * @param urlOfTarget {string} - Relative or absolute URL of JS file to load
	   * @returns {Promise} - resolve=loadState complete or loaded, reject otherwise
	   * - the Object passed to resolve or reject: 
	   *     {file: {string url}, caller: {string url}, isQueued? {boolean} }
	   * @description
	   * - converts @urlOfTarget to absolute path FROM THE FILE containing the _import(..)
	   * - checks if the same file is already in the queue. If so, triggers resolve() with isQueued:true
	   * - performs async load of target file to the end of the <head> element 
	   * */
	const _promiseImportOneFile = (urlOfTargetTextOrObject) => new Promise(
			(resolve, reject) => {
				// Gotcha: if called from an eventListener, currentScript is null. 
		  		// If calling script is inline in the html doc, will be <script> with .src =""

				let attributes 		= null;
				let nextHandler     = null;
				let urlOfTargetText;

				if (typeof urlOfTargetTextOrObject === "string") {
					urlOfTargetText = urlOfTargetTextOrObject;
				} else {
					urlOfTargetText = urlOfTargetTextOrObject.url;
					attributes 		= urlOfTargetTextOrObject.attributes;
					nextHandler     = urlOfTargetTextOrObject.handler;
				}

				const  urlOfCallingScript = 
				(!document.currentScript || document.currentScript.src === "" )
				? window.location.href
				: document.currentScript.src;

			// is it an absolute path?
				const urlOfTarget =  
					( urlOfTargetText.match(/^[A-z]+:\/\//) ) // is protocal substring at start?
					? new URL(urlOfTargetText)
					: new URL(urlOfTargetText, urlOfCallingScript );
			// get text parts of URL
					const absoluteHrefOfTarget 	= urlOfTarget.href;
					const pathnameTail 			= urlOfTarget.pathname.match( /(?<=[.])[A-z]+$/)[0].toLowerCase();

		  	// base of passed to .then .catch .finally and handler
					const resultObj = {file: absoluteHrefOfTarget, caller: urlOfCallingScript};
		  	// prevent re-loading something in the queue already
					if (_urlsImported.includes(absoluteHrefOfTarget)) {
				resultObj.isDuplicate = true; // add extra field to result object
				resolve(resultObj);
				return; 
			}


		  	// construct DOM element to go into HTML <head>
			const domHeadElement 	= _makeDomContainer(pathnameTail, absoluteHrefOfTarget );
			if (!domHeadElement) {
				resultObj.status = "rejected";
				if (nextHandler) {
					nextHandler( resultObj )
				}
				reject(resultObj);
			}

			// if not already loading, add this URL to the list of loading.
			_urlsImported.push( absoluteHrefOfTarget );

			if (attributes) {
				Object.entries(attributes).forEach( ([key,value]) => {
					domHeadElement.setAttribute( key, value );
				});
			}

			domHeadElement.onerror = (event) => { 
				resultObj.status = "rejected";
				if (nextHandler) {
					nextHandler( resultObj )
				}
				reject(resultObj);
			} 

			// set listener, to notify completion
			domHeadElement.onload = domHeadElement.onreadystatechange = function() {
				const loadState = this.readyState;
				// ignore notifications unless for a final state
				if (loadState && loadState !== 'loaded' && loadState !== 'complete') {
					return;
				}
				domHeadElement.onload = domHeadElement.onreadystatechange = null; // clear the onload handlers
				resultObj.status = "fulfilled";			
				if (nextHandler) {
					nextHandler( resultObj )
				}
				resolve(resultObj);
			}
			document.head.appendChild(domHeadElement); // this will send a warning to console if file not found.
		});//_promiseImportOneFile


	  	/**
	  	 * @private
	  	 * @summary Creates an HTML DOM object with type matching @filetype and src/href = @url
	  	 * @param {String} filetype - "js" | "css" | other, eg. "txt", "json"
	  	 * @param {String} url - url to be put in the src or href attribute of the result
	  	 * @returns {DOM object} - an element to be added to &lt;head&gt; of html document
	  	 * */
		const _makeDomContainer = (filetype, url) => {
			let result;
			switch (filetype) {
			case "js" :
				result 	= document.createElement("script"); 
					// .type    = 'text/javascript'; is not needed in HTML5
					result.async 	= true;  // just an attribute with no value
					result.src 		= url;
					break;
				case "css" :
					result 	= document.createElement("link");
					result.href = url;
					result.rel = "stylesheet";
					result.type = "text/css";
					break;
				default : 
					console.error( `The file "${url}" cannnot loaded in an html element with the src or href tag, due to browser security for "${filetype}" files.`)
				}
				return result;
		}//_makeDomContainer(..)

	  return importFunction; // returns the single point of contact
})(  (r) => console.log(r) ); 
// This one parameter is optional. It will be called on every settling of Promises to import file/s.
