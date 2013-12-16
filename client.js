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
  // POST http://localhost:8000/people
  person.save(function(err, person){
    // GET http://localhost:8000/people?name=Shane
    Person.find({name: 'Shane'}, function(err, people){
      people.forEach(function(person){
        document.body.appendChild(personView(person.data()));
      })
    });
  });

});
