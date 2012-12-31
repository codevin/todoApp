/* sharedlist model */
var schemas=require('../framework/_schemas.js');

/* For each model, specify the named queries it supports. */ 

module.exports=models = {};

models.modelquery_specs = {
'TodoList': {
        'by_id': {
                    fields: { required: ['_id'], optional: [] },
                    method: 'findById', // return single _id in function.
                    queryFn: function(q) { return q._id }
         },
         'owned_by_me': {  
                    fields: { required: ['owner'], optional: [] },
                    method: 'find',
                    queryFn: function(q) { 
                                return {owner: q.owner}; 
                             }
          }, 
         'by_list': { 
                    fields: { required: ['listname'], optional: [] },
                    method: 'find',
                    queryFn: function(q) { return (q.lists[q.listname]) ? {list: q.list} : null; },
                    select_fields: null  
          },
         'search': { 
                    fields: { required: ['search'], optional: [] },
                    method: 'findAll',
                    queryFn: function(q) { return { $or: [ {title: q.search}, 
                                                             {topicname: q.search} ] }; },
                    select_fields: null 
          }
}
};


/*
 * createOrUpdateBookmark: Fill the params and initiate creation of bookmark entry.
 *
 */
models.methods= {
        createOrUpdateListItem: function(models, params, next) {
            // Using '_id' as first field in persist will allow updates.
            var persist_fields=['_id', 'owner', 'name', 'users'];  
            var Model=models['TodoList'];
            schemas.generic_createOrUpdate(Model, params, 
                  { persist: persist_fields, required_for_create: ['owner', 'name'], 
                    dontchange_for_update:['_id', 'owner'] }, 
                  function(err, listitem){
                          next(err, listitem);        
                  });
        },
        removeList: function(models, params, next) {
            var TodoList=models['TodoList'];
            var id=params['_id'];
            var owner=params['owner'];

            TodoList.findById(id, function (err, list){
               if( list.owner != owner) {
                   next("Only owner can remove the list."); 
               } else  {
                   list.remove( function ( err, old_list ){
                         next(err, old_list);
                   });
               }
            });
        }
};

