var viceroy = require('viceroy');
var viceroyRest = require('viceroy-rest');
var isServer = window === undefined;

// local modules
var personView = require('./views/person');
var Person = require('./models/person');

//set up viceroy
viceroy.driver(viceroyRest({
  host: 'localhost',
  port: 8000,
}));

viceroy.connect(function(){

  var person = new Person({name: 'Shane'});
  person.save(function(err, person){
    Person.find({name: 'Shane'}, function(err, people){
      people.forEach(function(person){
        document.body.appendChild(personView(person.data()));
      })
    });
  });

});
