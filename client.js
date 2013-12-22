var viceroy = require('viceroy');
var viceroyRest = require('viceroy-rest');

// local modules
var personView = require('./views/person');
var Person = require('./models/person');

var Router = require('./router');

//set up viceroy
viceroy.driver(viceroyRest({
  host: 'localhost',
  port: 8000,
}));


// layout is just a template, you have to pass the compile function 
// from your template language

module.exports = function(app, cb) {

  cb = cb || function(){}
  viceroy.connect(function(){

    var router = new Router({
      app: app,
      routes: {
        '/herp': function(req, res, next) {
          res.write('herp');
          res.end();
        },
        '/': function(req, res, next) {
          Person.find({name: 'Shane'}, function(err, people){
            personView.set(people[0].data());
            var markup = personView.toHTML();
            res.write(markup);
            res.end();
          });
        }

      }
    });

    cb();
  })

}
