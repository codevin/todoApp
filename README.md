todoApp: Demo/template for using calipso as node.js application framework.

This is attempt to make calipso as application development framework. 
 
The idea is that you should be able to leverage various components that calipso provides, such as theming, forms management etc.  And, the community can use calipso can work as hub for modules that can work together within an application framework, much like Drupal's ecosystem. In the process, we however want that CMS is just one functionality. 

(Of course one can argue that module system (and like rails ecosystem) we don't need to build a separate ecosystem, but then, let us see if this goes anywhere!!) 

## Running this demo
1. Install calipso and ensure that it works. (See calipso's Readme.)
2. In modules/downloaded, do 'git clone https://github.com/codevin/todoApp.git'
3. In the same directory, do 'npm install' to install dependent modules.
4. In calipso's UI, login as admin and enable todoApp as one of the modules.
5. Now run calipso, and access: http://your.calipso.url/todo.  
6. Also try http://your.calipso.url/todo/lists, see notes below.


TODO: 
1. Directly install 'calipsoApp' which will be application blueprint rather than CMS.
2. Configure '/' to belong to application, rather than calipso. 

## Modules Dependencies - Managing routing etc. 

Main dependency is on Flatiron <a href="https://github.com/flatiron/director">director</a> is used as routine engine in ToDo app.  


## Writing new App 

Rename this module directory to your app's name. You would have to make changes to the following files. Easiest way is to search for 'todoApp' and change that string.

* package.json - Rename the module to your app's name.
* theme-extension.json  - Rename theme to your app's name.

And then there are two styles in included example: 
* '/todo' is implemented using simpler approach. 
* '/todo/lists' is implemented using a server side mvc framework, being developed and released as part of this release. It is intended to use specification for most common functionalities such as input validations, canned queries to mongodb and standardized approach to rendering using templates and error handling. See notes below.

## Using render()

Use 'this.res.render(template, results [, section]);'  to render a template (found within templates/ directory). You can also provide section as an option. This section should be defined in the layout. By default, the section used is 'body'. 

Render can be used multiple times within the single request. All the outputs are simply appended to the section. This is useful, for example, when you want to publish a error partial along with other body portions. 

## Referencing modules from within the templates

You should do this: 
    // this refers to router object.
    this.res.addBlocks('user', 'user.login'); 
    this.render(...);

And within the template, you can reference the registered block as:
    <%- _module_user_login %> 


## Ajax calls

For ajax calls, we use a special layout, and a special section within that layout. Add this code somewhere in the route serving path to send back ajax results:

   this.res.layout='todo-ajax';  // choose ajax layout.
   this.res.render(tmpl, tmpl_results, 'ajaxbody'); // Use 'ajaxbody' as section to render.
   this.next();


## Partial templates support - Build large templates from small ones 

Partial templates will help you organize and reuse the template segments. For example, a todo item rendering can be put in a partial, and called from list display template. 

We support these only for EJS templates for now.

Partial templates are called by using the following call within the EJS templates:
 
    <%- partial('todo-item-partial',{item:item})  %>

Note that the partials usually product HTML, so you need to use "-" modifier for template rendering.

Also, note that partials can get recursive. The code has checks to ensure that you can only recurse to 3 levels only. You can always modify the code in _module.js.

## A framework for driving an application using specification

A new framework is being introduced, with focus on specification rather than writing code. The standardization is in specifying how one specifies validations, executes one or more (canned) queries on backend asynchronously, and full control over rendering.

The code is under 'todoApp/framework/', and you can read some of the documentation there. Note that the field names are undergong change and better to look at actual usage under todoApp/lists/ directory.

 
 

