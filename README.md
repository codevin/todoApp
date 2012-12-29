todoApp: Demo/template for using calipso as node.js application framework.

Like meteor, derby etc. Calipso can now be used as an applicaiton framework. 
It is possible to create your app from scratch, and leverage various components that calipso provides, such as theming, forms management etc.  (The idea is that calipso can work as hub for modules that can work together within an application framework.).

## Running this demo
1. Install calipso and ensure that it works. (See calipso's Readme.)
2. In modules/downloaded, do 'git clone https://github.com/codevin/todoApp.git'
3. In calipso's UI, login as admin and enable todoApp as one of the modules.
4. Now run calipso, and access: http://your.calipso.url/todo.  

TODO: 
1. Directly install 'calipsoApp' which will be application blueprint rather than CMS.
2. Configure '/' to belong to application, rather than calipso. 

## App blueprint - Modules used

Flatiron <a href="https://github.com/flatiron/director">director</a> is used as routine engine in ToDo app.  

* Local theme support - extension of calipso's theme functions. You can manage layouts and templates. Calipso's layout defines one or more sections, and uses EJS templating to include these section partials. You should usually do two things:
  * Define new layouts. 
Within your application, you 

 

## Writing new App 

Rename this module directory to your app's name. You would have to make changes to the following files. Easiest way is to search for 'todoApp' and change that string.

* package.json - Rename the module to your app's name.
* theme-extension.json  - Rename theme to your app's name.


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


