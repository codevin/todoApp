module.exports = sharedList = {

/* Notes:
 * 1. View specs need not be same as modelquery query names; Just that they might usually be same. 
 * 2. You can have more than one modelquery requests.
 */ 

view_specs: {
  'by_id': {
           param_specs: { 
                     required: ['_id'], 
                     optional: [],
                     overrideFn: function(args) {
                                   return {
                                     '_owner': args.session.user_id,
                                   }; }, 
                     default:{} 
                   },
           param_modifiers: {},
           modelqueries:[
              {model: 'Entry', modelquery: 'by_id', output_name:'entry'}
           ],
           render_specs: {
               success: {template: 'mm-entry-view'}, // OK no 'response', only 'template'.
               error: { response: 'template' }
           }
  },
  'owned_by_me': {
           param_specs: { 
                     required: ['_owner'], 
                     optional: [],
                     overrideFn: function(args) {
                                   return {
                                     '_owner': args.session.user_id,
                                   }; }, 
                     default:{} 
                   },
           param_modifiers: {},
           modelqueries:[
              {model: 'Entry', modelquery: 'my_all', output_name:'entrylist'}
           ],
           render_specs: {
               success: {template: 'mm-partial-entrylist'}, // OK no 'response', only 'template'.
               error: { response: 'template' }
           }
   },
   'all': {

   },
   'search': {

   }
   'create_form': {
           param_specs: { 
                     required: [], 
                     optional: ['url', 'title', 'description', 'topic', 'topicname'],
                     overrideFn: function(args) { 
                                   return {
                                     '_owner': args.session.user_id,
                                     '_required_params_for_post': ['url', 'title'], // for use in template.
                                     '_action_url': args.view_vars._action_url,
                                     '_e_type':'Bookmark'
                                   }; }, 
                     default:{} 
                   },
           param_modifiers: {'_decode_uri':'true'},
           modelqueries: [
                {output_name: 'topic', model:'Topic', modelquery: 'by_eid'} 
           ],
           render_specs: {
               success: {template: 'mm-form-bookmark'},
               error: { response: 'template', template: 'mm-form-bookmark'}
           }
     },
     'submit_form': {
           param_specs: { 
                     required: ['url', 'title'], 
                     optional: ['description', 'topic', 'topicname'],
                     valid: ['url', 'title', 'description', 'topic', 'topicname', 'flags', '_owner'],
                     overrideFn: function(args) { 
                                    return { '_owner': args.session.user_id, '_next_url': args.view_vars._next_url, '_e_type':'Bookmark'};
                                 }, 
                     default:{} 
                   },
           param_modifiers: {'_decode_uri':'true'},
           pre_modelquery_fn: function(err, args, next){
                 next(err);
           },
           modelqueries: [], // Because EntryAPI will take care of the topic/topicname verification.
                // pre_render_fn should necessarily have next(), and only err() should be passed. 
                // The variables can be directly modified. 
           pre_render_fn: function(err, args, next) {
                   EntryAPI.createOrUpdateBookmark(args.q, function(err, entry) {
                       if (!err) args.model_results.entry=entry; 
                       next(err);
                   });
           },
           render_fn: function(self, error, results, next){  // Only params: self, err, results, next is needed. 
              if(error) {
                 // show bookmark form again along with error message.
                 self.res.render('mm-error-partial', {error: error}, 'message'); 

                 if (! results.q) results.q={};
                 if (! results.viewdata) results.viewdata={};

                 self.res.render('mm-form-bookmark', results, 'message'); 
                 next(null, results); 

              } else {
                 // redirect to just created entry.
                 // results.q (original params), results.q_modified
                 // results.viewdata.entry, and any other model inserted objects.
                 self.res.redirect('/entry/id/' + results.viewdata.entry._id);
                 next(error, results);
              };
           }
      };
},
sharedList: {
    // GET Called from router; render a template for form-fill.
    view: function(self, session, params, next) {
         var form_view_specs= 
        var view_vars={_action_url: '/forms/sharedList'};
        views.view(self, form_view_specs, {session:session, view_vars:view_vars, params:params}, function(err, results) {
            self.next();
        });
    },

    // POST called. Verify if we have right info, and if so, create the entry. Otherwise back to form.
    submit: function(self, session, params, next) {
      var view_vars={};
      views.view(self, form_submit_specs, {session:session, view_vars:view_vars, params:params}, function(err, results) {
           self.next();
      }); 
   }  
}

}
