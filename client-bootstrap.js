var reconnect = require('connect');
var client = require('./client');

var app = reconnect();
client(app)
