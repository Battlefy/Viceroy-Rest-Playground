var fs = require('fs');
var Ractive = require('ractive')
var html = fs.readFileSync(__dirname + '/app.html');

var AppView = new Ractive({
  template: html
});

module.exports = AppView;
