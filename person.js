var viceroy = require('viceroy');
var util = require('util');

// create and register the Persion model
function Person() {
  viceroy.Model.apply(this, arguments);
}

util.inherits(Person, viceroy.Model);
viceroy.model(Person);

module.exports = Person;
