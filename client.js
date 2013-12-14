var viceroy = require('viceroy');
var viceroyRest = require('viceroy-rest');

viceroy.driver(viceroyRest({
  host: 'localhost',
  port: 8000,
}));

viceroy.connect(function(){

  var Person = require('./person');
  var person = new Person({name: 'Shane'});

  person.save(function(err, person){
    console.log('created person', person);
    Person.findOne({name: 'Shane'}, function(err, person){
      console.log('found', person);
    });
  });

});
