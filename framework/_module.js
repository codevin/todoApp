/**
 * Sample todo application for module-as-App in calipso.
 */
var rootpath = process.cwd() + '/',
  path = require('path'),
  url = require('url'),
  calipso = require(path.join(rootpath, "/lib/calipso"));

var _module = module.exports = function() {}

   // Called only during loading of this app, to register with calipso.
_module.register=function(app, baseUrl, depends, routeOptions) {

   if( baseUrl == undefined) throw "App needs baseURL '/app' to be registered.";

   // Register the app with calipso, as if it is its module. 
   app.init=this.init;
   app.route=this.route;
   app.depends=depends;
   app.routeOptions=routeOptions;

   // And store reference of app in the module.
   _module._app=app;
   _module._baseUrl=baseUrl;
   // And initialize some of the variables of the module from the app. 
};

_module.route=function(req,res,module,calipsoApp,next) {
   module.router.route(req,res,next);
}

_module.init=function(module,calipsoApp,next) {
   _module.module_name=module.name;
   
   // TODO: Load app templates, which might be in separate directory.
   // The module executing this is actually our app i.e. 'this'.
   var app=this;
   app.appInit();
   calipso.lib.step(
      function defineRoutes() {
         var methods=['GET','POST','PUT','DELETE'];
         for(i in methods) {
              var route=methods[i] +" "+ _module._baseUrl + "(/:subpath(*)?)?";
              module.router.addRoute(route, _module.routeWrapper, app.routeOptions, this.parallel());
         };
      },
      function done() {
         next();
      }
  );
}


/*
 * Evaluate all blocks and add to options array.
 */
function populateBlocks(req, res, blocks, options)
{
  blocks.forEach(function(item) {
     /* blocks are usually x.y within module. 
      * We want it to be usable as variable within the template.
      * so, we use: _module_x_y.
      */
     var arr=item.name.split('.');
     var blockName="_module";
     for(i in arr) blockName += '_' + arr[i] 
     req.helpers.getBlock(item.name, function(err, output){
        // convert names into usable names.
        options[blockName]=output; 
     });
  });
}

/*
 * Helper for use in Views to add base Url to urls.
 * Usage: <%= appUrl('/update/', id) %>
 */
function appUrl()
{
   var url=_module._baseUrl;
   for(i=0; i<arguments.length; i++) {
       url += arguments[i];
   }
   return url;
}


/*
 * Use within an existing template to return a string of the called template. 
 * Partial file should be in same templates directory.
 *
 * Also, we can include only upto 2 levels. We check for recursion, and point it out.  
 */
function partial(tmpl, options)
{
  var output;
  // return "<div>This is supposed to be partial.</div>"
  try {
     output=renderCompiledTemplate(this, tmpl, options);
  } catch(e) { 
     output="Failed to render partial: "+tmpl + " exception:"+e.toString();
     if ( typeof e.message != 'undefined' )  output+= " message:" + e.message;
     if ( typeof e.stack != 'undefined' )  output+= " Stack:" + e.stack;
  }
  return output;
}



/*
 * Get compiled module template, from '/templates' directory within 
 * the module.
 */
function renderCompiledTemplate(self, tmpl, options)
{ 
  var output;
  // Some of additional functionalities can be added into options here, and it will be available
  // to partials also.  
  if (typeof self.tmpl_recursion == 'undefined' ) self.tmpl_recursion = 0;
  self.tmpl_recursion++;
  if ( self.tmpl_recursion > 3) {
     throw "Recursion found in Template calls. Please check the template setup."; 
  }

  options.appUrl=appUrl; // Helper function.
  options.partial=partial; // Helper function.

  var module_templates=calipso.modules[_module.module_name].templates;
  if( module_templates ) {
     var template=module_templates[tmpl];
     if (typeof template === "function") {
           var output=template.call({}, options);
           self.tmpl_recursion--;
           return output; 
     }
     return "<div> ERROR!!! Template: " + tmpl +" failed compilation.</div>"; 
  }
  return "<div> ERROR!!! Template: " + tmpl +" not found in compiled template list.</div>"; 
}


/*
 * Render all sections in the layout, with their respective blocks.
 * Use 'all' to denote all blocks.
 */
