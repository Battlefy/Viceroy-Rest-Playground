A demo of [Viceroy-NeDB] [1], [Viceroy-Rest] [2] and [Viceroy-Rest-Server] [3].

# Quick Start:
Build the client:
`npm run build`

And run the server:
`npm start`

And open your browser to [http://localhost:8000](http://localhost:8000)

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
