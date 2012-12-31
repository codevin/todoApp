var _views=require("../framework/_views.js");
var models=require("./modelqueries.js");

var mq_specs=models.modelquery_specs;
var model_methods=models.methods;

module.exports=lists={};

lists.index = {
    /* Notes:
     * 1. View specs need not be same as modelquery query names; Just that they might usually be same. 
     * 2. You can have more than one modelquery requests.
     */ 
  'view_specs': {
           param_specs: { 
                     required: ['owner'], 
                     optional: ['_id'],
                     overrideFn: function(args) { // For example, you can add/modify variables here.
                                   return {'owner': args.view_props.owner, 
                                           '_id': args.view_props._id,
                                           'list_format': 'summary' }; 
                                 } 
           },
           param_modifiers: {},
           modelqueries:[
              {model: 'TodoList', modelquery: 'owned_by_me', paramsFn: function(q,s,v) { return {owner: q.owner}; }, output_name:'lists'},
              {model: 'TodoList', modelquery: 'by_id', paramsFn: function(q,s,v) {return {nullValid:true, _id: v['_id']}; }, output_name:'selected_list'}
           ],
           pre_render_fn: function(err, args, next){
                 next(err);
           },
           render_specs: {
               success: {template: 'lists-view-index'}, // OK no 'response', only 'template'.
               error: { response: 'error' }
           }
  },
  'view': function(id) { 
              // id is optional
              var owner=helper_getUserName(this.req.session);
              this.view_props.owner=owner; this.view_props._id= id;  
              // TODO: if _id is given, highlight it. 
              _views.view(this, lists.index.view_specs, mq_specs, {session:this.req.session, view_props:this.view_props, params:this.req.params}, this.next);
   }
};

lists.post={
   view_specs: { 
           param_specs: { 
                     required: ['name'], 
                     valid: ['name', 'users', 'owner', '_id'],
                     overrideFn: function(args) { 
                                     return { 'owner': args.view_props.owner, 
                                              '_next_url': args.view_props._next_url,
                                             }; 
                                }
           },
           param_modifiers: {},
           pre_modelquery_fn: function(err, args, next){
                   model_methods.createOrUpdateListItem(args.view_props.models, args.q, function(err, listitem) {
                       if (!err) {
                           args.mq_results.listitem=listitem; 
                           // Note: It is not in list! Add it there in template.
                       }
                       next(err);
                   });
           },
           pre_render_fn: function(err, args, next) { next(err); },
           render_fn: function(self, error, results, next){  // Note param sequence. 
              if(error) {
                 // Show error box within the lists index page. It is rendered in 'message' section.
                 // Note special use of render: First param==null means second param is the output.
                 self.res.render('system-warning-partial', {message: error}, 'message'); 

                 if (! results.q) results.q={};
                 if (! results.mq_results) results.mq_results={};
              } else {
                 // redirect to same index page, but highlight the created entry. 
                 self.res.redirect('/lists');
              };
              next(error, results);
           }
    },
    // POST called.
    'submit': function() {
           var self=this;
           // for POST, params are in self.body.
           var owner=helper_getUserName(this.req.session);
           self.view_props.owner=owner;
           _views.view(self, lists.post.view_specs, mq_specs, {session:self.req.session, view_props:self.view_props, params:self.body}, function(err, results) {
               self.next();
           }); 
   }
};

lists.remove={
   view_specs: { 
           param_specs: { 
                     required: ['_id'], valid: ['_id'] 
           },
           pre_render_fn: function(err, args, next) {
                args.q.owner=args.view_props.owner;

                // list owner is checked in removeItem.
                model_methods.removeList(args.view_props.models, args.q, function(err, listitem) { next(err); });
           },
           render_fn: function(self, err, results, next){  // Note param sequence. 
              if(err) {
                 // Show error box within the lists index page. It is rendered in 'message' section.
                 // Note special use of render: First param==null means second param is the output.
                 self.res.render('system-warning-partial', {message: err}, 'message'); 
                 if (! results.q) results.q={};
                 if (! results.mq_results) results.mq_results={};
              } else {
                 // redirect to same index page, but highlight the created entry. 
                 self.res.redirect('/lists');
              };
              next(err, results);
           }
    },
    // This is still a GET function only. 
    'submit': function(id) {
           var self=this;
           // for POST, params are in self.body.
           var owner=helper_getUserName(this.req.session);
           self.view_props.owner=owner;
           var params={_id: id};
           _views.view(self, lists.remove.view_specs, mq_specs, {session:self.req.session, view_props:self.view_props, params:params}, function(err, results) {
               self.next();
           }); 
   }

};

lists.views={
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
               success: {template: 's_todo-entry-view'}, // OK no 'response', only 'template'.
               error: { response: 'error' }
           }
  },
  'edit_form': {

  },
  'submit_form': {

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
               success: {template: 's_todo-partial-entrylist'}, // OK no 'response', only 'template'.
               error: { response: 'template' }
           }
   },
   'all': {
   },
   'search': {
   }
};


function helper_getUserName(session){
  var owner;
  (session && session.user && session.user.username) ? owner=session.user.username : owner='demouser'; 
  return owner;
}