function renderSections(req, res, app_res, next)
{
   // Theme should have been set using res.layout when you come here.
   var layout=getThemeLayout(res.layout);
   if (! layout) {
      layout=getThemeLayout('main');
      throw("renderSections(): Layout not defined : "+layout_name); 
   }

   var sections=[];
   for(section in layout.sections) {
      sections.push(section);
   }
   var sectionIterator=function(section, callback) {
      var content=app_res.content(section) || "<!-- [" + section + " is empty.] --!>";
      calipso.theme.renderItem(req, res, content, section, {}, callback); 
   };
   calipso.lib.async.map(sections, sectionIterator, function(err, result) {
       if(err) {
          calipso.error("Error rendering sections. msg:"+err.message + " stack: "+err.stack);     
          next(err);
       } else {
          next();
       }
  });
}

_module.routeWrapper=function(req, res, template, block, next) {

          // Parse URL and get (prop, value) pairs. 
      var subpath=req.moduleParams.subpath || "";
      if(subpath.charAt(0) != '/') subpath='/' + subpath;

      // We will retain req, but res is new type.
      var app_req={
          url:  subpath,
          method: req.method,
          headers: req.headers,
          body: req.body,
          httpVersion: req.httpVersion,
          session: req.session,
          helpers: req.helpers,
          params: req.helpers.getParams()
      };
      var app_res= {
        _stack: [],
        _blocks:[],
        _redirectPath: undefined,
        addBlock: function(module, block) {
           /* Use blocks created by other calipso modules. 
            * BUT they are created asynchronously, and not accessible here. 
            * TODO: Check 'depends' modeling.
            * 
            * Blocks are accessible within any of our templates using naming conversion as
            * follows: 'user.login' is accessed as '_module_user_login'. 
            *
            * They are populated using populateBlocks() and passed to layout engine 
            * before call to res.theme.render(). 
            */
           this._blocks.push({module:module, name:block, content:''});
        },
        render: function(tmpl, options, section) {
            var output;
            if ( !tmpl ) { output=options; options=null; } 
            else {
                options=options || {};
                populateBlocks(req, res, this._blocks, options); 
                output=renderCompiledTemplate(this, tmpl, options) || output;
            }
            section=section || 'body'; // add to body by default
            this._stack.push({section:section, output:output});
        },
        content: function(section) {
            var content="";
            section=section || 'all'; // show all contents by default.
            this._stack.forEach(function(i) { 
                  if( (section == 'all') || (section == i.section) ) {
                        if ( section == 'ajaxbody' ) {
                           // No comment decorations for ajaxbody section.
                           content += i.output; 
                        } else {
                           content += "<!-- render: section=" + section +"-->" 
                             + i.output 
                             + "<!-- render: end -->";
                        }
                  }
            });
            return(content);
        },
        writeHead: function() {
          throw("writeHead: Not yet implemented in appModule"); 
        },
        redirect: function(path) {
          this._redirectPath=path;
        },
        hasRedirect: function() {
          return(this._redirectPath);
        },
        end: function(){}
     };

     // 'this' is actually our app module.
     try {
         _module._app.appRoute(app_req, app_res, function(err){
              var redirect=app_res.hasRedirect();
              if(err) {
                   calipso.theme.renderItem(req, res, err, 'content', {}, next); 
              } else if ( redirect ) {
                   res.redirect(_module._baseUrl + redirect);
              } else {
                   res.layout=app_res.layout || 'main';
                   // populate all sections
                   renderSections(req, res, app_res, next);
                   // var content=app_res.content('body') || "No Output. :-(";
                   // calipso.theme.renderItem(req, res, content, 'body', {}, next); 
              }
           });
    } catch (ex) {
        err = "Module: "+_module.module_name + " Exception:" +  ex.toString();
        if (ex.message) err += "Message: " +ex.message;
        if (ex.stack) err += "Message: " +ex.stack;
        calipso.theme.renderItem(req, res, err, 'content', {}, next); 
    }
}


function getThemeLayout(layout)
{
   var layoutConfig=calipso.theme.config.layouts[layout];

   if(! (layoutConfig && layoutConfig.layout && layoutConfig.layout.sections)) {
      return null; 
   }
   return(layoutConfig.layout);
}


