var reconnect = require('./re-connect');
var client = require('./client');

var app = reconnect();

client(app)
