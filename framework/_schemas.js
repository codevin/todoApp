var path = require('path'),
    rootpath = process.cwd() + '/',
    calipso = require(path.join(rootpath, "/lib/calipso")),
    mongoose = require('mongoose'),
    extend = require('mongoose-schema-extend');

var Schema = mongoose.Schema;

module.exports=schemas={}

/* For real app, you can list all your schemas here as a convention. */


/*
 * schemas.generic_query(view_mq, session, params, view_props, function(err, result) {})
 *
 * Given a modelquery specification of canned queries, run the desired query and return the results.
 *
 * view_mq: Modelquery specification, see below.
 * session: Session parameters (key-value pairs)
 * params: URL Query parameters (key-value pairs)
 * view_props: Other parameters populated by view. (key-value pairs). 
 *
 * Note: Modelqueries don't perform any validations (apart from what Mongoose can manage.). 
 *
 * modelquery specification:
 *
 * modelquery={
 *   fields: {required: ['uid', ...], optional: ... }  
 *         // Required and optional fields needed to execute the query. 
 *         // Currently not used, but may be used in future. It serves as documentation for now.
 *   method: method, // Which query method to call: find, findOne, ...
 *   queryFn: function(args) {}, // Function that will create the actual query using params. 
 *   select_fields: ['field1', 'field2',.. ], // What fields are desired in output. Not used as yet.
 *   output_field: ... // The name of the variable to be populated.
 *   limit_params: ..  // Not used currently; required for paging. 
 * }
 *
 */
schemas.modelquery_specs={};  // Populate this with all your model query specs, wherever they are defined from.. 
schemas.generic_query = function(view_mq, session, params, view_props, next)
{  
   // first process the override function from modelquery.
   var q={};
   if (params) schemas.copy_fields(params, q); 
   // create our own local structure for params. And params can be empty too.

   if ( view_mq.overrideFn ) {
      var overrides=view_mq.overrideFn(params, session, view_props); 
      q=schemas.copy_fields(overrides, q);
   }

   // Canned queries fetched from specification in modelSupportedQuery.
   var Model=mongoose.model(view_mq.model);

   var supported_queries=schemas.modelquery_specs[view_mq.model];
   // model's modelquery.
   var model_mq=supported_queries[view_mq.modelquery];
   if ( ! model_mq || ! model_mq.queryFn ) {
          next("model "+ view_mq.model + " doesn't have query or queryFn by this name: " + view_mq.modelquery);
          return;
   }
   // Note: No checks are done here for parameter presence. It should have been done at
   // view level.
   var finalquery=model_mq.queryFn(q,session,view_props);

   if( ! finalquery ) {
         next("Query function in query specification couldn't create a valid query:"+model_mq);
   } else {
         Model[model_mq.method](finalquery, function(err, result) {
             next(err, result); 
         });
   }
}

/*
 * generic_createOrUpdate(model, params, fields, function(err, entity){...}):
 *
 * Fill the params and initiate creation of entity if didn't exist. Otherwise 
 * update it. 
 *
 * Parameters:
 * model: model, Which model to update.
 * params: params,  Params required to create this entity.
 * fields: { persist:[...],   // List of fields in params which need to be persisted for this entity.
 *           required_for_create: [...],  // List of field names which must be present to create the entity.
 *           dontchange_for_update: [...]  // Fields which must be retained when updating the entity. For e.g. 'url' in a bookmark.
 *         }
 *
 * Algorithm: There are three cases you should consider:
 *
 * 1. Create an entity when _id is not provided.
 *   - Ensure that required fields are present. E.g. 'url' and 'title' fields in Bookmark.
 *
 * 2. Create an entity when _id is provided i.e. _id is managed by your code.  
 *   - Specify '_id' as first field in 'required_fields_for_create'.
 *
 * 3. Update and entity when _id is provided, and included in dont_change_for_update. 
 */
schemas.generic_createOrUpdate=function(model, params, fields, next) 
{
      var Model=mongoose.model(model);
      var required_fields_for_create=fields.required_for_create;
      var dontchange_fields_for_update=fields.dontchange_for_update;
      var persist_fields=fields.persist;
      var step;

      calipso.lib.step(
        function() {  // Step 1: Verify fields and prepare final param list. 
           step=this;
           // createOrUpdate if id field is managed by backend.
           if ( !params._id || required_fields_for_create[0] == 'id' ) {  
                var required_fields_list=[];
                required_fields_for_create.forEach(function(field) {
                   if ( ! params[field] )  required_fields_list.push(field);
                });
                if ( required_fields_list.length > 0 )  {
                   step("Creating model "+model+ ": Some of the required parameters to create the record are not present: " + required_fields_list);
                   return;
                }
           } else { 
                var dontchange_fields_list=null;
                dont_change_fields_for_update.forEach(function(field) {
                   // If field is _id, we treat it specially: It might be 'create' request, with assigned _id.
                      if ( ! params[field] )  dontchange_fields_list=params[field] + " ";
                });
                if ( dontchange_fields_list )  {
                   step("Updating model " +model+ "- Update can't change the fields:" + dontchange_field_list);
                   return;
                }
           }
           var v_params={};
           schemas.copy_fields(params, v_params, persist_fields); 
           step(null, v_params);
        },
        function(err, v_params) { // Step 2: Create/update the entity.
            if (err) {step(err); return; }
            if( v_params._id ) {
                Model.findbyIdAndUpdate(v_params._id, v_params, {upsert: true}, function(err, entity) { 
                    step(err, entity);
                });
            } else {
                var entity=new Model(v_params);
                entity.save(function(err, entity) { 
                    step(err, entity);
                });
            }
        },
        function done(err, entity) {
              next(err, entity);
        }
     );
}

/*
 * Copy fields from 'from' to 'to', both being objects.
 *
 * If param_list is specified, only copy those fields. 
 * param_list: ['id', 'name', ...] 
 */
schemas.copy_fields=function(from, to, param_list)
{
  if (!from || !to ) {
      console.trace();
      throw "Error copy_fields with no from or to!!";
  }
  if ( param_list ) {
     var field;
     for(var i=0;  i<param_list.length; i++) {
        field=param_list[i];
        if(from[field]) to[field]=from[field];
     }
  } else {
     // copy all. 
     var fields=Object.getOwnPropertyNames(from);
     fields.forEach(function(field) {
        to[field]=from[field];
     }); 
  }
}


