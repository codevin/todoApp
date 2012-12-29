var path = require('path'),
    rootpath = process.cwd() + '/',
    calipso = require(path.join(rootpath, "/lib/calipso"));


module.exports = views = {};

/*
 * Helper class for Views. All views, implemented in respective classes, should directly export their 
 * methods to router.
 *
 * Helper classes and View Spec structure, Used by these helper routines:
 *
 * generic_view() - performs all the below.
 * Or, individually call:
 * validate_params(): 
 * model_query():
 * render():
 *
 */



/*
 * view(self, view_specs, args, next)
 *
 * Given a set of view specifications,  use a standard approach to 
 * (1) validate parameters, (2) Do one or more model queries asynchronously, (3) Prepare and send 
 * the results to renderer.
 *
 * Parameters:
 * self: router object (from director).
 * view_specs: view specificaions. See below.
 * args.session, args.params, args.view_props: Inputs to view from Session, URL params and View caller respectively. 
 *  
 * view_specs should come from one of the view models, and should have structure like this:
 * {
 *   param_specs: // see validate_params documentation.
 *   param_modifiers: {} // see validate_params documentation.
 *   pre_modelquery_fn(err, args, function(err){} )...  
 *             // Function called just before modelqueries are executed. 
 *             // It can modify/introduce the paramters in args
 *   modelqueries: {} // refer to db/ for each model's model queries.
     args.view_specs.pre_render_fn(err, args, function(err) {...}); 
               // Function called just before render_specs, and which can handle final render itself. 
 *   render_specs: // refer to render() documentation. 
 * }
 *
 */
views.view=function(self, view_specs, args, next) 
{
   var step;
   args.view_specs=view_specs;
   args.step_loc="Start of view rendering.";

   calipso.lib.step(
       function() {     // First validate params.
           step=this;
           args.step_loc="Calling validate params.";
           views.helper_validate_params(args.view_specs.param_specs, args.view_specs.param_modifiers, args.params, args, function(err, q, q_preserved) {
               args.q_preserved=q_preserved; args.q=q;
console.dir(args);
               step(err, args); 
           });
       },
       function(err, args) { // Intercepter, for use in specs.
           if(!err) args.step_loc="Calling pre_modelquery_fn..";
           if(args.view_specs.pre_modelquery_fn) {
                // Note: next(err).  
                view_specs.pre_modelquery_fn(err, args, function(err){ step(err, args); });
           } else {
                step(err, args); 
           }
       },
       function(err, args) { // modelquery call. 
           if(!err) args.step_loc="Calling modelqueries..";

           // If there is error, create empty model_results for next function. 
           if( err ) { args.model_results={}; step(err, args); return; };

           views.helper_modelquery(args.view_specs.modelqueries, args, function(err, model_results) { 
                                       args.model_results=model_results; 
                                       step(err, args);
                                   });
       },
       function(err, args) { // pre_render_fn.
           if(!err) args.step_loc="Calling pre_render_fn..";
           if(args.view_specs.pre_render_fn) {
               args.view_specs.pre_render_fn(err, args, function(err) { step(err, args); });
           } else {
              step(err, args); 
           }
       }, 
       function(err, args) {
         if(err && args==null) {
            // It is a exception throw. Handled by last function.
            step(err); return; 
         }
         var results={err: err, err_loc:args.step_loc, q:args.q_preserved, q_modified:args.q, viewdata: args.model_results};
         if ( args.view_specs.render_fn) {
               args.step_loc="Calling render_fn ...";
               view_specs.render_fn(self, err, results, next);    

         } else if ( args.view_specs.render_specs ) {         
               args.step_loc="Calling render...";
               views.render(self, view_specs.render_specs, err, results, next);
               // next was taken care of in render itself.
         } else {
               // Just return the results if there is no render specs.
               args.step_loc="No rendering, Calling next() of view.";
               if (next) next(err, results);
         }
       },
       function (err) {
         // If control comes here, it is usually because of throw within step.
         if(err) {
               console.log("System Error during view. err, args follow.");
               console.dir(err);
               console.dir(args);
               views.render_error(self, "system error", err, "back", "Home: /");
               self.next();
         }
       }
   );
}

