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
var _module=require('./_module.js').register(todoApp, '/todo', ['user']);

/*
 * Methods are executed in the context of router object because of 
 * 'router.dispatch() call later.
 */

var director=require('director');
var router;


todoApp.appInit=function() {
    var mongoose = require('mongoose');
    var db=mongoose.connect( 'mongodb://localhost/todoApp' );
    var schemaTodo = new mongoose.Schema({
       user_id    : String,
       content    : String,
       updated_at : Date
    });
    var Todo=db.model( 'todoApp', schemaTodo);

    router=new director.http.Router({
       '/': { get: todoApp.index },
       '/create': { post: todoApp.create },
       '/destroy/:id': { get: todoApp.destroy },
       '/edit/:id': { get: todoApp.edit },
       '/update/:id': { post: todoApp.update },
       '/ajax/:id': { get: todoApp.ajax}
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
  var todoApp=this; // Verified!
  router.attach(function(){
      this.next=next; 
      if( req.session && req.session.user && req.session.user.username ) {
         this.username=req.session.user.username;
      } else {
         this.username='demouser';
      }
      this.body=req.body;
  });
  // async dispatch.
  router.dispatch(req, res, function(err) {
       this.next("Error during dispatch."+err);
    }
  ); 
  // Asynchronous - this will likely execute earlier than the dispatched function. 
}


todoApp.index = function() { 
  var that=this; 
  this.Todo.
    find({ user_id : that.username }).
    sort('updated_at', 'descending').
    exec( function ( err, todos ){
      if( err ) return that.next( err );
      that.res.render( 'todo-view', {
          title : 'Add a Todo Item:',
          todos : todos,
          current: '',
          user_name : that.username
      });
      that.next();
    });
};

todoApp.create = function (){

  var that=this;
  new this.Todo({
      user_id    : this.username, 
      content    : this.body.content,
      updated_at : Date.now()
  }).save( function ( err, todo, count ){
    if( err ) return that.next( err );
    that.res.redirect( '/' );
    that.next();
  });
};

todoApp.destroy = function (id){
  var that=this;

  this.Todo.findById( id, function ( err, todo ){
    var user_id = that.username;
    if( todo.user_id != user_id) {
    } else  {
    todo.remove( function ( err, todo ){
      if( err ) return that.next( err );

      that.res.redirect( '/' );
      that.next();
    });
  }});
};

todoApp.edit = function(id){
  var that=this; 

  this.Todo.
    find({ user_id : that.username }).
    sort('updated_at', 'descending').
    exec( function ( err, todos ){
      if( err ) return that.next( err );

      that.res.render( 'todo-view', {
        title   : 'Express Todo Example',
        todos   : todos,
        current : id,
        user_name : that.username 
      });
      that.next();
    });
};

todoApp.update = function(id){
  var that=this;

  this.Todo.findById( id, function ( err, todo ){

    var user_id = that.username; 
    if( todo.user_id !== user_id ){
       err="User ID of todo item not the current user. Forbidden."; 
       that.next(err);  
    }

    todo.content    = that.body.content;
    todo.updated_at = Date.now();
    todo.save( function ( err, todo, count ){
      if( err ) return that.next( err );

      that.res.redirect( '/' );
      that.next();
    });
  });
};

todoApp.ajax = function(id) 
{
  this.res.layout='todo-ajax'; 
  this.res.render("Get milk\nThis is second todo\nGet some more milk.\n", {}, 'ajaxbody');
  this.next();
}


