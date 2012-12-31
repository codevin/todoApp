# View Specification Documentation

## Purpose of design

Most of the web requests are handled using generic flow (called View Flow): 
* Process the request params, and ensure they are all good
* Perform one or more database queries
* Process and render the results using a template.

Similarly, Form fills flows have two step process:
* Filling the form, which is pretty much similar to View Flow
* Processing the form submit (typically a POST request) which in turn involves parameter validation, 
  getting additional data from databases and finally using creation/updation API with models. 
* Finally use a redirect (rather than template rendering) to redirect the user to another desired URL - the one where results can be seen.
 
View specifications are designed to use specifications based approach to handle part of the flow or 
entire flow. The benefits are:
* Code reusability, and hence much less testing.
* Any new functionality is uniformly available to all the code, which can be incrementally enhanced using
  updates to specification.
* Much faster development, since specifications require much less time.
* Much easier approach to figure out what the code is doing - since there is less code to read.
 
At the same time, the developer needs flexibility, and should not be tied to particular design.  Hence we have provide design patterns for all the following:
* One can implement any general web flow in usual manner, without using any of the specifications.
* Or, one can use sub-functionalities such as validations, model query calls, template rendering.
* Or, one can run use the complete standard flow, totally relying on specification. 
* Developers can also rely on specification, while tuning parts of the process with live javascript 
  code within the specification.


## Specifications overview

We have following types of specifications:
* Validate phase:   param_specs , param_modifiers.
   * This phase can verify if required params are present. And for required/optional params, it will apply param_modifiers (such as url decoding.)
   * TODO: Perform model level validations. 

* "Canned" Model queries. Done at two level: Models contain named queries. And views can contain view queries, which can request one or more model queries. All model queries are requested asynchronously.

* Render specifications: Once the results are available, they are sent to template. Templates also have 
  access to original params sent by user.


## Specifications With example.

### param_specs

required: Array of required param names.
optional: Array of optional param names. Needed so that we can apply param_modifiers.
overrideFn: List of param/value pairs which will override what came in through parameters. 
            'q' holds the final set of variables. Return value: key/value pairs.

param_modifiers: {
  '_decode_uri': true;  // URI params are decoded. (For e.g. " " is typically encoded as '+')
  '_and_regexp': param_name;  // Treat param name as search, and make it a regexp for AND of its words. 
  '_url_param': param_name;  // Ensure that ths is a URL and clean it up i.e. remove suspect chars.
}

default:  {
  'param': value; // If param is missing, give this as default value. (TODO)
}
   
Example:
           param_specs: { 
                     required: ['url', 'title'], 
                     optional: ['description', 'topic', 'topicname'],
                     overrideFn: function(args) { 
                                   return {
                                     '_owner': args.session.user_id,
                                     '_required_params_for_post': ['url', 'title'], 
                                             // For use in template, typically do client-side check.
                                     '_action_url': args.view_props._action_url
                                   }; }, 
                     default:{} 
                   },
           param_modifiers: {'_decode_uri':'true'},


### Model query caller specifications. 

We can call one or more modelquery functions. These are specified as part of model specification  and have a name. (See ../db/Topics.js, for example.).  We only refer them by name here.

'output_name': The name of variable which holds the results.
'model': Which model. 
'modelquery': Which named query in that model. 
 
Example (We are making two queries in parallel, allbeit on same model. We can use any set of models):

           modelqueries: [
                {output_name: 'active_topics', model:'Topic', modelquery: 'active_status'} 
                {output_name: 'subscribed_topics', model:'Topic', modelquery: 'subscribed_status'} 
           ]

### Pre-render function 

Use this to carry out functionality post the model queries. Typically used in POST to update
the record in DB.  Return the results which are input to render.

Example: 
          pre_render_fn: function(err, results, q, session, v) {  return(err, results);  }, 



### Final Render specifications

Either provide a 'fn' OR 'success' + 'error' combination. See below for details.

render_specs:  
  {  
     /*  Either specify a fn, or success/failure combination. */


         /* Execute a funtion. Usually for POST. No template is rendered automatically. 
            next() is called after this function is executed.
            Parameters: 
                   q: final params, 
                   mq_results: model query results, 
                   s: session passed from router,  
                   v: view_props Passed from caller.
         */
     fn: function(q, mq_results, s, v) {  }, 

         /*  
             Handle 'success' i.e. everything went fine. 
             When 'template' is used: Provide templatename, and optionally section.
             When 'redirect' is used, Provide a single hardcoded redirect URL.
             When 'redirectFn' is used, a function is executed:  
                      redirectFn: function(q, results, s, v) { return ['302', '/home']; }
                      The two parameters should be as per res.redirect of express documentation.
          */
     success: {  
         template: 'templatename', [section: 'section'] 
         redirect: 'url'. 
         redirectFn: function(q, results, s, v) { return {'302', '/home' }; 
     }
             /* 
                Error is exercised when there is a error message. If this section is not provided,
                it will use then use standardized render_error() as hardcoded handler.

                'response', should be provided as one of these: 'template', 'modal', 'redirect', 'redirectFn'.  
                If 'template' or 'modal' is specified, then use additional 'template' param can 
                be used to specify particular template. Or you can leave it off to let system use 
                standard error template. 

                If 'redirect' options are used, it is same as earlier discussed.

                Note: For 'modal' also, you need a template; just that it will be called via ajax. 
                TODO: Verify how this should work. 

                If template is omitted, we use standard system template with these params: 
                        type of error: 'warning', 'error', 'system_error'.
                        error message: Actual error message.
                        nexturl1, nexturl2, nexturl3: Upto 3 next URLs in format "Short String: url". 
              */
     error: { 
         response: 'template' or 'modal' or 'redirect' or 'redirectFn' 
         // and either template or redirect. 
     }
 }


Example:

           render_specs: {
               success: {template: 'mm-form-bookmark'},
               error: { response: 'template', template: 'mm-form-bookmark'}
           }

## Variables available in templates

Viewspecs allow you to name the results of the modelqueries. The templates receive 'result' object, which contains: 

viewdata: All the modelqueries populate this structure. For e.g. if one of the modelqueries populates 'entries', then it is accessible using viewdata.entries in the template.

q: The original GET parameters sent via URL.

q_modified: The modified and added/removed list of parameters during the functionality.


 
