This is a demo of how you can use the [Viceroy] [4] ORM on both the client and
the server. It uses [Viceroy-NeDB] [1] as the backing store, [Viceroy-Rest] [2]
to make http requests to [Viceroy-Rest-Server] [3].

# Quick Start:
Build the client:
`npm run build`

And run the server:
`npm start`

And open your browser to [http://localhost:8000](http://localhost:8000)

## Sample Code:

### client :

```javascript
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
```

### server.js :


```javascript
// modules
var util = require('util');
var connect = require('connect');
var viceroy = require('viceroy');
var viceroyNeDB = require('viceroy-nedb');

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
  // bind the web server to port 8000
  app.listen(8000);
});

```

### Other Build Commands:

You can run the build commands with `npm run <scriptName>`

```
    "build": "./node_modules/.bin/browserify client.js > public/app.js",
    "watch": "./node_modules/.bin/watchify client.js -o public/app.js",
    "start": "node server.js",
    "start-watch": "./node_modules/.bin/nodemon -w"
```

[1]: http://www.github.com/Battlefy/Viceroy-NeDB        "ViceroyNeDB"
[2]: http://www.github.com/Battlefy/Viceroy-Rest        "Viceroy-Rest"
[3]: http://www.github.com/Battlefy/Viceroy-Rest-Server "Viceroy-Rest-Server"
[4]: http://www.github.com/Battlefy/Viceroy             "Viceroy"
