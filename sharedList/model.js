/* sharedlist model */
var schemas=require('../framework/_schemas.js');

module.exports=sharedLists = {

modelquery_specs:{
         'by_id': {
                    fields: { required: ['_id'], optional: [] },
                    method: 'findById', // return single _id in function.
                    queryFn: function(q,s,v) {var id=v['_id'] || q['_id']; return id; },
                    select_fields: null  // null = all.
         },
         'owned_by_me': {  
                    fields: { required: ['_owner'], optional: [] },
                    method: 'find',
                    queryFn: function(q) { return {_owner: q._owner}; },
                    select_fields: null  // null = all.
          }, 
         'all': { 
                    fields: { required: ['_owner', 'topic'], optional: [] },
                    method: 'findAll',
                    queryFn: function(q) { return {_owner: q._owner, topic: q.topic}; },
                    select_fields: null  
          },
         'search': { 
                    fields: { required: ['search'], optional: [] },
                    method: 'findAll',
                    queryFn: function(q) { return { $or: [ {title: q.search}, 
                                                             {topicname: q.search} ] }; },
                    select_fields: null 
          }
},


/*
 * createOrUpdateBookmark: Fill the params and initiate creation of bookmark entry.
 *
 */
createOrUpdateSharedList: function(params, next) {
    var persist_fields=['_id', 'owner', 'name', 'sharedWith', 'description'];  
    schemas.generic_createOrUpdate('sharedList', params, { persist: persist_fields, required_for_create: ['owner', 'name'], dontchange_for_update:['_id', 'owner'] }, function(err, sharedList){
                                       next(err, sharedList);        
                                   }
    );
}


}

