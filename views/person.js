var fs = require('fs');
var Ractive = require('ractive')
var html = fs.readFileSync(__dirname + '/person.html');

var PersonView = new Ractive({
  template: html.toString()
});

module.exports = PersonView;