/*
 * render(self, render_specs, error, results, function(err, results){...}) 
 * Render results using template, or redirect. Handle both success and error conditions.
 *
 *  render_specs: Render specifications - see below.
 *  error: Error (usually a string), created somewhere along the processing workflow.
 *  results: Results created during workflow, typically during modelqueries.
 *  next: continuation.
 *
 * render_specs format:
 * { success: { template: template, // Render a Template, OR
 *              [section: 'section']  // Into section 'section'.
 *               // OR:
 *              redirect: url,  // Render a redirect.
 *   }, 
 *   error: { response: 'error' or 'error_in_template' or 'redirect' ,
 *            redirect: url  // If response: redirect.
 *   }
 *}
 * 
 * Also see render_error() for exercising error display.
 *
 */
views.render=function(self, render_specs, error, results, next)
{
   // Decide the final resolution, and then execute it.. 
   var error_handled;
   var error_specs=render_specs.error;
   var success_specs=render_specs.success;

   var do_redirect=null; var do_template=null;
   if (error) {
       switch ( error_specs.response ) {
         case 'template': 
         case 'error_in_template': 
                   if(error_specs.error_in_template) {
                      if ( ! results ) results={};
                      results.error=error;
                      self.res.render(do_template, results);
                   } else {
                      views.render_error(self, "error", error, "back", "Home: /");
                   }
                   // handled error becomes third param.
                   if(next) next(null, results, error); 
                   break;

         case 'redirect': 
                   // Error object can construct a redirect URL also.
                   if ( error && error.redirect ) do_redirect = error.redirect;
                   else do_redirect=error_specs.redirect;
                   self.res.redirect(do_redirect);
                   // handled error becomes third param.
                   if(next) next(null, results, error); 

         case 'default':  // No specs input given.
                   views.render_error(self, "error", error, "back", "Home: /");
                   // handled error becomes third param.
                   if(next) next(null, results, error); 
                   break;
       }
   } else {
        // Use success.
       if( success_specs.template ) { 
console.dir("In render-template. template="+success_specs.template);
                   var template=success_specs.template;  // If defined. Otherwise remains null.
                   self.res.render(template, results);
                   next(null, results);

       } else  if( success_specs.redirect )  { 
console.dir("In render-redirect. redirect="+success_specs.redirect);
                   do_redirect=success_specs.redirect;
                   self.res.redirect(do_redirect);
                   next(null, results);
       } else {
                   next(null, results);
       }
   }
}

/*
 * render_error(self, level, message, nexturl1, nexturl2, nexturl3)
 * Render message using system standard error/warning template. 
 *
 * level: Error/warning type. (Currently treated as string.)
 * message: Error message.
 * nexturl1/2/3: Display these in the UI as alternative to go to next.
 *
 * nextUrl format: "ShortMsg: url".  For e.g. "Home: /". 
 * Special case: 'back' renders going to previous page.  (TODO).
 *
 */
views.system_error_template='mm-warning-message';
views.render_error=function(self, level, message, nexturl1, nexturl2, nexturl3)
{
   options={};
   options.level=level;
   options.message=message;
   function createUrl(nexturl) {
      var url={};
      if( nexturl == undefined) return(undefined);
      if( nexturl=='back')   {
          url.text="Back";
          url.a="history.back();"; 
      } else {
          if( (r=nexturl.match(/^([a-zA-z0-9 ]+): (\/.*)$/) )) {
              url.text=r[1];
              url.a=r[2];
          } else if ( (r=nexturl.match(/(\/.*)$/)) ) {
              url.text="OK";
              url.a=r[1];
          } else {
              return undefined;
          } 
      }
      return url;
   }
   options.url1=createUrl(nexturl1);
   options.url2=createUrl(nexturl2);
   options.url3=createUrl(nexturl3);
   self.res.render(views.system_error_template, options); 
}


/*
 * validate_params(): Given params (typically from URL) check if they have mandatory params, and use 
 * override params to override some of the param values.. 
 *
 * And for all params, as per options specified, do conversions as documented below.
 *
 * param: param_specs: required, optional, default and override params list from view model.
 *   param_specs: {
 *           required: {'url', 'title',...}, 
 *           optional: {...} // process these for url transformations.
 *           valid:{...},  // Optional. If you list all valid fields, all other info will be dropped. For use in POST.
 *           overrideFn:function(args){}, defaults:{} 
 *   }
 * param: Either supply form or view, which has been predefined in schema.
 * param: params - URL params which need to be verified.
 * param: session, view_props - variables coming in from session and caller. 
 * param: options: optional transformations: 
 *     '_and_regexp': 'param' - Replace this param with AND regular 
 *                                 expression search of all its words.
 *     'decode_uri': set to non-null -  Do URL decode. 
 *     'verify_url_param': 'param' - verify that param is URL, and otherwise fail it. 
 *     'default_nexturl': 'param' - use this as default next url. 
 *
 * if next() is not defined, return a key-value pair. 
 */
