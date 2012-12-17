/**
 * Additional content section / block functions for body.
 */

var rootpath = process.cwd() + '/',
  path = require('path'),
  calipso = require(path.join(rootpath, 'lib/calipso'));

exports = module.exports = function(req, options, callback) {

  /**
   *  Get additional content for blocks in the template
   */
  calipso.lib.step(
    function getContent() {
      options.getBlock('ajaxbody', this.parallel());
    },
    function done(err, ajaxbody) {
      callback(err,{ajaxbody:ajaxbody});
    }
  );


};
