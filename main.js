var language = brackets.getLocale().substr(0,2);

define(function(require, exports, module) {
     "use strict";
 
    var KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
    EditorManager = brackets.getModule("editor/EditorManager"),
    DocumentManager = brackets.getModule("document/DocumentManager"),
    ExtensionUtils = brackets.getModule("utils/ExtensionUtils");

    var ExtPath = ExtensionUtils.getModulePath(module);
    
    // Extension modules
    var InlineDocsViewer = require("InlineDocsViewer");
 
    
    function inlineProvider(hostEditor, pos) {
        // get editor content
        var currentDoc = DocumentManager.getCurrentDocument().getText();
       
        // get programming language
        var langId = hostEditor.getLanguageForSelection().getId();
        
        // Only provide docs when cursor is in php ("clike") content
        if (langId !== "php" && langId !== "clike" ) {
            return null;
        }
        
        // no multiline selection
        var sel = hostEditor.getSelection();
        if (sel.start.line !== sel.end.line) {
            return null;
        }
        
        // get function name
        var func_name = get_func_name(currentDoc,sel.start);
        
        // if a function was selected
        if (func_name) {
            // Initialize the Ajax request
            var xhr = new XMLHttpRequest();
            // I will add French and Spanish
            // if the language isn't available => use English
            if (language != "en" && language != "de") {
             language = "en";   
            }
            // open json file (synchronous) 
            xhr.open('get', ExtPath+'docs/'+language+'/php.json', false);
            
            // Send the request 
            xhr.send(null);
            
            
            if(xhr.status === 0){
                // function information is available
                var tags = JSON.parse(xhr.responseText);
                tags = eval('tags.'+func_name);
                if (tags.s != "" || tags.p) {
                    var summary = tags.s;
                    // check if function has parameters
                    if (tags.p) { 
                        var parameters = tags.p;
                    } else {
                        var parameters = eval("[{}]");   
                    }
                
                    var result = new $.Deferred();
                    var inlineWidget = new InlineDocsViewer(func_name,{SUMMARY:summary, URL:func_name, VALUES:parameters});
                    inlineWidget.load(hostEditor);
                    result.resolve(inlineWidget);
                    return result.promise();
                }
            }
        } 
        return null;
    }
    
    function get_func_name(content,pos) {
        // get the content of each line
        var lines = content.split("\n");
        // get the content of the selected line
        var line = lines[pos.line];
        // get string after current position
        var line_after = line.substr(pos.ch);
        // get string before current position
        var line_begin = line.substr(0,pos.ch);
        // reverse the string before current position
        var line_begin_rev = reverse(line_begin);
        
        
        // characters which can be part of a function name
        var function_chars = '0123456789abcdefghijklmnopqrstuvwxyz_';
        
        var e = 0;
        while (function_chars.indexOf(line_after.substr(e,1).toLowerCase()) !== -1 && e < line_after.length) {
            e++;
        }
        
        var b = 0;
        while (function_chars.indexOf(line_begin_rev.substr(b,1).toLowerCase()) !== -1 && b < line_begin_rev.length) {
            b++;
        }

        // characters which can't be directly before the function_name
        var no_function_chars = '0123456789$';
        if (no_function_chars.indexOf(line_begin_rev.substr(b,1)) === -1 || b == line_begin_rev.length) {
            var func_name = line.substr(pos.ch-b,b+e);
            return func_name;
        }
 
        return null;
    }
    
    
    // reverse a string
    function reverse(s){
        return s.split("").reverse().join("");
    }
    
    
    
    EditorManager.registerInlineDocsProvider(inlineProvider); 
});