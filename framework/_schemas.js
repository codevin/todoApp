var path = require('path'),
    rootpath = process.cwd() + '/',
    calipso = require(path.join(rootpath, "/lib/calipso"));

module.exports=schemas={}

/* For real app, you can list all your schemas here as a convention. */


/*
 * schemas.generic_query(view_mq, session, params, view_props, function(err, result) {})
 *
 * Given a modelquery specification of canned queries, run the desired query and return the results.
 *
 * modelquery_specs: Model's supported modelqueries. See format below.
 * view_mq: View's request of modelquery. See view_specs documentation.  
 * args: Required for list of global models, and to generate params for the query.
 *
 * Params should be populated by view_mq's params function.
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
schemas.generic_query = function(modelquery_specs, view_mq, args, next)
{  
   // first process the override function from modelquery.
   var q={};

   // We expect params to be provided by view_mq's paramsFn.
   if ( view_mq.paramsFn ) {
      var overrides=view_mq.paramsFn(args.q, args.session, args.view_props) || {}; 
      schemas.copy_fields(overrides, q);
   }

   // Canned queries fetched from specification in modelSupportedQuery.
   // Note: Our models should be registered within view_props during routing of request.
   var Model=args.view_props.models[view_mq.model];

   var supported_queries=modelquery_specs[view_mq.model];
   // model's modelquery.
   var model_mq=supported_queries[view_mq.modelquery];
   if ( ! model_mq || ! model_mq.queryFn ) {
          next("model "+ view_mq.model + " doesn't have query or queryFn by this name: " + view_mq.modelquery);
          return;
   }
   // Construct the query using specified queryFn. Note that we send in only q, which is expected to 
   // have all the info.
   var finalquery=model_mq.queryFn(q);

   if( ! finalquery ) {
         if( q['nullValid'] ) { 
             next(null, null);
         } else {
             next("Query function in query specification couldn't create a valid query. query="+finalquery + " for model_mq:" + view_mq.modelquery);
         }
   } else {
         Model[model_mq.method](finalquery, function(err, result) {
             next(err, result); 
         });
   }
}

/*
 * generic_createOrUpdate(Model, params, fields, function(err, entity){...}):
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
schemas.generic_createOrUpdate=function(Model, params, fields, next) 
{
      var required_fields_for_create=fields.required_for_create;
      var dontchange_fields_for_update=fields.dontchange_for_update;
      var persist_fields=fields.persist;

      var _id=params._id; if (_id && (_id=='' || _id == 'undefined')) delete params._id;

      var createMe=false, updateMe=false, error=null;
      if (required_fields_for_create[0] == '_id') {
         // If so, both create and update require _id field. If it is missing, it is error.
         if ( ! params[_id] ) {
            error="The operation needs _id field because of _id is managed by your code."; 
         } else updateMe=true; 
      } else if (params['_id']) { 
           updateMe=true;
      } else {
           createMe=true;
      }
      if( createMe ) { 
          // Verify that required fields are present from required_fields_for_create.
          var required_fields_list=[];
          required_fields_for_create.forEach(function(field) {
             if ( ! params[field] )  required_fields_list.push(field);
          });
          if ( required_fields_list.length > 0 )  {
              error= "Creating model "+model+ ": Some of the required parameters to create the record are not present: " + required_fields_list;
          }
      } else if (updateMe) { 
          // Verify that dont_change fiels are NOT present in params. 
          var dontchange_fields_list=null;
          dontchange_fields_for_update.forEach(function(field) {
              if ( ! params[field] )  dontchange_fields_list=params[field] + " ";
          });
          if ( dontchange_fields_list )  {
                 error="Updating model " +model+ "- Update can't change the fields:" + dontchange_field_list;
          }
     }
     var v_params={};
     if ( error ) {
           next(error);
     } else { 
           schemas.copy_fields(params, v_params, persist_fields); 
           if( updateMe ) { 
                var _id=v_params._id; delete v_params._id;
                Model.findByIdAndUpdate(_id, v_params, {upsert: true}, function(err, entity) { 
                    next(err, entity);
                });
           } else if (createMe) { 
                var entity=new Model(v_params);
                entity.save(function(err, entity) { 
                    next(err, entity);
                });
           } else {
                next("Please check your logic of genericCreateOrUpdate.");
           }
    }
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


