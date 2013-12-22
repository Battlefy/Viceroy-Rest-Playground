// modules
var util = require('util');
var connect = require('connect');
var viceroy = require('viceroy');
var viceroyNeDB = require('viceroy-nedb');
var client = require('./client');

// libs
var viceroyRestServer = require('viceroy-rest-server');
var Model = viceroy.Model;

// link up the viceroy driver
viceroy.driver(viceroyNeDB({
  databasePath: 'viceroy-rest-server-test'
}));

// create the web server
var app = connect();

// create the viceroy rest server
var server = viceroyRestServer(app);
viceroy.use(server.middleware());

require('./models/person');

// load a people resource
server.loadRoutes(function(router) {
  router.resource('people');
});

// setup the db connection
viceroy.connect(function() {
  app.use(connect.static(__dirname + '/public'));
  client(app)
  // bind the web server to port 8000
  app.listen(8000);
});