views.helper_validate_params=function(param_specs, param_modifiers, params, args, next) 
{
      var err="";
      var q_preserved={}, q={};

      param_modifiers=param_modifiers || {};
      schemas.copy_fields(params, q_preserved);

      // If valid set of fields are defined, copy only those. Otherwise copy all.
      schemas.copy_fields(params, q, param_specs.valid); 
      var overrideFn=param_specs.overrideFn;
      if ( param_specs.overrideFn ) {
            // Call override function ..
            schemas.copy_fields(overrideFn(args), q); 
      }

      required_list=param_specs.required || {};
      optional_list=param_specs.optional || {};

          // Ensure that the param meets usual URL specs. 
          function verifyUrlparam(url) {
             var urlRegexp= new RegExp("^(http|ftp|https)://[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?", 'i');
             if (url) return(url.match(urlRegexp));
          }

          // convert the string (a set of words) so that it becomes AND regular expression.
          // "pune resorts" becomes "/(pune).*(resorts)/gi".
          function searchAsWordSearchRegexp(s) {
              if(!s) return null; 

              var s_arr=s.split(' ');
              var output="";
              output += '(' + s_arr[0] + ')';
              for(i=1; i< s_arr.length; ++i) {
                 if(s_arr[i] != "") {
                    output += '.*(' + s_arr[i] + ')'; // TODO: AND vs. OR query control here.
                 }
              }
              return(RegExp(output, 'gi'));
          }

      // Verifications before checking for required/optional.
      var param;
      if ( ! (param=param_modifiers['verify_url_param']) && verifyUrlparam(q[param]) ) {
               q[param]="";
               err+= "Option "+ param_modifiers['verify_url_param'] + " doesn't match URL format.\n";
      }
      required_list.forEach(function(field){
             if( (q[field]) && (q[field] != "") ) {
                   if (param_modifiers['decode_uri']) q[field]=decodeURIComponent(q[field]);
             } else {
                   err+="Param "+ field + " is required to be present.\n";
             }
      });
      optional_list.forEach(function(field){
         if( (q[field]) && (q[field] != "") ) {
              if (param_modifiers['decode_uri'] ) q[field]=decodeURIComponent(q[field]);
         }
      });
      if (param=param_modifiers['_and_regexp'])  q[param]=searchAsWordSearchRegexp(q[param]);
      if( next ) {
         next(err, q, q_preserved); 
      } else {
         return {err: err, q: q, q_preserved: q_preserved};
      }
}



/*
 * Generic quering for models required view view models. A view model may want to make
 * multiple model queries. We do them all asynchronously.
 *
 * Models implement and make their queries available through schema object. 
 *
 * It may so happen that one query may depend on results of another. In that case, 
 * the view model should implement its own query handler.
 */
views.helper_modelquery=function(modelquery_list, args, next) {

             var modelquery_execute=function(args, mq, callback) {
                  // mq=modelquery, represents the context of query such as what is the query itself, what fields are required, result limit etc. So we pass the mq param as a whole.
                  schemas.generic_query(mq, args.session, args.params, args.view_props, function(err, result) {
                      var r={}; r.name=mq.output_name; r.result=result;
                      callback('', {err: err, r:r}); // All errors handled by us.
                  });
             } 

        // async.apply creates continuation with some args already applied.
        var mq_cont=calipso.lib.async.apply(modelquery_execute, args); 
        calipso.lib.async.map(modelquery_list, mq_cont, 
           function(err, resultArr) {
              // TODO: Handling multiple errors from more than one model queries. 
              var final_err="";  // Expected value is by design null.
              var model_results={}; 
              resultArr.forEach(function(cb_result) {
//console.log("Checking the error setting here: cb_result.err");
//console.dir(cb_result.err);
                 cb_result.err ? final_err += "\nModelquery " + cb_result.r.name + " returned this error:  (Usually check the query specification in model spec.)\n" + cb_result.err :
                          model_results[cb_result.r.name]=cb_result.r.result;
              });
//console.log("Error after async modelrequests final_err follows:" + final_err);
//console.dir(final_err);
              next(final_err, model_results); 
           }
        );
}

