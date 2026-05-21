# js_import
Pure javascript function to partially replicate ES6 import(..) function
=======================================================================

The code here is a pure Javascript partial alternative to the ES6 `import` function and the legacy `require` function. In addition, there is a set of files that demostrate how the alternative import function works.

*   It bypasses ES6 Cross-Origin Resource Sharing (CORS) limitations, which block importing local files on the file:// protocol.
*   Relative pathnames for imported files are relative to the file where the import function is called. This allows for master .js files to directly import subordinate files, decoupling from the base URL of the parent HTML file.
*   It works for .js and .css files.
*   It allows for conditional imports, and unlike `require` does not depend on a return value.
*   It loads all target files _globally_ so is unlike more elaborate importers that impose scoping.

Abstract
--------

*   The initialising function returns the importer function.
*   The effect of the importer function is to create a `<link href=...>` or `<script src=...>` block, which the browser will then populate.
*   Loaded scripts/stylesheets are inserted in the `<head>` block of the main HTML file.
*   The filename extension of the import (.js or .css) controls which type of HTML block is created.
*   Due to requirements of the HTML specification, other file types (like json) cannot be loaded by a browser using this technique. The code here posts an error message to the console if an invalid filetype is requested.
    > "When used to include _data_ blocks, the data must be embedded _inline_, ..." [HTML 4.12.1 The script element (2026)](https://html.spec.whatwg.org/multipage/scripting.html#script)
    

Operations — calling the importer function
------------------------------------------

*   The `path` parameter can be absolute, or relative to the file that the function is called from.
*   Multiple attempts to load the same file are resolved so that only one copy is loaded.
*   Multiple files can be imported in a single call to the import function
*   The simplest parameter is a string containg a file URL.
*   The extended parameter is an object with {url:"filepath",
*   attributes{html keys->values}, handler:function}
    *   url is required
    *   attributes is optional, and can be used to inject HTML attributes, e.g. {id:"block1"}
    *   handler is optional. This function will be passed an object when the file specified by "url" either loads or fails to load.

### Examples

```
// early in execution, maybe in a script block in the head of the main HTML file  
const _import = (function(globalResultFn=null) { .../* the rest of the code here */ })();   
...   
// somewhere, maybe in a .js file  
if (_import) {  
   _import( "/helpers/debug.css", "./lib/mocks.js" );  
}  
...   
if (_import) {   
    _import( {  
         url  : '../global/rendering.js'       
       , attributes : {id:"q17","data-source":"global"}   
       , handler  : (result) => {if (result.status==="fulfilled") {runDependantScript();}}       
    } );   
};
```  
			

Operations — results from a call to the importer function
---------------------------------------------------------

*   The API provides two opportunities for script to intercept results of calls to the importer function.
    *   Passing a function in the `handler:` attribute of the extended parameter for a single file passed to the importer. This will be run when an attempt to load a single file is resolved.
    *   Passing a function to the constructor function. This will be called once for every call to the importer, i.e. will be called once even when the call to the importer passes multiple files.
*   All the handlers will receive an object for each requested file. `{file:[full url of file requested], caller:[url of what file had the import call], status:"rejected"|"fulfilled"}`
*   The extended parameter handler is passed a single object. The global/constructor handler is passed an array of objects.
*   There will be an additional flag in a "fulfilled" result object if the same file is already queued to load: `isDuplicate=true`. Note that the first request for that file may still be "rejected". The `isDuplicate` flag is a warning that the result is conditional on the earlier request.

### Example — object received by optional handler in extended parameter

```
{  
  "file": "http://127.0.0.1:8086/subs/template.html.txt"
, "caller": "http://127.0.0.1:8086/index.htm"
, "status": "rejected" 
}
```

### Example — array received by optional global handler

```
[     
{      
    "status": "fulfilled"
    , "value": { 
        "file": "https://code.jquery.com/jquery-4.0.0.min.js"
        , "caller": "http://127.0.0.1:8086/init.js"
        , "status": "fulfilled"
        }     
}   
,{      
    "status": "rejected"
    , "reason": {
        "file":"file://myWebsite/oneLevelDeep/no_such.js"
        , "caller": "file://myWebsite/oneLevelDeep/sub0.js"
        , "status": "rejected"      
        }     
} 
]
```

Things to note
--------------

*   If a web server is configured to have the index.html at the root level, calling the importer function with a relative URL in the _parent_ folder (../filename) will fail, because the server can't serve files outside its root folder.
*   The `caller:` attribute in result objects will be what is shown in the `location` input of the browser. So, if the location is just a folder name with no file at the end, and the main HTML file is loaded by default (e.g. the server serves `index.html` if the request is just for a path), then the `caller:` attribute will not include the final "index.html"

Running the demonstration
-------------------------

Open the console in the developer tools menu to see the trace output.

There are 4 types of messages in the console.

*   "\_import(..)" at the point the \_import function is called. These are there purely for demonstration purposes.
*   "Loaded/Failed to load/Queued" messages generated by handlers in the \_import(..) function, which are channeled to handlers.
*   "Executing" messages embedded in the sub files showing when the script is run. These are there purely for demonstration purposes.
*   Standard error messages generated by the browser. "Loading failed..." and "GET" 404 errors for attempts to load non-existent files. These will have corresponding "rejected" results generated by the importer function.
