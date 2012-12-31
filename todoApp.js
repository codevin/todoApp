/**
 * moduleApp: App definition for this module. Leverage calipso app framework 
 * for your application, which is defined as module within calipso, but 
 * should work as an independent application. 
 *
 * We will leverage the following capabilities from calipso:
 * * Themes support.  
 *     * Layout management.
 *     * Loadable Look-and-feel management. 
 *     * Content pages will be used mainly for website management. 
 *       Particularly using versioning in some way.
 * * Great cache management. 
 * * User and role management.
 *     * Mainly for admin parts of service. Not exposed to end users.
 * * Static files, Assets etc.
 * * What we will NOT use:
 *     * Tagging module. 
 */

module.exports = todoApp = {};

todoApp.baseName='todo';

// Register this moduleApp with calipso, to manage this space. 
var _calipso_module=require('./framework/_calipso_module.js').register(todoApp, '/todo', ['user']);
var lists=require('./lists/lists.js');

/*
 * Methods are executed in the context of router object because of 
 * 'router.dispatch() call later.
 */

var director=require('director');
var router;


todoApp.appInit=function() {

// Basic TODO, part 1.
// Access this using /todo. 
    var mongoose = require('mongoose');
    var db=mongoose.createConnection( 'mongodb://localhost/todoApp' );
    var schemaTodo = new mongoose.Schema({
       owner    : String,
       content    : String,
       updated_at : Date,
       list       : String // Used for part 2.
    });


// Part 2: Manage simple lists.  It is incomplete, but implements /todo/lists as functionality, though
// it is just list add/delete, and not doing any todo stuff.  
// This code uses the new framework under /framework.
    var schemaTodoList= new mongoose.Schema({
         name: String,
         owner: String, // Who owns it.
         users: String, // Shared with... 
    });

    var Todo=db.model( 'Todo', schemaTodo);
    var TodoList=db.model('TodoList', schemaTodoList);

    todoApp.models={'Todo': Todo, 'TodoList': TodoList};
    
    router=new director.http.Router({
       /* Part 1, '/todo/...'  */
       '/': { get: todoApp.index },
       '/create': { post: todoApp.create },
       '/destroy/:id': { get: todoApp.destroy },
       '/edit/:id': { get: todoApp.edit },
       '/update/:id': { post: todoApp.update },
       '/ajax/:id': { get: todoApp.ajax},  // This is just for example.

       /* Part 2, '/todo/lists' */
       '/lists':  { get: lists.index.view },
       '/lists/id/:id':  { get: lists.index.view },
       '/lists/post':  { post: lists.post.submit },
       '/lists/remove/:id':  { get: lists.remove.submit }

   }).configure({
        before:function(){
           this.res.layout='todo-main';
           this.Todo=Todo;
           this.res.addBlock('user', 'user.login');
           this.res.render('todo-sidebar', {}, 'sidebar');
        }
 });
}


todoApp.appRoute=function(req, res, next) 
{
  // 'this' is now todoApp, called from module's router.   
  router.attach(function(){
      var username=null;
      if( req.session && req.session.user && req.session.user.username ) {
         username=req.session.user.username;
      } else {
         username='guest';
      }
      this.username=username;
      this.next=next; 
      this.body=req.body;

      // This is for part 2.
      // The required information sometimes needs to be available deep into the framework.
      this.view_props={
         models: todoApp.models,
         username: username,
         body: req.body
      };
  });
  // async dispatch. If the path was not found, return error, which is currently handled by calipso.
  router.dispatch(req, res, function(err) {
       this.next("Error during dispatch."+err);
    }
  ); 
  // Asynchronous - this will likely execute earlier than the dispatched function. 
}


todoApp.index = function() { 
  var self=this; 
  this.Todo.
    find({ owner : self.username }).
    sort('updated_at', 'descending').
    exec( function ( err, todos ){
      if( err ) return self.next( err );
      self.res.render( 'todo-view', {
          title : 'Add a Todo Item:',
          todos : todos,
          current: '',
          user_name : self.username
      });
      self.next();
    });
};

todoApp.create = function (){

  var self=this;
  new this.Todo({
      owner    : this.username, 
      content    : this.body.content,
      updated_at : Date.now()
  }).save( function ( err, todo, count ){
    if( err ) return self.next( err );
    self.res.redirect( '/' );
    self.next();
  });
};

todoApp.destroy = function (id){
  var self=this;

  this.Todo.findById( id, function ( err, todo ){
    var owner = self.username;
    if( todo.owner != owner) {
    } else  {
    todo.remove( function ( err, todo ){
      if( err ) return self.next( err );

      self.res.redirect( '/' );
      self.next();
    });
  }});
};

todoApp.edit = function(id){
  var self=this; 

  this.Todo.
    find({ owner : self.username }).
    sort('updated_at', 'descending').
    exec( function ( err, todos ){
      if( err ) return self.next( err );

      self.res.render( 'todo-view', {
        title   : 'Express Todo Example',
        todos   : todos,
        current : id,
        user_name : self.username 
      });
      self.next();
    });
};

todoApp.update = function(id){
  var self=this;

  this.Todo.findById( id, function ( err, todo ){

    var owner = self.username; 
    if( todo.owner !== owner ){
       err="User ID of todo item not the current user. Forbidden."; 
       self.next(err);  
    }

    todo.content    = self.body.content;
    todo.updated_at = Date.now();
    todo.save( function ( err, todo, count ){
      if( err ) return self.next( err );

      self.res.redirect( '/' );
      self.next();
    });
  });
};

todoApp.ajax = function(id) 
{
  this.res.layout='todo-ajax'; 
  this.res.render("Get milk\nThis is second todo\nGet some more milk.\n", {}, 'ajaxbody');
  this.next();
}


