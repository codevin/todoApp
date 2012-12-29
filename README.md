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

## Referencing modules from within the templates

You should do this: 
    // this refers to router object.
    this.res.addBlocks('user', 'user.login'); 
    this.render(...);

And within the template, you can reference the registered block as:
    <%- _module_user_login %> 


