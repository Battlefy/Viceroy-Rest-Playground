;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./person":42,"viceroy":12,"viceroy-rest":2}],2:[function(require,module,exports){
var request = require('superagent');

var filterBody = function(res) {
  var body;
  if(res && res.body){
    body = res.body;
  }
  return body;
}

function ViceroyRest(opts) {
  opts = opts || {};

  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  this.opts = opts;
}

ViceroyRest.prototype._validateConfig = function(callback){
  var opts = this.opts
  request.Request.prototype.withCredentials = function(){
    this._withCredentials = opts.withCredentials;
    return this;
  }

  if (this.opts.host === undefined){
    return callback(new Error('invalid host specified'))
  }
  callback();
}

ViceroyRest.prototype._setBaseUrl = function(){
  this._baseUrl = this._getBaseUrl();
}

ViceroyRest.prototype._getBaseUrl = function(){
  var port;
  if(this.opts.port){
    port = ':' + this.opts.port;
  } else {
    port = '';
  }
  return 'http://' + this.opts.host + port;
}

ViceroyRest.prototype.connect = function(callback) {
  var _this = this;
  this._validateConfig(function(err){
    if(err) { return callback(err); }
    _this._setBaseUrl();
    callback();
  });
};

ViceroyRest.prototype.find = function(query, opts, callback) {
  request
    .get(this._baseUrl + '/' + opts.collection)
    .withCredentials()
    .query(query)
    .end(function(err, res){ callback(err, filterBody(res)); })
};

ViceroyRest.prototype.findOne = function(query, opts, callback) {
  if(query._id) {
    request
      .get(this._baseUrl + '/' + opts.collection + '/' + query._id)
      .withCredentials()
      .query(query)
      .end(function(err, res) {
        callback(err, filterBody(res));
      });
  } else {
    // query.$limit = 1;
    request
      .get(this._baseUrl + '/' + opts.collection)
      .withCredentials()
      .query(query)
      .end(function(err, res) {
        callback(err, filterBody(res)[0]);
      });
  }
};

ViceroyRest.prototype.insert = function(data, opts, callback) {
  request
    .post(this._baseUrl + '/' + opts.collection)
    .withCredentials()
    .send(data)
    .end(function(err, res) {
      callback(err, filterBody(res));
    });
};

ViceroyRest.prototype.update = function(query, delta, opts, callback) {
  request
    .put(this._baseUrl + '/' + opts.collection + '/' + query._id)
    .withCredentials()
    .send(delta)
    .end(function(err, res){ callback(err, filterBody(res)); })
};

ViceroyRest.prototype.remove = function(query, opts, callback) {
  request
    .del(this._baseUrl + '/' + opts.collection)
    .withCredentials()
    .end(function(err, res){ callback(err, filterBody(res)); })
};

ViceroyRest.prototype.removeOne = function(query, opts, callback) {
  if(query._id) {
    request
      .del(this._baseUrl + '/' + opts.collection + '/' + query._id)
      .withCredentials()
      .end(function(err, res) {
        callback(err, filterBody(res));
      });
  } else {
    // query.$limit = 1;
    request
      .del(this._baseUrl + '/' + opts.collection)
      .withCredentials()
      .query(query)
      .end(function(err, res) {
        callback(err, filterBody(res)[0]);
      });
  }
};

ViceroyRest.prototype.index = function(indexes, opts, callback) {
  if(indexes.length > 0) {
    callback(new Error('Indexing not supported by Viceroy REST. This should be done server side'));
  } else {
    callback();
  }
};

module.exports = exports =function(config){
  return new ViceroyRest(config)
}

exports.ViceroyRest = ViceroyRest;

},{"superagent":3}],3:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? this
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

function getXHR() {
  if (root.XMLHttpRequest
    && ('file:' != root.location.protocol || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
}

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    pairs.push(encodeURIComponent(key)
      + '=' + encodeURIComponent(obj[key]));
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  this.text = this.xhr.responseText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.parseBody(this.text);
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status || 1223 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var path = req.path;

  var msg = 'cannot ' + method + ' ' + path + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.path = path;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var res = new Response(self);
    if ('HEAD' == method) res.text = null;
    self.callback(null, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  if (2 == fn.length) return fn(err, res);
  if (err) return this.emit('error', err);
  fn(res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._data;

  // store callback
  this._callback = fn || noop;

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;
    if (0 == xhr.status) {
      if (self.aborted) return self.timeoutError();
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  if (xhr.upload) {
    xhr.upload.onprogress = function(e){
      e.percent = e.loaded / e.total * 100;
      self.emit('progress', e);
    };
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

},{"emitter":4,"reduce":5}],4:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = callbacks.indexOf(fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],5:[function(require,module,exports){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
},{}],6:[function(require,module,exports){


function Denormalized(data) {
  this._data = data;
}

Denormalized.prototype.toJSON =
Denormalized.prototype.data = function() {
  return this._data;
};

Denormalized.prototype.toString = function() {
  return JSON.stringify(this._data);
};


module.exports = Denormalized;

},{}],7:[function(require,module,exports){

var util = require('util');
var Denormalized = require('./denormalized');


function ModelSet(ChildModel, data, opts) {
  Array.call(this);

  // set some defaults.
  data = data || [];
  opts = opts || {};

  // setup the instance.
  this.Model = ChildModel;
  this.opts = opts;

  // loop through each item of model data, and
  // add it to the instance.
  for(var i = 0; i < data.length; i += 1) {
    this.push(data[i]);
  }

  // reset opts
  this.opts = {};
}
util.inherits(ModelSet, Array);

ModelSet.prototype.create = function(data, opts, callback) {

  if(typeof opts == 'function') {
    callback = opts;
    opts = this.opts;
  }

  callback = callback || function() {};

  if(typeof data != 'object' || data.constructor != Object) {
    throw new Error('data must be an object');
  }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }
  if(typeof callback != 'function') {
    throw new Error('callback must be an function');
  }

  var model = new this.Model(data, opts);
  this.push(model);
  model.save(callback);
};

ModelSet.prototype.push = function(    ) {
  var models = arguments.slice && arguments.slice(0) ||
               Array.prototype.slice.call(arguments, 0);
  for(var i = 0; i < models.length; i += 1) {
    models[i] = this._processModel(models[i]);
  }
  return Array.prototype.push.apply(this, models);
};

ModelSet.prototype.unshift = function(    ) {
  var models = arguments.slice && arguments.slice(0) ||
               Array.prototype.slice.call(arguments, 0);
  for(var i = 0; i < models.length; i += 1) {
    models[i] = this._processModel(models[i]);
  }
  return Array.prototype.unshift.apply(this, models);
};

ModelSet.prototype.slice = function(    ) {
  return new ModelSet(this.Model, Array.prototype.slice.apply(this, arguments), this.opts);
};

ModelSet.prototype.splice = function(    ) {
  return new ModelSet(this.Model, Array.prototype.splice.apply(this, arguments), this.opts);
};

ModelSet.prototype.concat = function(    ) {
  var args = arguments.slice && arguments.slice(0) ||
             Array.prototype.slice.call(arguments, 0);
  for(var i = 0; i < args.length; i += 1) {
    if(typeof args[i].data != 'function') { continue; }
    args[i] = args[i].data();
  }
  var data = this.data();
  return new ModelSet(this.Model, data.concat.apply(data, args), this.opts);
};

ModelSet.prototype.filter = function(    ) {
  return new ModelSet(this.Model, Array.prototype.filter.apply(this, arguments), this.opts);
};

ModelSet.prototype.data = function(data) {
  if(typeof data == 'object' && data.constructor == Array) {
    this.length = 0;
    ModelSet.call(this, this.Model, data, this.opts);
  }
  var data = [];
  for(var i = 0; i < this.length; i += 1) {
    data.push(this[i].data());
  }
  return data;
};

ModelSet.prototype.populate = function(populate, callback) {
  var _this = this;
  var j = this.length;
  if(j == 0) { callback(undefined, this); return; }
  for(var i = 0; i < this.length; i += 1) {
    this[i].populate(populate, function(err) {
      j -= 1;
      if(j == 0) {
        callback(undefined, _this);
        return;
      }
    });
  }
  return;
};

ModelSet.prototype.denormalize = function(depth, callback) {
  if(typeof depth == 'function') {
    callback = depth;
    depth = undefined;
  }
  var data = [];
  var j = this.length;
  if(j == 0) { callback(undefined,  new Denormalized([])); return; }
  for(var i = 0; i < this.length; i += 1) {
    this[i].denormalize(depth, function(err, denormalized) {
      if(err) { callback(err); j = 0; return; }
      data.push(denormalized.data());
      j -= 1;
      if(j == 0) { callback(undefined, new Denormalized(data)); }
    });
  }
};

ModelSet.prototype.toJSON = function() {
  return this.data();
};

ModelSet.prototype.toString = function() {
  return JSON.stringify(this);
};

ModelSet.prototype.save = function(callback) {
  var _this = this;
  var j = this.length;
  for(var i = 0; i < this.length; i += 1) {
    this[i].save(function(err) {
      if(err) { callback(err); j = 0; return; }
      j -= 1;
      if(j == 0) { callback(undefined, _this); }
    });
  }
};

ModelSet.prototype.remove = function(callback) {
  var _this = this;
  var j = this.length;
  for(var i = 0; i < this.length; i += 1) {
    this[i].remove(function(err) {
      if(err) { callback(err); j = 0; return; }
      j -= 1;
      if(j == 0) { callback(undefined, _this); }
    });
  }
};

ModelSet.prototype._processModel = function(model) {
  if(typeof model != 'object') { throw new Error('Cannot add non object to model set.'); }
  if(model.constructor == this.Model) { return model; }
  else if(model.constructor == Object) {
    var model = new this.Model(model, this.opts);
    if(this.length < 1) { this._createProxies(model); }
    return model;
  }
  else { throw new Error('Cannot add foreign class instance to model set.'); }
};

ModelSet.prototype._createProxies = function(model) {

  for(var property in model) {

    // skip non functions and prototype methods.
    if(
      typeof model[property] != 'function' ||
      property.charAt(0) == '_' ||
      ModelSet.prototype[property]
    ) { continue; }

    // create a proxy for the method
    this._createProxy(property);
  }
};

ModelSet.prototype._createProxy = function(methodName) {

  // create a proxy method
  var _this = this;
  this[methodName] = function(    ) {
    var args = arguments.slice && arguments.slice(0) || 
               Array.prototype.slice.call(arguments, 0);


    // if the last argument is a function then
    // assume it is a callback.
    var len = args.length;
    if(typeof args[len - 1] == 'function') {
      var callback = args[len - 1];

      // create a function that creates a callback
      // that executes
      args[len - 1] = (function() {
        var j = _this.length;
        var results = [];

        return function(err    ) {
          if(j === undefined) { return; }
          j -= 1;

          // if there is an err
          if(err) { j = undefined; callback(err); return; }

          // collect the arguments
          var cbArgs = arguments.slice && arguments.slice(1) || 
                       Array.prototype.slice.call(arguments, 1);

          // insert the args into the results
          results.push(cbArgs.length > 0 && cbArgs || undefined);

          // once all of the calls are complete
          // execute the callback passing it
          // the results object.
          if(j == 0) {
            callback(undefined, results);
          }
        }
      })();
    }

    // execute the method on each of the models
    var results = [];
    for(var i = 0; i < _this.length; i += 1) {
      results.push(_this[i][methodName].apply(_this[i], args));
    }
    return results;
  };
};


module.exports = ModelSet;

},{"./denormalized":6,"util":40}],8:[function(require,module,exports){
var process=require("__browserify_process");// modules
var util = require('util');
var lingo = require('lingo');

// libs
var tools = require('primitive');
var Schema = require('./schema');
var Denormalized = require('./denormalized');
var ValidationError = require('./validation-error');
var ModelSet = require('./model-set');


/**
 * Creates a model. Should not be directly used.
 * Instead, inherit from Model.
 * @constructor
 * @param {Object} data
 * @param {Object} opts
 */
function Model(data, opts) {

  // throw an error if the constructor is Model.
  if(this.constructor == Model) {
    throw new Error('Model must be inherited from. It cannot be used directly');
  }

  // throw an error if the model has not been
  // registered with viceroy.
  if(!this.constructor.types) {
    throw new Error('Model must be registered with viceroy before it can be used');
  }

  // argument defaults.
  data = data || {};
  opts = opts || {};
  opts.newModel = opts.newModel !== false;

  // throw errors if invalid arguments are passed.
  if(typeof data !== 'object') {
    throw new Error('data must be an object');
  }
  if(typeof opts !== 'object') {
    throw new Error('opts must be an object');
  }
  if(typeof opts.newModel !== 'boolean') {
    throw new Error('opts.newModel must be an boolean');
  }

  // Setup instance properties.
  this._schema = new Schema();
  this._schema.types = this.constructor.types;
  this._schema._transforms = this.constructor._transforms;
  this._relationData = {};
  this._relationKeys = {};
  this._populatedRelations = {};
  this._data = {};
  this._hookHandlers = {};
  this._newModel = opts.newModel;
  this._state = 'ready';
  this._saveCallbacks = [];

  // add global schema rules.
  if(this.constructor._globalSchema) {
    this._schema.extend(this.constructor._globalSchema._definition);
  }

  // figure out the reserved props.
  this._reservedProperties = [];
  for(var prop in this) {
    this._reservedProperties.push(prop);
  }

  // register a hook for parsing types
  this.on('beforeSave', function() {
    this._schema.parseTypes(this);
  });

  // register validation on before save
  this.on('beforeSave', function(done) {
    var _this = this;

    // run a before validate hook
    this._hook('beforeValidate', function(err) {
      if(err) { done(err); return; }

      // validate the schema and callback.
      _this.validate(function(err) {
        if(err) { done(err); return; }

        // run a after validate hook
        _this._hook('afterValidate', done);
      });
    });
  });

  // register a hook for parsing types
  this.on('schemaUpdate', function() {
    this._schema.parseTypes(this);
  });

  // register index creation on schema update
  this.on('schemaUpdate', function() {
    for(var indexPath in this._schema.indexes) {
      this.constructor.index(indexPath, this._schema.indexes[indexPath]);
    }
  });

  // set data.
  this._setData(data);
}

/**
 * Applies/extends a schema for the model.
 * @param  {Object} descriptor The schema descriptor.
 */
Model.prototype.schema = function(descriptor) {

  // throw an error if the descriptor is not an
  // object
  if(typeof descriptor != 'object') {
    throw new Error('descriptor must be an object.');
  }

  // pass in the descriptor into the schema
  this._schema.extend(descriptor);
  this._schema.applyDefaults(this);

  // allow things to hook into schema updates
  this._hook('schemaUpdate');
};

/**
 * Returns an object that describes the model
 * schema.
 * @return {Object}
 */
Model.prototype.describe = function() {
  return this._schema.describe();
};

/**
 * Populate the model with new data. This is useful for reseting the model
 * back to the state saved in the datasource.
 * @async
 * @param  {Object}   query    A query object.
 * @param  {Object}   opts     query opts.
 * @param  {Function} callback A function called after the model is
 *                             updated.
 */
Model.prototype.get = function(query, opts, callback) {
  var _this = this;

  // set defualts
  if(typeof opts == 'function') {
    callback = opts;
    opts = {};
  }
  if(typeof query == 'function') {
    callback = query;
    opts = {};
    query = undefined;
  }
  if(query == undefined) {
    if(this._id) { query = { _id: this._id }; }
    else { query = {}; }
  }
  opts = opts || {};
  callback = callback || function() {};

  // throw an error if the model does not have
  // findOne.
  if(typeof _this.constructor.findOne != 'function') {
    callback(new Error('Model must implement static findOne method to use get')); return;
  }

  // run the beforeGet hooks
  this._hook('beforeGet', function(err) {
    if(err) { callback(err); return; }

    // use findOne to run a raw query and get the
    // data.
    opts.raw = true;
    _this.constructor.findOne(query, opts, function(err, data) {
      if(err) { callback(err); return; }

      // save the data.
      _this._setData(data);

      // run afterGet hooks then callback.
      _this._hook('afterGet', function(err) {
        if(err) { callback(err); return; }
        callback(undefined, _this);
      });
    });
  });
}

/**
 * Save the model data to the datasource.
 * @async
 * @param  {Object}   opts     save opts.
 * @param  {Function} callback A function called after the model is
 *                             updated.
 */
Model.prototype.save = function(opts, callback) {
  var _this = this;

  // set defualts
  if(typeof opts == 'function') {
    callback = opts;
    opts = {};
  }
  opts = opts || {};

  // throw an error if the model does not have
  // insert or update.
  if(
    typeof this.constructor.insert != 'function' ||
    typeof this.constructor.update != 'function'
  ) {
    callback(new Error('Model must implement static insert and update methods to use save'));
  }

  // add the callback to the save callbacks array.
  if(callback) { this._saveCallbacks.push(callback); }

  // if a save is in progress then set the state
  // to savingAsync so once the save operation is
  // comlete, it knows to save again before
  // calling back.
  if(this._state == 'saving') {
    this._state = 'savingAsync';
    return;
  }

  // if a save is scheduled then simply return.
  // The callback will be called once the
  // operation is complete.
  if(this._state != 'ready') { return; }

  // note that saving has begun.
  this._state = 'pending';

  // create a done handler. Called once the
  // save opertaion is complete.
  var data;
  var done = function(    ) {

    // note that the model is no longer new.
    // If the model was just created, this
    // would be set to true. Now that its set
    // to false, and changes to the model will
    // be commited via a delta.
    _this._newModel = false;

    // if the state is savingAsync, an
    // overlapping save operation is pending.
    // Before calling back resave.
    if(_this._state == 'savingAsync') {
      _this._state = 'resaving';
      _this._setData(data);
      save();
      return;
    }

    // set the state to ready as everything
    // has been saved.
    _this._state = 'ready';

    // call all of the callbacks. Remove them
    // as they are all called.
    for(var i = 0; i < _this._saveCallbacks.length; i += 1) {
      _this._saveCallbacks[i].apply(_this, arguments);
    }
    _this._saveCallbacks.length = 0;
  };

  // create a commited handler. Called once
  // the model data has been commited to the
  // database.
  var commited = function(err, dbData) {

    // if an error occurs, revert the model
    // and callback.
    if(err) {
      _this._setData(_this._data);
      done(err);
      return;
    }

    // if the data that came back is an object
    // then assume its the result of an insert
    // operation. Grab the doc and set it as
    // the new model data.
    if(typeof dbData == 'object' && typeof dbData[0] == 'object') {
      data = dbData[0];
    }

    // set the new data.
    _this._setData(data);

    // run afterSave hooks then callback
    _this._hook('afterSave', function(err) {
      if(err) { done(err); return; }
      done(undefined, _this);
    });
  };

  // create the save function. This function
  // is executed the next tick after model.save is
  // called, and imediately on resave.
  var save = function() {

    // copy the save callbacks array as is.
    var saveCallbacks = _this._saveCallbacks.slice(0);

    // set the state to saving. If any thing
    // tries to save to the model once this
    // happens then the state will be set to
    // savingAsync. This will trigger a resave.
    _this._state = 'saving';

    // run the beforeSave hooks.
    _this._hook('beforeSave', function(err) {
      if(err) { done(err); return; }

      // get the model data.
      data = _this._getData();

      // if this isn't a new model, and the deltas
      // are not disabled, get a delta.
      var delta;
      if(!_this._newModel) {
        if(!opts.disableDelta) {

          // get the delta. If the delta is
          // undefined then call done.
          delta = _this._getDelta();
          if(delta == undefined) { done(undefined, _this); return; }

        } else {

          // if the delta is disabled then set the
          // delta to the value of the model data.
          delta = data;
          delete delta._id;
        }
      }

      // if this is a new model then use insert,
      // otherwise use update.
      if(_this._newModel) {
        _this.constructor.insert([data], { raw: true }, commited);
      } else {
        _this.constructor.update({ _id: _this._id }, delta, { raw: true }, commited);
      }
    });
  };

  // on next tick begin the save. This is done so
  // if save is called more than once in the
  // current tick, we can merge all of the save
  // calls and preform them all at once.
  process.nextTick(save);
};

/**
 * Remove the model data from the datasource.
 * @async
 * @param  {Object}   opts     removal opts.
 * @param  {Function} callback A function called after the model is
 *                             updated.
 */
Model.prototype.remove = function(opts, callback) {
  var _this = this;

  // set defualts
  if(typeof opts == 'function') {
    callback = opts;
    opts = {};
  }
  opts = opts || {};
  callback = callback || function() {};

  // throw an error if the model does not have
  // removeOne.
  if(typeof this.constructor.removeOne != 'function') {
    throw new Error('Model must implement static removeOne method to use remove');
  }

  // throw an error if the model does not have an
  // id, or its a new model.
  if(this._newModel) {
    throw new Error('Model cannot be removed if it has not been previously saved');
  }
  if(this._id === undefined) {
    throw new Error('Model cannot be removed without an _id');
  }

  // run the beforeSave hooks
  this._hook('beforeRemove', function(err) {
    if(err) { callback(err); return; }

    // use removeOne to remove the data.
    _this.constructor.removeOne({ _id: _this._id }, { raw: true }, function(err, data) {
      if(err) { callback(err); return; }

      // save the data.
      _this._newModel = true;
      if(typeof data == 'object') { _this._setData(data); }

      // run afterRemove hooks then callback.
      _this._hook('afterRemove', function(err) {
        if(err) { callback(err); return; }
        callback(undefined, _this);
      });
    });
  });
};

/**
 * Validate the current state of the model against the model's schema.
 * @async
 * @param  {Function} callback A function that is called once validation
 *                             is complete.
 */
Model.prototype.validate = function(data, callback) {
  var _this = this;

  if(typeof data == 'function') {
    callback = data;
    data = this._getData();
  }

  // defaults.
  callback = callback || function() {};

  this._hook('beforeValidate', function(err) {
    if(err) { callback(err); return; }

    _this._schema.validate(data, function(err) {
      if(err) {
        var message = err.message.slice(0, 1).toLowerCase() + err.message.slice(1);
        callback(new ValidationError(_this.constructor.name + ' model ' + message, err.errors));
        return;
      }
      _this._hook('afterValidate', callback);
    });
  });
};

/**
 * Attach a has one relationship to the model.
 * @param  {Model}   RelModel    The relative model.
 * @param  {String}  opts        The model opts.
 */
Model.prototype.hasOne = function(RelModel, opts) {
  this.constructor.hasOne(RelModel, opts);
  this._updateRelations();
  this._hook('hasOne');
};

/**
 * Attach a has many relationship to the model.
 * @param  {Model}   RelModel    The relative model.
 * @param  {String}  opts        The model opts.
 */
Model.prototype.hasMany = function(RelModel, opts) {
  this.constructor.hasMany(RelModel, opts);
  this._updateRelations();
  this._hook('hasMany');
};

/**
 * Attach a belongs to one relationship to the model.
 * @param  {Model}   RelModel    The relative model.
 * @param  {String}  opts        The model opts.
 */
Model.prototype.belongsToOne = function(RelModel, opts) {
  this.constructor.belongsToOne(RelModel, opts);
  this._updateRelations();
  this._hook('belongsToOne');
};

/**
 * Attach a belongs to many relationship to the model.
 * @param  {Model}   RelModel    The relative model.
 * @param  {String}  opts        The model opts.
 */
Model.prototype.belongsToMany = function(RelModel, opts) {
  this.constructor.belongsToMany(RelModel, opts);
  this._updateRelations();
  this._hook('belongsToMany');
};

Model.prototype.populate = function(populate, callback) {
  var _this = this;

  callback = callback || function() {};
  if(typeof populate == 'string') { populate = [populate]; }

  if(typeof populate != 'object') {
    throw new Error('populate must be an object or array');
  }
  if(typeof callback != 'function') {
    throw new Error('callback must be a function');
  }

  // if populate is a string then convert it to
  // an object key.
  if(typeof populate == 'string') {
    var getterPath = populate;
    populate = {};
    populate[getterPath] = true;
  }

  // if populate is an array then convert it to
  // an object
  if(typeof populate == 'object' && populate.constructor == Array) {
    var getterPaths = populate;
    populate = {};
    for(var i = 0; i < getterPaths.length; i += 1) {
      populate[getterPaths[i]] = true;
    }
  }
  
  // throw an error if populate is not an object.
  if(typeof populate != 'object') {
    callback(new Error('populate must be an object.'));
    return;
  }

  // count the number of population opts to
  // preform.
  var j = 0;
  for(var ok in populate) { j += 1; }

  // if there are no operations to preform then
  // call back.
  if(j == 0) {
    callback(undefined, this);
    return;
  }

  // loop through populate each relation.
  for(var getterPath in populate) {
    this._populateRelation(getterPath, populate[getterPath], function(err) {
      if(err) { callback(err); return; }
      j -= 1;
      if(j == 0) { callback(undefined, _this); }
    });
  }
};

/**
 * A data getter/setter method. Provides
 * read/write access to the model data.
 * @param  {Object} data New model data.
 * @return {Object}      The model data.
 */
Model.prototype.data = function(data) {

  if(data && typeof data !== 'object') {
    throw new Error('data must be an object');
  }

  if(typeof data == 'object') {
    this._setData(data);
    return data;
  } else {
    return this._getData();
  }
};

/**
 * Returns the model data for JSON.stringify.
 * @return {Object} The model data.
 */
Model.prototype.toJSON = function() {
  return this._getData();
};

/**
 * Returns the model data as a JSON string.
 * @return {String} The model data as a JSON string.
 */
Model.prototype.toString = function() {
  return JSON.stringify(this);
};

Model.prototype.denormalize = function(depth, callback) {
  var _this = this;

  // tell the developer to use populate instead.
  console.log('model.denormalize is depricated. Please use opts.populate instead.');

  if(typeof depth == 'function') {
    callback = depth;
    depth = undefined;
  }

  // fetch the model's data.
  var data = this._getData();

  // if the depth is zero then stop here.
  if(depth !== undefined && depth < 1) {
    callback(undefined, new Denormalized(data));
    return;
  }

  // grab the relations and create a counter.
  var relations = this.constructor._relations;
  var i = relations && relations.length || 0;

  if(i == 0) {
    callback(undefined, new Denormalized(data));
    return;
  }

  var next = function() {
    i -= 1;
    if(i == 0) {
      callback(undefined, new Denormalized(data));
    }
  };

  // loop through each one of the relations and
  // grab any data associated.
  relations.forEach(function(relation) {

    // fetch data for has one relations.
    if(relation.type === 'hasOne') {

      // grab the id.
      var id = _this._relationData[relation.opts.IDPath];

      // if the id is not set then call next.
      if(id == undefined) { next(); return; }

      // find the model.
      relation.Model.findOne({ _id: id }, function(err, model) {
        if(err) { callback(err); return; }

        // callback with nothing if no model
        if(!model) { next(); return; }

        tools.del(relation.opts.IDPath, data);

        // call denormalize on the model.
        model.denormalize(depth - 1, function(err, denormalized) {
          if(err) { callback(err); return; }
          tools.traverse(relation.opts.getterPath, data, denormalized.data());

          // call next.
          next();
        });
      });
    }

    // fetch data for has many relations
    else if(relation.type === 'hasMany') {

      // grab the id
      var ids = _this._relationData[relation.opts.IDPath];

      // if the id is not set then call next
      if(ids == undefined || ids.length < 1) { next(); return; }

      // find the model
      relation.Model.find({ _id: { $in: ids } }, function(err, models) {
        if(err) { callback(err); return; }
        // callback with nothing if no model
        if(!models.length > 0) { next(); return; }
        tools.del(relation.opts.IDPath, data);

        // call denormalize on each the model
        var j = models.length;

        // call next now if there are no models
        if(j == 0) { next(); return; }

        var _data = [];
        models.forEach(function(model) {
          model.denormalize(depth - 1, function(err, denormalized) {
            if(err) { j = 0; callback(err); return; }
            _data.push(denormalized.data());
            j -= 1;

            // when all done call next
            if(j == 0) {
              tools.traverse(relation.opts.getterPath, data, _data);
              next();
            }
          });
        });

      });
    }

    // skip other relation types
    else { next(); }
  });
};

/**
 * Binds a handler to a hook such as beforeSave.
 * @param  {String}   hookName The hook name.
 * @param  {Function} handler  A handler function.
 */
Model.prototype.on = function(hookName, handler) {
  if(!this._hookHandlers[hookName]) { this._hookHandlers[hookName] = []; }
  this._hookHandlers[hookName].push(handler);
};

Model.prototype._hook = function(hookName, callback) {
  var _this = this;

  // defaults
  callback = callback || function() {};

  // if the hook has no handlers then callback
  if(!this._hookHandlers[hookName]) { callback(); return; }

  // grab the handlers and setup the loop
  // counters.
  var handlers = this._hookHandlers[hookName].slice(0);
  var i = 0;
  var j = handlers.length;
  if(j == 0) { callback(); return; }

  // loop through each handler in series then
  // callback
  (function exec() {
    var handler = handlers[i];
    var calledBack = false;
    i += 1;
    if(handler.length > 0) {

      // call the handler.
      handler.call(_this, function(err) {
        if(err) { j = 0; callback(err); return; }

        // throw an error if the handler tries to
        // call back more than once.
        if(calledBack) { callback(new Error('Handler called back multible times.')); return; }
        calledBack = true;
      
        // if there are handlers remaining then
        // call exec, otherwise call back.
        j -= 1;
        if(j > 0) { exec(); }
        else { callback(); }
      });
    } else {

      // call the handler.
      handler.call(_this);

      // if there are handlers remaining then
      // call exec, otherwise call back.
      j -= 1;
      if(j > 0) { exec(); }
      else { callback(); }
    }
  })();
};

Model.prototype._setData = function(data) {
  var _this = this;

  if(typeof data != 'object') {
    throw new Error('data must be an object');
  }

  // Delete all data properties
  (function exec(path, data) {
    for(var prop in data) {
      var val = data[prop];
      var subPath = path && path + '.' + prop || prop;
      if(
        val !== null &&
        typeof val == 'object' &&
        val.constructor == Object
      ) {
        exec(subPath, val);
      } else {
        tools.del(subPath, this);
      }
    }
  })('', this._data);

  // apply defaults
  this._schema.applyDefaults(this);

  // Apply the data to the instance.
  tools.walk(data, function(val, path) {

    // Skip subdocuments, we will copy
    // subdocuments property by property.
    if(
      val !== null && typeof val === 'object' &&
      val.constructor == Object
    ) { return; }

    // skip functions too.
    if(typeof val == 'function') { return; }

    // if the source is an array then slice it
    if(
      val !== null && typeof val === 'object' &&
      val.constructor == Array
    ) {
      val = val.slice(0);
    }

    // get the base property
    var baseProp = path.split('.').shift();

    // create the cache val
    var _val;
    if(
      val !== null && typeof val === 'object' &&
      val.constructor == Array
    ) {
      _val = val.slice(0);
    } else {
      _val = val;
    }

    // If a property already exists on the
    // instance, then prefix it with '__'.
    if(_this._reservedProperties.indexOf(baseProp) > -1) {
      tools.traverse(path, _this._data, _val);
      tools.traverse('__' + path, _this, val);
    }

    // otherwise simply apply it to the model.
    else {
      tools.traverse(path, _this._data, _val);
      tools.traverse(path, _this, val);
    }
  });

  // parse the types.
  this._schema.parseTypes(this);

  // apply the relations.
  this._updateRelations();
};

Model.prototype._getData = function() {
  var data = {};
  var _this = this;

  // collect all the data off of the instance
  // and move it into a data object.
  tools.walk(this, function(val, path) {

    // skip subdocuments, we will copy
    // subdocuments property by property. Skip
    // functions, and reserved properties.
    if(typeof val === 'object' && val.constructor == Object) { return; }
    if(typeof val == 'function') { return; }
    var baseProp = path.split('.').shift();
    if(_this._reservedProperties.indexOf(baseProp) > -1) { return; }

    // If a property is prefixed with '__' then
    // remove the '__' and attach it to the data
    // object.
    if(path.slice(0, 2) == '__') {
      tools.traverse(path.slice(2), data, val);
    } else {
      tools.traverse(path, data, val);
    }
  });

  // apply relation data.
  for(var path in this._relationData) {
    var relData = this._relationData[path];
    if(typeof relData == 'object' && relData.constructor == Array) {
      relData = relData.slice(0);
    }
    tools.traverse(path, data, relData);
  }

  // encode the data.
  this._schema.encodeTypes(data);

  // ensure dates are converted from strings to
  // objects.
  return data;
};

Model.prototype._getDelta = function() {
  var delta = {};
  var _this = this;

  // get the current data
  var current = this._getData();

  // if no id is set then use getData
  if(this._newModel) { return current; }

  // create the delta
  return tools.delta.create(this._data, current);
};

Model.prototype._populateRelation = function(getterPath, subPopulate, callback) {
  var _this = this;
  // if the relation is already populated then
  // call back.
  if(this._populatedRelations[getterPath]) {
    callback();
  }

  // grab the getter
  var getter = tools.traverse(getterPath, this);

  // if the getterPath does not point to a
  // getter, throw an error.
  if(typeof getter != 'function') {
    callback(new Error('Model ' + this.constructor.name + ' does not have relation attached to ' + getterPath + '.'));
    return;
  }

  // fetch the model.
  var opts = {};
  if(typeof subPopulate == 'object') { opts.populate = subPopulate; }
  getter({}, opts, function(err, relatedModel) {
    if(err) { callback(err); return; }

    // overwrite the getter with the model data
    // and save the model to the populated
    // relations relations.
    tools.traverse(getterPath, _this, relatedModel);
    _this._populatedRelations[getterPath] = relatedModel;

    // call back
    callback(undefined, _this);
  });

};

Model.prototype._updateRelations = function() {

  // grab the relations
  var relations = this.constructor._relations;
  if(!relations) { return; }

  // loop through and setup each relation
  for(var i = 0; i < relations.length; i += 1) {
    var relation = relations[i];

    // note that the relation has been created.
    var relationKey = relation.type + '@' + relation.Model.name + '#' + relation.opts.IDPath;
    if(this._relationKeys[relationKey]) { continue; }
    this._relationKeys[relationKey] = true;
    this._reservedProperties.push(relation.opts.getterPath);

    // create has one relations.
    if(relation.type === 'hasOne') {

      // update the schema
      var description = {};
      description[relation.opts.IDPath] = { type: [this.constructor.types.ID, String, Number], index: { sparse: true } };
      this._schema.extend(description);
      // add modifier methods and length for a count.
      var getter = this._createChildGetter(relation);
      getter.create = this._createChildCreator(relation);
      getter.remove = this._createChildRemover(relation);
      getter.link = this._createChildLinker(relation);
      getter.unlink = this._createChildUnlinker(relation);
      getter.length = this._relationData[relation.opts.IDPath] && 1 || 0;

      // save the data to the object on the
      // instance.
      var relationData = tools.traverse(relation.opts.IDPath, this);
      if(typeof relationData == 'object' && relationData.constructor == Array) {
        relationData = relationData.slice(0);
      }
      this._relationData[relation.opts.IDPath] = relationData;

      // delete the id property.
      tools.del(relation.opts.IDPath, this);

      // save the getter.
      tools.traverse(relation.opts.getterPath, this, getter);
    }

    // create has many relations.
    else if(relation.type === 'hasMany') {

      // update the schema
      var description = {};
      description[relation.opts.IDPath] = { type: Array, index: { sparse: true } };
      this._schema.extend(description);

      // save the data to the object on the
      // instance.
      var relationData = tools.traverse(relation.opts.IDPath, this) || [];
      if(typeof relationData == 'object' && relationData.constructor == Array) {
        relationData = relationData.slice(0);
      }
      this._relationData[relation.opts.IDPath] = relationData;

      // add modifier methods and length for a count.
      var getter = this._createChildGetter(relation);
      getter.create = this._createChildCreator(relation);
      getter.remove = this._createChildRemover(relation);
      getter.link = this._createChildLinker(relation);
      getter.unlink = this._createChildUnlinker(relation);
      getter.length = this._relationData[relation.opts.IDPath].length;

      // delete the id property.
      tools.del(relation.opts.IDPath, this);

      // save the getter.
      tools.traverse(relation.opts.getterPath, this, getter);
    }

    // create belongs to one relations.
    else if(relation.type === 'belongsToOne') {

      // add modifier methods and length for a count.
      var getter = this._createChildGetter(relation);

      // save the getter.
      tools.traverse(relation.opts.getterPath, this, getter);
    }

    // create has many relations.
    else if(relation.type === 'belongsToMany') {

      // add modifier methods and length for a count.
      var getter = this._createChildGetter(relation);

      // save the getter.
      tools.traverse(relation.opts.getterPath, this, getter);
    }

    // setup refOne removal.
    else if(relation.type === 'refOne') {
      this.on('afterRemove', function(done) {
        var query = {};
        var delta = { $unset: {} };
        query[relation.opts.IDPath] = this._id;
        delta.$unset[relation.opts.IDPath] = 1;
        relation.Model.update(query, delta, { raw: true }, function(err) {
          if(err) { done(err); return; }
          done();
        });
      });
    }

    // setup refMany removal.
    else if(relation.type === 'refMany') {
      this.on('afterRemove', function(done) {
        var query = {};
        var delta = { $pull: {} };
        query[relation.opts.IDPath] = this._id;
        delta.$pull[relation.opts.IDPath] = this._id;
        relation.Model.update(query, delta, { raw: true }, function(err) {
          if(err) { done(err); return; }
          done();
        });
      });
    }
  }
};

Model.prototype._createChildGetter = function(relation) {
  var _this = this;
  return function(query, opts, callback) {

    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    if(typeof query == 'function') {
      callback = query;
      opts = {};
      query = {};
    }
    callback = callback || function() {};

    // throw errors if the arguments are invalid.
    if(typeof query !== 'object') {
      callback(new Error('query must be an object')); return;
    }
    if(typeof opts !== 'object') {
      callback(new Error('query must be an object')); return;
    }

    // for *one relationships the getter is
    // relatively the same. The only difference
    // is the query.
    if(['hasOne', 'belongsToOne'].indexOf(relation.type) > -1) {

      // if the relation type is hasOne then the
      // query should have an id with a value from
      // the relation data.
      if(relation.type == 'hasOne') {

        // grab the id. If the id is not defined,
        // then callback with no model.
        var id = _this._relationData[relation.opts.IDPath];
        if(id === undefined) { callback(); return; }
        query._id = id;
      }

      // if a belongs to one, the query has a
      // property matching the foreign key path
      // with a value of the current model's id.
      else {

        // if the id is not defined then throw an
        // execption. You can not query a
        // belongsTo* relation if you don't have
        // a foreign key value.
        if(_this._id === undefined) {
          callback(new Error('Cannot query belongsToOne relations on a new Model.'));
          return;
        }
        query[relation.opts.IDPath] = _this._id;
      }

      // find the first record in the database
      // that matches the query.
      relation.Model.findOne(query, opts, function(err, model) {
        if(err) { callback(err); return; }

        // if a model is not returned then
        // callback
        if(!model) { callback(); return; }

        // process the model.
        if(relation.type == 'hasOne') {
          _this._processChildModel(model, relation);
        }

        callback(undefined, model);
      });
    }

    // for *many relationships the getter is
    // relatively the same. The only difference
    // is the query.
    else if(['hasMany', 'belongsToMany'].indexOf(relation.type) > -1) {

      // if the relation type is hasMany then the
      // query should have an id with a value from
      // the relation data.
      if(relation.type == 'hasMany') {

        // grab the ids.
        var ids = _this._relationData[relation.opts.IDPath];

        // if the query has an id set, then ensure
        // the id is within the ids from the
        // relation.
        if(query._id !== undefined) {
          for(var i = 0; i < ids.length; i += 1) {
            if(!ids[i].equals(query._id)) { continue; }
            ids = [query._id];
            break;
          }
          if(ids.length > 1) { ids = undefined; }
        }

        // If the id is not defined, then
        // callback without a model.
        if(ids === undefined || ids.length < 1) {
          callback(undefined, new ModelSet(relation.Model));
          return;
        }

        // assign the ids to the query.
        query._id = { $in: ids };
      }

      // if a belongs to many, the query has a
      // property matching the foreign key path
      // with a value of the current model's id.
      else {
        query[relation.opts.IDPath] = _this._id;
      }

      // find the first record in the database
      // that matches the query.
      relation.Model.find(query, opts, function(err, models) {
        if(err) { callback(err); return; }

        // if the model array does not have a
        // length then callback with no models.
        if(!models || models.length < 1) { callback(undefined, new ModelSet(relation.Model)); return; }

        // process the model.
        if(relation.type == 'hasMany') {
          for(var i = 0; i < models.length; i += 1) {
            _this._processChildModel(models[i], relation);
          }
        }

        callback(undefined, models);
      });
    }
  }
};

Model.prototype._createChildCreator = function(relation) {
  var _this = this;

  if(typeof relation.Model.create !== 'function') {
    throw new Error('relation models must implement create');
  }

  return function(data, callback) {

    // defaults.
    data = data || {};
    callback = callback || function() {};

    // throw errors if the arguments are invalid.
    if(typeof data !== 'object') {
      callback(new Error('data must be an object')); return;
    }

    // create the model.
    var model = new relation.Model(data);

    // add an after save hook to the begining of
    // the related models after save hook handlers
    // so it can attach the new relationship.
    // This allows you to access the linked
    // belongs to relation within the related
    // model's after save hooks.
    if(!model._hookHandlers.afterSave) { model._hookHandlers.afterSave = []; }
    model._hookHandlers.afterSave.unshift(function exec(done) {

      // unregister this function so it doesn't
      // get called a second time.
      model._hookHandlers.afterSave.splice(model._hookHandlers.afterSave.indexOf(exec), 1);

      // add the new model id to the relation
      // data.
      if(relation.type == 'hasMany') {
        _this._relationData[relation.opts.IDPath].push(model._id);
      } else if(relation.type == 'hasOne') {
        _this._relationData[relation.opts.IDPath] = model._id;
      }

      // save the parent model.
      _this.save(function(err) {
        if(err) { callback(err); return; }
        done();
      });
    });

    // attach a afterRemove hook so we can remove
    // the child model from the parent model once
    // its deleted.
    model.on('afterRemove', function(done) {
      if(relation.type == 'hasMany') {
        var ids = _this._relationData[relation.opts.IDPath];
        if(!ids || ids.length < 1) { done(); return; }
        ids.splice(ids.indexOf(model._id), 1);
      } else if(relation.type == 'hasOne') {
        delete _this._relationData[relation.opts.IDPath];
      }
      _this.save(done);
    });

    // create the model
    model.save(callback);
  };
};

Model.prototype._createChildRemover = function(relation) {
  var _this = this;

  if(typeof relation.Model.removeOne !== 'function') {
    throw new Error('relation models must implement removeOne');
  }

  return function(query, callback) {

    // defaults.
    query = query || {};
    callback = callback || function() {};

    // if an id is given then we will only use the
    // id.
    if(query._id) { query = { _id: query._id }; }

    // throw errors if the arguments are invalid.
    if(typeof query !== 'object') {
      callback(new Error('query must be an object')); return;
    }

    // remove the model data.
    relation.Model.removeOne(query, function(err, model) {
      if(err) { callback(err); return; }

      // remove the model from the relation data.
      if(relation.type == 'hasMany') {
        _this._relationData[relation.opts.IDPath].splice(this._relationData[relation.opts.IDPath].indexOf(model._id), 1)
      } else if(relation.type == 'hasOne') {
        delete _this._relationData[relation.opts.IDPath];
      }

      // save this model
      _this.save(function(err) {
        if(err) { callback(err); return; }
        callback(undefined, model);
      });
    });
  };
};

Model.prototype._createChildLinker = function(relation) {
  var _this = this;
  return function(model) {

    // if the model does not have an id then throw
    // and error.
    if(!model._id) {
      throw new Error('Cannot link model without _id. Save the relative model before trying to link it');
    }

    // add the model _id to the relation data.
    if(relation.type == 'hasMany') {
      _this._relationData[relation.opts.IDPath].push(model._id);
    }
    else if(relation.type == 'hasOne') {
      _this._relationData[relation.opts.IDPath] = model._id;
    }
  };
};

Model.prototype._createChildUnlinker = function(relation) {
  var _this = this;
  return function(model) {

    // if the model does not have an id then throw
    // and error.
    if(!model._id) {
      throw new Error('Cannot unlink model without _id. Save the relative model before trying to unlink it');
    }

    // add the model _id to the relation data.
    if(relation.type == 'hasMany') {
      var ids = _this._relationData[relation.opts.IDPath];

      // loop through and find the matching id
      var index = -1;
      for(var i = 0; i < ids.length; i += 1) {
        var id = ids[i];
        if(typeof id == 'object') {
          if(typeof id.equals == 'function') {
            if(id.equals(model._id)) { index = i; break; }
          } else if(
            typeof id.toString == 'function'&&
            typeof model._id.toString == 'function'
          ) {
            if(id.toString() == model._id.toString()) { index = i; break; }
          } else {
            if(tools.deepCompare(id, model._id)) { index = i; break; }
          }
        }
      }
      if(index == -1) { return; }
      _this._relationData[relation.opts.IDPath].splice(index, 1);
    }
    else if(relation.type == 'hasOne') {
      _this._relationData[relation.opts.IDPath] = undefined;
    }
  };
};

Model.prototype._processChildModel = function(model, relation) {
  var _this = this;

  // throw exeptions on invalid relation types.
  if(['hasMany', 'hasOne'].indexOf(relation.type) < 0) {
    throw new Error('_processChildModel can only be used on has relations');
  }

  // bind a after remove handler to the
  // model so if the model is removed, this
  // model can remove it from the relation.
  model.on('afterRemove', function(done) {
    if(relation.type == 'hasMany') {
      var ids = _this._relationData[relation.opts.IDPath];
      ids.splice(ids.indexOf(model._id), 1);
    } else if(relation.type == 'hasOne') {
      delete _this._relationData[relation.opts.IDPath];
    }
    _this.save(done);
  });
};

module.exports = Model;

},{"./denormalized":6,"./model-set":7,"./schema":10,"./validation-error":11,"__browserify_process":41,"lingo":13,"primitive":32,"util":40}],9:[function(require,module,exports){

var ValidationError = require('./validation-error');


function SchemaType(rule) {

  // set some defaults
  rule = rule || {};

  // If the function starts with a capital
  // letter, then assume its a class.
  if(
    typeof rule == 'function' &&
    rule.name[0] && rule.name[0].toUpperCase() == rule.name[0]
  ) {
    this._type = rule;
  }

  // if the rule simply a rule object then treat
  // it as so.
  else if(typeof rule == 'object' && rule.constructor == Object) {

    // ensure that defaults are always functions
    if(rule.default != undefined && typeof rule.default != 'function') {
      var defaultValue = rule.default;
      rule.default = function() {
        return defaultValue;
      };
    }

    this._type = rule.type;
    this._validate = rule.validate;
    this._description = rule.description;
    if(rule.index === true) { rule.index = {}; }
    this.index = rule.index;
    this.default = rule.default;
    this.required = rule.required;
  }

  // if the rule is an array then figure out if
  // its an array of types or validations.
  else if(typeof rule == 'object' && rule.constructor == Array) {
    if(typeof rule[0] == 'function') {
      this._type = rule;
    } else {
      this._validate = rule;
    }
  }

  // Otherwise treat it as a validation
  // method.
  else {
    this._validate = rule;
  }

  // If the validate or type is an array.
  if(typeof this._validate == 'object' && this._validate.constructor == Array) {
    if(!this._subSchemaTypes) { this._subSchemaTypes = []; }
    for(var i = 0; i < this._validate.length; i += 1) {
      this._subSchemaTypes.push(new SchemaType({ validate: this._validate[i] }));
    }
    delete this._validate;
  }

  // If the type or type is an array.
  if(typeof this._type == 'object' && this._type.constructor == Array) {
    if(!this._subSchemaTypes) { this._subSchemaTypes = []; }
    for(var i = 0; i < this._type.length; i += 1) {
      this._subSchemaTypes.push(new SchemaType({ type: this._type[i] }));
    }
    delete this._type;
  }
};

SchemaType.prototype.validate = function(value, callback) {
  callback = callback || function() {};

  // apply a default.
  if(value === undefined && this.default) {
    value = this.default();
  }

  // callback with an error if required is set.
  if(value === undefined && this.required) {
    callback(new ValidationError('Required field cannot be undefined'));
    return;
  }

  // Callback without an error if the value is
  // undefined.
  if(value === undefined) {
    callback();
    return;
  }

  // if this schema type has sub schema types,
  // then defer validation to them.
  if(this._subSchemaTypes) {
    var errors = [];
    var j = this._subSchemaTypes.length;
    for(var i = 0; i < this._subSchemaTypes.length; i += 1) {
      this._subSchemaTypes[i].validate(value, (function(err) {

        // if an error occurs then save it in case
        // all validations fail, so they can all
        // be passed off to the callback.
        if(err) { errors.push(err); }

        // once all the validation callbacks are
        // executed...
        j -= 1;
        if(j == 0) {

          // If none of the validations pass, then
          // the validation failed. Create and
          // callback with an error.
          if(errors.length === this._subSchemaTypes.length) {
            callback(new ValidationError(errors.join(' OR ')));
            return;
          }

          // otherwise callback with success.
          callback();
        }
      }).bind(this));
    }
    return;
  }

  // if the rule has a type then ensure the value
  // conforms to the type.
  if(this._type) {

    // if the JavaScript type is a constructors
    if(SchemaType.constructableTypes.indexOf(typeof value) > -1) {

      // if the constructor does not match the 
      // type then return false.
      if(this._type != value.constructor) {
        callback(new ValidationError('Must be an instance of ' + this._type.name));
        return;
      }
    }
  }

  // if the rule has a validate property then 
  // ensure the value conforms to the validate
  // property.
  if(this._validate) {

    // define a function for evaluation of
    // validation results
    var checkValidationResults = function(result) {

      // if the result is falsy then create an
      // error.
      if(!result) {
        callback(new ValidationError('Unknown validation error'));
        return;
      }

      // if an error is returned
      if(
        typeof result == 'object' &&
        (
          result.constructor == Error ||
          result.constructor == ValidationError
        )
      ) {
        callback(result);
        return;
      }

      // if anything truthy, other than an error
      // is passed then call the callback.
      callback();
    };

    if(typeof this._validate == 'function') {

      // if the function takes two arguments then
      // assume its async and pass in a callback
      // as the second argument.
      if(this._validate.length > 1) {
        this._validate(value, checkValidationResults);
        return;
      }

      // if the function has one argument then
      // pass it the data and assume it will
      // return a result.
      checkValidationResults(this._validate(value));
      return;
    }

    // validate by direct comparision
    if(value !== this._validate) {
      checkValidationResults(new ValidationError('Must equal ' + this._validate));
      return;
    }

    // asume validation passed.
    checkValidationResults(true);
    return;
  }

  // if there is no validation property on the
  // rule and the type check passed then call
  // the callback.
  callback();
};

SchemaType.prototype.describe = function() {

  // if the rule has a description then return
  // it. Otherwise grab the type class name.
  return this._description || (function() {
    return this._type && this._type.name;
  }).call(this);
};

SchemaType.isRule = function(rule) {
  if(
    typeof rule == 'object' &&
    rule.constructor == Object
  ) {

    // if any of the properties of the rule
    // are not part of a rule property set
    // then assume the rule is invalid.
    for(var prop in rule) {
      if([
          'type',
          'validate',
          'description',
          'index',
          'default',
          'required'
        ].indexOf(prop) == -1) {
        return false;
      }
    }

    // ensure each prop is the correct type.
    if(rule.type && [
      'function'
    ].indexOf(typeof rule.type) == -1) {
      return false;
    }
    if(rule.validate && [
      'function',
      'object',
      'string',
      'number'
    ].indexOf(typeof rule.validate) == -1) {
      return false;
    }
    if(rule.description && [
      'string'
    ].indexOf(typeof rule.description) == -1) {
      return false;
    }
    if(rule.index && typeof rule.index != 'object' && rule.index != true) {
      return false;
    }
    if(rule.required && typeof rule.required != 'boolean') {
      return false;
    }
  }

  return true;
};

SchemaType.constructableTypes = [
  'string',
  'number',
  'function',
  'object',
  'boolean'
];


module.exports = SchemaType;

},{"./validation-error":11}],10:[function(require,module,exports){

// modules
var util = require('util');

// libs
var tools = require('primitive');
var SchemaType = require('./schema-type');
var ValidationError = require('./validation-error');

/**
 * Creates a schema
 * @constructor
 * @param {Object} definition The schema definition.
 */
function Schema(definition) {

  // default definition should be an empty object
  definition = definition || {};

  // throw an error on invalid arguments.
  if(typeof definition != 'object') {
    throw new Error('definition must be an object.');
  }

  // create instance properties
  this.indexes = {};
  this.defaults = {};
  this._definition = {};
  this.types = {};
  this._transforms = {};

  // pass in the definition
  this.extend(definition);
}

/**
 * Extends the schema, merging a given descriptor into the current state.
 * @param  {Object} definition A schema definition.
 */
Schema.prototype.extend = function(definition) {
  var _this = this;

  // throw an error on invalid arguments.
  if(typeof definition != 'object') {
    throw new Error('definition must be an object.');
  }

  (function exec(path, definition) {
    var basePath = path && path + '.' || '';

    // loop through the schema path
    for(var property in definition) {
      var propPath = basePath + property;

      // check to see if the property is a rule,
      // if it is then create a schemaType from
      // it.
      if(
        SchemaType.isRule(definition[property]) ||
        definition[property] !== null &&
        typeof definition[property] == 'object' &&
        definition[property].constructor == SchemaType
      ) {
        var schemaType = _this._createSchemaType(definition[property]);

        // if an index or default property is
        // specified then add register them
        // with the schema.
        if(schemaType.index !== undefined) { _this.indexes[propPath] = schemaType.index; }
        if(schemaType.default !== undefined) { _this.defaults[propPath] = schemaType.default; }

        // save the schemaType to the schema
        _this._definition[propPath] = schemaType;
      }

      // else it must be a sub descriptor
      else if(
        typeof definition[property] == 'object' &&
        definition[property].constructor == Object
      ) {
        exec(propPath, definition[property]);
      }
    }

  })('', definition);
};

/**
 * Returns a schema descriptor.
 * @return {Object} descriptor.
 */
Schema.prototype.describe = function() {
  var descriptor = {};
  for(var path in this._definition) {
    var schemaType = this._definition[path];
    tools.traverse(path, descriptor, schemaType.describe());
  }
  return descriptor;
};

/**
 * Applies default values set in the schema to a given object.
 * @param  {Object} data The data to apply the defaults too.
 */
Schema.prototype.applyDefaults = function(data) {

  // throw an error on invalid arguments.
  if(typeof data != 'object') {
    throw new Error('data must be an object.');
  }

  // loop through and apply the defaults.
  for(var path in this.defaults) {
    if(tools.traverse(path, data) === undefined) {
      tools.traverse(path, data, this.defaults[path]());
    }
  }
};

/**
 * Applies default values set in the schema to a given object.
 * @async
 * @param  {Object}   data     The data to validate.
 * @param  {Function} callback The callback to call.
 */
Schema.prototype.validate = function(data, callback) {
  var _this = this;

  // defaults.
  callback = callback || function() {};

  // throw an error on invalid arguments.
  if(typeof data != 'object') {
    throw new Error('data must be an object.');
  }

  // count the number of rules in the definition
  var i = 0;
  for(var path in this._definition) { i += 1; }

  // if there are no rules then callback now
  if(i == 0) { callback(); return; }

  // otherwise run the validation on each rule.
  // If errors occur, collect them.
  var errors = [];
  for(var path in this._definition) {

    // get the schemaType and value
    var schemaType = this._definition[path];
    var value = tools.traverse(path, data);

    // run the validation
    (function(value, path) {
      schemaType.validate(value, function(err) {

        // if an error occurs, save some error data.
        if(err) {
          errors.push({
            message: err.message,
            path: path
          });
        }

        // once all the validations are complete
        // callback with/without errors.
        i -= 1;
        if(i == 0) {
          if(errors.length > 0) {
            callback(new ValidationError('Validation failed', errors));
            return;
          }
          callback();
        }
      });
    })(value, path);
  }
};

Schema.prototype.encodeTypes = function(data) {

  // throw an error on invalid arguments.
  if(typeof data != 'object') {
    throw new Error('data must be an object.');
  }

  // encode each type.
  for(var path in this._definition) {

    // if there are no types for this rule then
    // move on.
    if(
      !this._definition[path]._type &&
      (
        !this._definition[path]._subSchemaTypes ||
        !this._definition[path]._subSchemaTypes[0] ||
        !this._definition[path]._subSchemaTypes[0]._type
      )
    ) { continue; }

    if(this._definition[path]._subSchemaTypes) {
      for(var i = 0; i < this._definition[path]._subSchemaTypes.length; i += 1) {
        var subSchemaType = this._definition[path]._subSchemaTypes[i];
        if(!subSchemaType._type) { continue; }
        if(!this._transforms[subSchemaType._type.name]) { continue; }
        var val = tools.traverse(path, data);
        var type = this._transforms[subSchemaType._type.name];
        tools.traverse(path, data, type.encode(val));
      }
    } else {
      var type = this._transforms[this._definition[path]._type.name];
      if(!type) { continue; }
      var val = tools.traverse(path, data);
      tools.traverse(path, data, type.encode(val));
    }
  }
};

Schema.prototype.parseTypes = function(data) {

  // throw an error on invalid arguments.
  if(typeof data != 'object') {
    throw new Error('data must be an object.');
  }

  for(var path in this._definition) {
    if(!this._definition[path]._type) { continue; }

    var type = this._transforms[this._definition[path]._type.name];
    if(!type) { continue; }

    var val = tools.traverse(path, data);
    tools.traverse(path, data, type.parse(val));
  }
};

Schema.prototype._createSchemaType = function(rule) {
  if(typeof rule != 'object' || rule.constructor != SchemaType) {
    rule = new SchemaType(rule);
  }
  return rule;
};


module.exports = Schema;

},{"./schema-type":9,"./validation-error":11,"primitive":32,"util":40}],11:[function(require,module,exports){

var util = require('util');


function ValidationError(message, errors) {
  this.name = 'ValidationError';
  this.errors = errors || [];
  this.message = message;
}
util.inherits(ValidationError, Error);

ValidationError.prototype.toString = function() {
  var str = this.name + ': ' + this.message;
  for(var i = 0; i < this.errors.length; i += 1) {
    var error = this.errors[i];
    if(!error.path || !error.message) { continue; }
    str += '\n\t' + error.path + ': ' + error.message;
  }
  return str;
};

ValidationError.prototype.toJSON = function() {
  return {
    message: this.message.toString(),
    errors: this.errors
  };
};


module.exports = ValidationError;


},{"util":40}],12:[function(require,module,exports){

// modules
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var tools = require('primitive');
var lingo = require('lingo');

// libs
var Schema = require('./schema');
var SchemaType = require('./schema-type');
var Model = require('./model');
var ModelSet = require('./model-set');
var ValidationError = require('./validation-error');

/**
 * Creates an instance of viceroy
 * @constructor
 * @param {Object} opts
 */
function Viceroy(opts) {

  // defualts
  opts = opts || {};
  opts.collectionPrefix = opts.collectionPrefix || '';

  // throw on bad args
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }
  if(typeof opts.collectionPrefix != 'string') {
    throw new Error('opts.collectionPrefix must be a string');
  }

  // call super
  EventEmitter.call(this);

  // setup the instance.
  this.opts = opts;
  this.ready = false;
  this._driver = false;
  this._models = {};
  this._middleware = [];
  this.types = {
    ID: function ID() {}
  };
  this._globalSchema = new Schema({
    _id: {
      type: [this.types.ID, Number, String],
      index: true
    }
  });
  this._transforms = {
    ID: {
      parse: function(id) { return id; },
      encode: function(id) { return id; }
    },
    Date: {
      parse: function(dateStr) { if(dateStr) { return new Date(dateStr); } },
      encode: function(date) { return date; }
    }
  };
}
util.inherits(Viceroy, EventEmitter);

/**
 * Connect viceroy to the datasource via the viceroy._driver.
 * @async
 * @param  {Function} callback Callback called upon connection to the data
 *                             source.
 */
Viceroy.prototype.connect = function(callback) {
  var _this = this;

  // callback defaults to an empty function.
  callback = callback || function() {};

  // throw an error if the driver is not valid
  if(typeof callback != 'function') {
    throw new Error('Callback must be a function.');
  }

  // tell the driver to connect.
  this._driver.connect(function(err) {
    if(err) { callback(err); }

    // set ready once connected.
    _this.ready = true;
    _this.emit('ready', _this);

    // execute the callback passing it the
    // instance.
    callback(undefined, _this);
  });
};

/**
 * Register the driver to use with viceroy.
 * @chainable
 * @param  {Function|Object} driver The driver to register.
 */
Viceroy.prototype.driver = function(driver) {

  // throw an error if the driver is not valid
  if(typeof driver != 'object' && typeof driver != 'function') {
    throw new Error('Driver must be an object, constructor, or function.');
  }

  // instance the driver
  driver = this._instanceMiddleware(driver);

  // throw errors if the driver is missing any
  // methods.
  if(typeof driver.connect != 'function') {
    throw new Error('Driver must implement a connect method.');
  }
  if(typeof driver.index != 'function') {
    throw new Error('Driver must implement a index method.');
  }
  if(typeof driver.find != 'function') {
    throw new Error('Driver must implement a find method.');
  }
  if(typeof driver.insert != 'function') {
    throw new Error('Driver must implement an insert method.');
  }
  if(typeof driver.remove != 'function') {
    throw new Error('Driver must implement a remove method.');
  }

  // pass the models to the middleware
  for(var modelName in this._models) {
    var model = this._models[modelName];
    if(typeof driver.augmentModel == 'function') {
      driver.augmentModel(model.Model, model.opts);
    }
  }

  // add the driver
  this._driver = driver;

  return this;
}

/**
 * Accepts middleware and registers it with the
 * driver.
 * @chainable
 * @param  {Object|Function} middleware Middleware.
 */
Viceroy.prototype.use = function(middleware) {

  // throw an error if the driver is not valid
  if(typeof middleware != 'object' && typeof middleware != 'function') {
    throw new Error('Middleware must be an object, constructor, or function.');
  }

  // instance the middleware
  middleware = this._instanceMiddleware(middleware);

  // pass the models to the middleware
  for(var modelName in this._models) {
    var model = this._models[modelName];
    if(typeof middleware.augmentModel == 'function') {
      middleware.augmentModel(model.Model, model.opts);
    }
  }

  // add the middlware to the instance
  this._middleware.push(middleware);

  return this;
};

/**
 * Add a type transform to viceroy.
 * @chainable
 * @param  {Function} callback Callback called upon connection to the data
 *                             source.
 */
Viceroy.prototype.type = function(Type, transform) {

  // get the type id from the type constructor.
  if(Type.encode && Type.parse) {
    transform = {};
    transform.encode = Type.encode;
    transform.parse = Type.parse;
  }

  // throw an error if any arguments are invalid.
  if(typeof Type != 'function') {
    throw new Error('Type must be a string.');
  }
  if(typeof transform != 'object') {
    throw new Error('transform must be an object.');
  }
  if(typeof transform.parse != 'function') {
    throw new Error('transform.parse must be a method.');
  }
  if(typeof transform.encode != 'function') {
    throw new Error('transform.encode must be a method.');
  }

  // register the type transform
  this._transforms[Type.name] = transform;
  this.types[Type.name] = Type;
  
  return this;
};

/**
 * Accepts a model and augments it with static
 * methods, and hooks the model to the datasource.
 * @chainable
 * @param  {String} modelName The name of the model.
 * @param  {Model}  Model     A model.
 * @param  {Object} opts      The opts object.
 */
Viceroy.prototype.model = function(modelName, Model, opts) {

  // TODO: 
  // - collection prefixes

  // if the first argument is the model itself,
  // then grab the model name from the model.
  if(typeof modelName == 'function') {
    opts = Model;
    Model = modelName;
    modelName = Model.name;
  }

  // opts defaults to an object
  opts = opts || {};
  opts.collection = opts.collection || lingo.en.pluralize(modelName.charAt(0).toLowerCase() + modelName.substr(1));

  // if collection prefix is set then use it
  if(this.opts.collectionPrefix) {
    opts.collection = this.opts.collectionPrefix + opts.collection;
  }

  // throw errors if any of the arguments are
  // invalid.
  if(typeof modelName != 'string') {
    throw new Error('modelName must be a string');
  }
  if(typeof Model != 'function') {
    throw new Error('Model must be a constructor');
  }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  // save the model
  this._models[modelName] = {
    Model: Model,
    opts: opts
  };

  if(this._driver.augmentModel) {
    this._driver.augmentModel(Model, opts);
  }

  // pass the model to the middleware and driver
  for(var i = 0; i < this._middleware.length; i += 1) {
    this._middleware[i].augmentModel(Model, opts);
  }

  // attach static methods to the model
  this._augmentModel(Model, opts);

  return this;
}

/**
 * Sets the global descriptor all model schemas.
 * @chainable
 * @param  {Object} descriptor A schema descriptor.
 */
Viceroy.prototype.globalSchema = function(descriptor) {
  this._globalSchema.extend(descriptor);
  return this;
};

Viceroy.prototype._instanceMiddleware = function(middleware) {
  // if the middleware is a function...
  if(typeof middleware == 'function') {
    try {
      // try to execute it as a class constructor
      var _middleware = new middleware(this);
      for(var prop in _middleware) { break; }
      if(!prop) { throw ''; }
      middleware = _middleware;
    } catch(err) {
      // otherwise execute it as a function
      middleware = middleware(this);
    }
  }
  return middleware;
};

Viceroy.prototype._augmentModel = function(Model, opts) {
  var _this = this;

  // throw errors if any of the arguments are
  // invalid.
  if(typeof Model != 'function') {
    throw new Error('Model must be a constructor');
  }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  // attach the global schema.
  Model._globalSchema = this._globalSchema;

  // Indexing related methods.
  Model.index = this._createIndexMethod(Model, opts);

  // Query related Methods.
  Model.all = this._createAllMethod(Model, opts);
  Model.find = this._createFindMethod(Model, opts);
  Model.findOne = this._createFindOneMethod(Model, opts);
  Model.count = this._createCountMethod(Model, opts);

  // Insert/Update Related Methods.
  Model.create = this._createCreateMethod(Model, opts);
  Model.insert = this._createInsertMethod(Model, opts);
  Model.update = this._createUpdateMethod(Model, opts);

  // Removal Methods.
  Model.truncate = this._createTruncateMethod(Model, opts);
  Model.remove = this._createRemoveMethod(Model, opts);
  Model.removeOne = this._createRemoveOneMethod(Model, opts);

  // Relational Methods.
  Model.hasOne = this._createHasOneMethod(Model);
  Model.hasMany = this._createHasManyMethod(Model);
  Model.belongsToOne = this._createBelongsToOneMethod(Model);
  Model.belongsToMany = this._createBelongsToManyMethod(Model);
  
  // attach types reference to the model
  Model.types = this.types;
  Model._transforms = this._transforms;

  // create a relationalKeys object to keep track
  // of static relations.
  Model._relationKeys = {};
};

Viceroy.prototype._validateQuery = function(query, opts) {

  // throw errors if any of the arguments are
  // invalid.
  if(typeof query != 'object') {
    throw new Error('query must be an object');
  }

  // map '$' opts from the query to opts
  var mOpts = ['populate', 'limit', 'offset', 'fields'];
  for(var i = 0; i < mOpts.length; i += 1) {
    if(query['$' + mOpts[i]]) {
      opts[mOpts[i]] = query['$' + mOpts[i]];
      delete query['$' + mOpts[i]];
    }
  }
};

Viceroy.prototype._createResultsProcessor = function(Model) {
  var _this = this;

  if(typeof Model != 'function') {
    throw new Error('Model must be a constructor');
  }

  // return a function to capture the callback
  return function(opts, callback) {

    if(typeof opts != 'object') {
      throw new Error('opts must be an object');
    }

    // if the a callback is not passed in then
    // default to an empty function.
    callback = callback || function() {};
  
    // return the results processor.
    return function(err, results) {

      // if an error, then callback with the error.
      if(err) { callback(err); return; }
      if(!results || typeof results != 'object') { callback(); return; }

      // if raw is set to true then callback with
      // the data as is.
      if(opts.raw) {
        callback(undefined, results);
        return;
      }

      // ensure the model is aware that its
      // recieving data from the data source, not
      // from our application.
      opts.newModel = false;

      // wrap the results in ether a model set or
      // a model.
      if(results.constructor == Array) {
        _this._populateRelations(new ModelSet(Model, results, opts), opts.populate, callback);
      } else {
        _this._populateRelations(new Model(results, opts), opts.populate, callback);
      }
    };
  };
};

Viceroy.prototype._populateRelations = function(model, populate, callback) {
  var _this = this;

  callback = callback || function() {};

  if(typeof model != 'object') {
    callback();
    return;
  }

  var populate = populate || {};

  // throw if populate is not an object or array.
  if(typeof populate != 'object') {
    callback(undefined, model);
    return;
  }

  // convert populate arrays to objects.
  var j = 0;
  if(populate.constructor == Array) {
    var populatePaths = populate;
    var populate = {};
    for(var i = 0; i < populatePaths.length; i += 1) {
      populate[populatePaths[i]] = true;
      j += 1;
    }
  } else {
    for(var ok in populate) { j += 1; }
  }
  
  // ask the model to populate the relations.
  model.populate(populate, callback);
};

Viceroy.prototype._createIndexMethod = function(Model, opts) {

  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;

  // return the all method
  return function(indexes, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    if(typeof indexes == 'string') {
      indexes = [indexes];
    }
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof indexes != 'object' || indexes.constructor != Array) {
      callback(new Error('indexes must be an array')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // if the driver has an all method then use 
    // it, otherwise use find.
    viceroy._driver.index(indexes, opts, callback);
  };
};

Viceroy.prototype._createAllMethod = function(Model, opts) {

  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);

  // return the all method
  return function(opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // if the driver has an all method then use 
    // it, otherwise use find.
    if(typeof viceroy._driver.all == 'function') {
      viceroy._driver.all(opts, processResults(opts, callback));
    } else {
      viceroy._driver.find({}, opts, processResults(opts, callback));
    }
  };
};

Viceroy.prototype._createFindMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);
  var validateQuery = this._validateQuery;
  
  return function(query, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    query = query || {};
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof query != 'object') {
      callback(new Error('query must be an object')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // validate the query
    validateQuery(query, opts);

    // ask the driver to find the results
    viceroy._driver.find(query, opts, processResults(opts, callback));
  };
};

Viceroy.prototype._createFindOneMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);
  var validateQuery = this._validateQuery;
  
  return function(query, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    query = query || {};
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof query != 'object') {
      callback(new Error('query must be an object')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // validate the query
    validateQuery(query, opts);

    // if the driver has a findOne method then
    // use it, otherwise use find.
    if(typeof viceroy._driver.findOne == 'function') {
      viceroy._driver.findOne(query, opts, processResults(opts, callback));
    } else {
      opts.limit = 1;
      viceroy._driver.find(query, opts, function(err, results) {
        return processResults(opts, callback)(err, results[0]);
      });
    }
  };
};

Viceroy.prototype._createCountMethod = function(Model, opts) {
  
  // grab the driver and collection.
  var viceroy = this;
  var collection = opts.collection;
  var validateQuery = this._validateQuery;
  
  return function(query, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    query = query || {};
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof query != 'object') {
      callback(new Error('query must be an object')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // validate the query
    validateQuery(query, opts);

    // if the driver has a count method then
    // use it, otherwise use find.
    if(typeof viceroy._driver.count == 'function') {
      viceroy._driver.count(query, opts, callback);
    } else {
      opts.fields = ['_id'];
      viceroy._driver.find(query, opts, function(err, results) {
        callback(err, results.length);
      });
    }
  };
};

Viceroy.prototype._createCreateMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);
  
  return function(data, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    data = data || {};
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof data != 'object' || data.constructor != Object) {
      callback(new Error('data must be an object')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // run the data through the model
    if(!opts.raw) {
      (new Model(data, opts)).save(callback);
    } else {
      viceroy._driver.insert([data], opts, function(err, results) {
        processResults(opts, callback)(err, results && results[0]);
      });
    }

  };
};

Viceroy.prototype._createInsertMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);
  var transformData = this._transformData;
  
  return function(data, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    data = data || [];
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof data != 'object' || data.constructor != Array) {
      callback(new Error('data must be an array')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // run the data through the model
    if(!opts.raw) {
      var modelSet = new ModelSet(Model, data, opts);
      modelSet.save(callback);
    } else {
      viceroy._driver.insert(data, opts, processResults(opts, callback));
    }

  };
};

Viceroy.prototype._createUpdateMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);
  var transformData = this._transformData;
  var validateQuery = this._validateQuery;
  
  return function(query, delta, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    query = query || {};
    delta = delta || {};
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof query != 'object') {
      callback(new Error('query must be an object')); return;
    }
    if(typeof delta != 'object') {
      callback(new Error('delta must be an object')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // validate the query
    validateQuery(query, opts);

    if(!opts.raw) {
      throw new Error('Manual updates are not implemented. Please use a model instance.');
    } else {
      // if the driver implements an update method
      // use it, otherwise use remove and insert.
      if(typeof viceroy._driver.update == 'function') {
        viceroy._driver.update(query, delta, opts, processResults(opts, callback));
      } else {
        viceroy._driver.remove(query, opts, function(err, data) {
          if(err) { callback(err); return; }

          // If items were acually removed and
          // returned, then merge then with the
          // delta.
          if(data !== undefined) {
            for(var i = 0; i < data.length; i += 1) {
              data[i] = tools.delta.apply(data[i], delta);
            }
          } else {
            data = [tools.delta.apply({}, delta)];
          }

          // ask the driver to insert the new delta.
          viceroy._driver.insert(data, opts, processResults(opts, callback));
        });
      }
    }
  };
};

Viceroy.prototype._createTruncateMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  
  return function(opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // if the driver implements a truncate method
    // use it, otherwise use remove and insert.
    if(typeof viceroy._driver.truncate == 'function') {
      viceroy._driver.truncate(opts, callback);
    } else {
      viceroy._driver.remove({}, opts, function(err) {
        callback(err);
      });
    }
  };
};

Viceroy.prototype._createRemoveMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);
  var validateQuery = this._validateQuery;
  
  return function(query, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    query = query || {};
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof query != 'object') {
      callback(new Error('query must be an object')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // validate the query
    validateQuery(query, opts);

    // ask the driver to remove the data.
    viceroy._driver.remove(query, opts, processResults(opts, callback));
  };
};

Viceroy.prototype._createRemoveOneMethod = function(Model, opts) {
  
  // grab the driver, collection, and results
  // processor.
  var viceroy = this;
  var collection = opts.collection;
  var processResults = this._createResultsProcessor(Model);
  var validateQuery = this._validateQuery;
  
  return function(query, opts, callback) {

    // allow callback to the first argument.
    if(typeof opts == 'function') {
      callback = opts;
      opts = {};
    }
    query = query || {};
    opts = opts || {};
    callback = callback || function() {};
    opts.collection = collection;

    // throw errors on invalid arguments
    if(typeof query != 'object') {
      callback(new Error('query must be an object')); return;
    }
    if(typeof opts != 'object') {
      callback(new Error('opts must be an object')); return;
    }

    // validate the query
    validateQuery(query, opts);

    // if the driver has a removeOne method then
    // use it, otherwise use remove.
    if(typeof viceroy._driver.removeOne == 'function') {
      viceroy._driver.removeOne(query, opts, processResults(opts, callback));
    } else {
      opts.limit = 1;
      viceroy._driver.remove(query, opts, function(err, results) {
        return processResults(opts, callback)(err, results[0]);
      });
    }
  };
};

Viceroy.prototype._createHasOneMethod = function(Model) {
  
  // grab the driver, collection, and results
  // processor.
  var models = this._models;
  
  return function(RelModel, opts) {

    // defaults.
    if(typeof RelModel == 'string') {
      if(!models[RelModel]) { throw new Error(RelModel + ' is not a registered model'); }
      RelModel = models[RelModel].Model;
    }
    if(typeof opts == 'string') {
      opts = { getterPath: opts };
    }
    opts = opts || {};
    opts.getterPath = opts.getterPath || opts.path || RelModel.name.charAt(0).toLowerCase() + RelModel.name.substr(1);
    opts.IDPath = opts.IDPath || opts.getterPath + 'ID';

    // note that the relation has been created.
    var relationKey = 'hasOne@' + RelModel.name + '#' + opts.IDPath;
    if(Model._relationKeys[relationKey]) { return; }
    Model._relationKeys[relationKey] = true;

    // throw errors on invalid arguments
    if(typeof RelModel != 'function' || RelModel == Object) {
      throw new Error('RelModel must be a class'); return;
    }
    if(typeof opts != 'object') {
      throw new Error('opts must be an object'); return;
    }
    if(typeof opts.getterPath != 'string') {
      throw new Error('opts.getterPath must be an string'); return;
    }
    if(typeof opts.IDPath != 'string') {
      throw new Error('opts.IDPath must be an string'); return;
    }

    // create the relation on the constructor
    if(!Model._relations) { Model._relations = []; };
    if(!RelModel._relations) { RelModel._relations = []; };
    Model._relations.push({
      type: 'hasOne',
      Model: RelModel,
      opts: opts
    });
    RelModel._relations.push({
      type: 'refOne',
      Model: Model,
      opts: opts
    });
  };
};

Viceroy.prototype._createHasManyMethod = function(Model) {
  
  // grab the driver, collection, and results
  // processor.
  var models = this._models;
  
  return function(RelModel, opts) {

    // defaults.
    if(typeof RelModel == 'string') {
      if(!models[RelModel]) { throw new Error(RelModel + ' is not a registered model'); }
      RelModel = models[RelModel].Model;
    }
    if(typeof opts == 'string') {
      opts = { getterPath: opts };
    }
    opts = opts || {};
    opts.getterPath = opts.getterPath || opts.path || lingo.en.pluralize(RelModel.name.charAt(0).toLowerCase() + RelModel.name.substr(1));
    opts.IDPath = opts.IDPath || lingo.en.singularize(opts.getterPath) + 'IDs';

    // note that the relation has been created.
    var relationKey = 'hasMany@' + RelModel.name + '#' + opts.IDPath;
    if(Model._relationKeys[relationKey]) { return; }
    Model._relationKeys[relationKey] = true;

    // throw errors on invalid arguments
    if(typeof RelModel != 'function' || RelModel == Object) {
      throw new Error('RelModel must be a class'); return;
    }
    if(typeof opts != 'object') {
      throw new Error('opts must be an object'); return;
    }
    if(typeof opts.getterPath != 'string') {
      throw new Error('opts.getterPath must be an string'); return;
    }
    if(typeof opts.IDPath != 'string') {
      throw new Error('opts.IDPath must be an string'); return;
    }

    // create the relation on the constructor
    if(!Model._relations) { Model._relations = []; };
    if(!RelModel._relations) { RelModel._relations = []; };
    Model._relations.push({
      type: 'hasMany',
      Model: RelModel,
      opts: opts
    });
    RelModel._relations.push({
      type: 'refMany',
      Model: Model,
      opts: opts
    });
  };
};

Viceroy.prototype._createBelongsToOneMethod = function(Model) {
  
  // grab the driver, collection, and results
  // processor.
  var models = this._models;
  
  return function(RelModel, opts) {

    // defaults.
    if(typeof RelModel == 'string') {
      if(!models[RelModel]) { throw new Error(RelModel + ' is not a registered model'); }
      RelModel = models[RelModel].Model;
    }
    if(typeof opts == 'string') {
      opts = { getterPath: opts };
    }
    opts = opts || {};
    opts.getterPath = opts.getterPath || opts.path || RelModel.name.charAt(0).toLowerCase() + RelModel.name.substr(1);
    opts.IDPath = opts.IDPath || opts.getterPath + 'ID';

    // note that the relation has been created.
    var relationKey = 'belongsToOne@' + RelModel.name + '#' + opts.IDPath;
    if(Model._relationKeys[relationKey]) { return; }
    Model._relationKeys[relationKey] = true;

    // throw errors on invalid arguments
    if(typeof RelModel != 'function' || RelModel == Object) {
      throw new Error('RelModel must be a class'); return;
    }
    if(typeof opts != 'object') {
      throw new Error('opts must be an object'); return;
    }
    if(typeof opts.getterPath != 'string') {
      throw new Error('opts.getterPath must be an string'); return;
    }
    if(typeof opts.IDPath != 'string') {
      throw new Error('opts.IDPath must be an string'); return;
    }

    // create the relation on the constructor
    if(!Model._relations) { Model._relations = []; };
    Model._relations.push({
      type: 'belongsToOne',
      Model: RelModel,
      opts: opts
    });
  };
};

Viceroy.prototype._createBelongsToManyMethod = function(Model) {
  
  // grab the driver, collection, and results
  // processor.
  var models = this._models;
  
  return function(RelModel, opts) {

    // defaults.
    if(typeof RelModel == 'string') {
      if(!models[RelModel]) { throw new Error(RelModel + ' is not a registered model'); }
      RelModel = models[RelModel].Model;
    }
    if(typeof opts == 'string') {
      opts = { getterPath: opts };
    }
    opts = opts || {};
    opts.getterPath = opts.getterPath || opts.path || lingo.en.pluralize(RelModel.name.charAt(0).toLowerCase() + RelModel.name.substr(1));
    opts.IDPath = opts.IDPath || lingo.en.singularize(opts.getterPath) + 'IDs';

    // note that the relation has been created.
    var relationKey = 'belongsToMany@' + RelModel.name + '#' + opts.IDPath;
    if(Model._relationKeys[relationKey]) { return; }
    Model._relationKeys[relationKey] = true;

    // throw errors on invalid arguments
    if(typeof RelModel != 'function' || RelModel == Object) {
      throw new Error('RelModel must be a class'); return;
    }
    if(typeof opts != 'object') {
      throw new Error('opts must be an object'); return;
    }
    if(typeof opts.getterPath != 'string') {
      throw new Error('opts.getterPath must be an string'); return;
    }
    if(typeof opts.IDPath != 'string') {
      throw new Error('opts.IDPath must be an string'); return;
    }

    // create the relation on the constructor
    if(!Model._relations) { Model._relations = []; };
    Model._relations.push({
      type: 'belongsToMany',
      Model: RelModel,
      opts: opts
    });
  };
};

// export a constructor to create instances
// of the Viceroy class. Also expose the
// classes.
module.exports = exports = new Viceroy();

// expose all Viceroy classes.
exports.Viceroy = Viceroy;
exports.Schema = Schema;
exports.SchemaType = SchemaType;
exports.Model = Model;
exports.ModelSet = ModelSet;
exports.ValidationError = ValidationError;

},{"./model":8,"./model-set":7,"./schema":10,"./schema-type":9,"./validation-error":11,"events":38,"lingo":13,"primitive":32,"util":40}],13:[function(require,module,exports){

module.exports = require('./lib/lingo');
},{"./lib/lingo":18}],14:[function(require,module,exports){

/*!
 * Lingo - inflection
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Language = require('./language');

/**
 * Check if a `word` is uncountable.
 *
 * @param {String} word
 * @return {Boolean}
 * @api public
 */

Language.prototype.isUncountable = function(word){
  return !!this.rules.uncountable[word];
};

/**
 * Add an uncountable `word`.
 *
 * @param {String} word
 * @return {Language} for chaining
 * @api public
 */

Language.prototype.uncountable = function(word){
  this.rules.uncountable[word] = word;
  return this;
};

/**
 * Add an irreglar `singular` / `plural` map.
 *
 * @param {String} singular
 * @param {String} plural
 * @return {Language} for chaining
 * @api public
 */

Language.prototype.irregular = function(singular, plural){
  this.rules.irregular.plural[singular] = plural;
  this.rules.irregular.singular[plural] = singular;
  return this;
};

/**
 * Add a pluralization `rule` for numbers
 *
 * @param {RegExp} rule
 * @return {Language} for chaining
 * @api public
 */

Language.prototype.pluralNumbers = function(rule){
  this.rules.pluralNumbers = rule;
  return this;
};

/**
 * Add a pluralization `rule` with the given `substitution`.
 *
 * @param {RegExp} rule
 * @param {String} substitution
 * @return {Language} for chaining
 * @api public
 */

Language.prototype.plural = function(rule, substitution){
  this.rules.plural.unshift([rule, substitution]);
  return this;
};

/**
 * Add a singularization `rule` with the given `substitution`.
 *
 * @param {RegExp} rule
 * @param {String} substitution
 * @return {Language} for chaining
 * @api public
 */

Language.prototype.singular = function(rule, substitution){
  this.rules.singular.unshift([rule, substitution]);
  return this;
};

/**
 * Pluralize the given `word`.
 *
 * @param {String} word
 * @return {String}
 * @api public
 */

Language.prototype.pluralize = function(word){
  return this.inflect(word, 'plural');
};

/**
 * Check if `word` is plural.
 *
 * @param {String or Number} word
 * @return {Boolean}
 * @api public
 */

Language.prototype.isPlural = function (word) {
  if ('number' == typeof word) {
      return (this.rules.pluralNumbers || /.*/).test(word);
  } else {
      return word == this.pluralize(this.singularize(word));
  }
};

/**
 * Singularize the given `word`.
 *
 * @param {String} word
 * @return {String}
 * @api public
 */

Language.prototype.singularize = function (word) {
  return this.inflect(word, 'singular');
};

/**
 * Check if `word` is singular.
 *
 * @param {String or Number} word
 * @return {Boolean}
 * @api public
 */

Language.prototype.isSingular = function (word) {
  return !this.isPlural(word);
};


/**
 * Tableize the given `str`.
 *
 * Examples:
 *
 *    lingo.tableize('UserAccount');
 *    // => "user_accounts"
 *  
 *    lingo.tableize('User');
 *    // => "users"
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

exports.tableize = function(str){
  var underscored = exports.underscore(word);
  return Language.pluralize(underscored);
};

/**
 * Perform `type` inflection rules on the given `word`.
 *
 * @param {String} word
 * @param {String} type
 * @return {String}
 * @api private
 */

Language.prototype.inflect = function(word, type) {
  if (this.isUncountable(word)) return word;

  var irregular = this.rules.irregular[type][word];
  if (irregular) return irregular;

  for (var i = 0, len = this.rules[type].length; i < len; ++i) {
    var rule = this.rules[type][i]
      , regexp = rule[0]
      , sub = rule[1];
    if (regexp.test(word)) {
      return word.replace(regexp, sub);
    }
  }

  return word;
}

},{"./language":15}],15:[function(require,module,exports){

/*!
 * Lingo - Language
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var lingo = require('./lingo');

/**
 * Initialize a new `Language` with the given `code` and `name`.
 *
 * @param {String} code
 * @param {String} name
 * @api public
 */

var Language = module.exports = function Language(code, name) {
  this.code = code;
  this.name = name;
  this.translations = {};
  this.rules = {
      plural: []
    , singular: []
    , uncountable: {}
    , irregular: { plural: {}, singular: {}}
  };
  lingo[code] = this;
};

/**
 * Translate the given `str` with optional `params`.
 *
 * @param {String} str
 * @param {Object} params
 * @return {String}
 * @api public
 */

Language.prototype.translate = function(str, params){
  str = this.translations[str] || str;
  if (params) {
    str = str.replace(/\{([^}]+)\}/g, function(_, key){
      return params[key];
    });
  }
  return str;
};

},{"./lingo":18}],16:[function(require,module,exports){
/*!
 * Lingo - languages - English
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Language = require('../language');

/**
 * English.
 */

var en = module.exports = new Language('en', 'English');

/**
 * Number pluraluzation rule
 */
en.pluralNumbers(/[^1]/);

/**
 * Default pluralization rules.
 */

en.plural(/$/, "s")
  .plural(/(s|ss|sh|ch|x|o)$/i, "$1es")
  .plural(/y$/i, "ies")
  .plural(/(o|e)y$/i, "$1ys")
  .plural(/(octop|vir)us$/i, "$1i")
  .plural(/(alias|status)$/i, "$1es")
  .plural(/(bu)s$/i, "$1ses")
  .plural(/([ti])um$/i, "$1a")
  .plural(/sis$/i, "ses")
  .plural(/(?:([^f])fe|([lr])f)$/i, "$1$2ves")
  .plural(/([^aeiouy]|qu)y$/i, "$1ies")
  .plural(/(matr|vert|ind)(?:ix|ex)$/i, "$1ices")
  .plural(/([m|l])ouse$/i, "$1ice")
  .plural(/^(ox)$/i, "$1en")
  .plural(/(quiz)$/i, "$1zes");

/**
 * Default singularization rules.
 */

en.singular(/s$/i, "")
  .singular(/(bu|mis|kis)s$/i, "$1s")
  .singular(/([ti])a$/i, "$1um")
  .singular(/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, "$1$2sis")
  .singular(/(^analy)ses$/i, "$1sis")
  .singular(/([^f])ves$/i, "$1fe")
  .singular(/([lr])ves$/i, "$1f")
  .singular(/ies$/i, "ie")
  .singular(/([^aeiouy]|qu)ies$/i, "$1y")
  .singular(/(series)$/i, "$1")
  .singular(/(mov)ies$/i, "$1ie")
  .singular(/(x|ch|ss|sh)es$/i, "$1")
  .singular(/([m|l])ice$/i, "$1ouse")
  .singular(/(bus)es$/i, "$1")
  .singular(/(o)es$/i, "$1")
  .singular(/(shoe)s$/i, "$1")
  .singular(/(cris|ax|test)es$/i, "$1is")
  .singular(/(octop|vir)i$/i, "$1us")
  .singular(/(alias|status)es$/i, "$1")
  .singular(/^(ox)en/i, "$1")
  .singular(/(vert|ind)ices$/i, "$1ex")
  .singular(/(matr)ices$/i, "$1ix")
  .singular(/(quiz)zes$/i, "$1");

/**
 * Default irregular word mappings.
 */

en.irregular('i', 'we')
  .irregular('person', 'people')
  .irregular('man', 'men')
  .irregular('child', 'children')
  .irregular('move', 'moves')
  .irregular('she', 'they')
  .irregular('he', 'they')
  .irregular('myself', 'ourselves')
  .irregular('yourself', 'ourselves')
  .irregular('himself', 'themselves')
  .irregular('herself', 'themselves')
  .irregular('themself', 'themselves')
  .irregular('mine', 'ours')
  .irregular('hers', 'theirs')
  .irregular('his', 'theirs')
  .irregular('its', 'theirs')
  .irregular('theirs', 'theirs')
  .irregular('sex', 'sexes')
  .irregular('video', 'videos')
  .irregular('rodeo', 'rodeos');

/**
 * Default uncountables.
 */

en.uncountable('advice')
  .uncountable('enegery')
  .uncountable('excretion')
  .uncountable('digestion')
  .uncountable('cooperation')
  .uncountable('health')
  .uncountable('justice')
  .uncountable('jeans')
  .uncountable('labour')
  .uncountable('machinery')
  .uncountable('equipment')
  .uncountable('information')
  .uncountable('pollution')
  .uncountable('sewage')
  .uncountable('paper')
  .uncountable('money')
  .uncountable('species')
  .uncountable('series')
  .uncountable('rain')
  .uncountable('rice')
  .uncountable('fish')
  .uncountable('sheep')
  .uncountable('moose')
  .uncountable('deer')
  .uncountable('bison')
  .uncountable('proceedings')
  .uncountable('shears')
  .uncountable('pincers')
  .uncountable('breeches')
  .uncountable('hijinks')
  .uncountable('clippers')
  .uncountable('chassis')
  .uncountable('innings')
  .uncountable('elk')
  .uncountable('rhinoceros')
  .uncountable('swine')
  .uncountable('you')
  .uncountable('news');

},{"../language":15}],17:[function(require,module,exports){
/*!
 * Lingo - languages - Spanish
 * Copyright(c) 2010 Pau Ramon <masylum@gmail.com>
 * Based on Bermi's Python inflector http://github.com/bermi/Python-Inflector
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Language = require('../language');

/**
 * English.
 */

var es = module.exports = new Language('es', 'Español');

/**
 * Number pluraluzation rule
 */
es.pluralNumbers(/[^1]/);

/**
 * Default pluralization rules.
 */

es.plural(/$/, "es")
  .plural(/(ng|[wckgtp])$/i, "$1s")
  .plural(/([íú])$/i, "$1es")
  .plural(/z$/i, "ces")
  .plural(/([éí])(s)$/i, "$1$2es")
  .plural(/([aeiou])s$/i, "$1s")
  .plural(/([aeiouáéó])$/i, "$1s")
  .plural(/(^[bcdfghjklmnñpqrstvwxyz]*)([aeiou])([ns])$/i, "$1$2$3es")
  .plural(/([áéíóú])s$/i, "$1ses")
  .plural(/(^[bcdfghjklmnñpqrstvwxyz]*)an$/i, "$1anes")
  .plural(/([á])([ns])$/i, "a$2es")
  .plural(/([é])([ns])$/i, "e$2es")
  .plural(/([í])([ns])$/i, "i$2es")
  .plural(/([ó])([ns])$/i, "o$2es")
  .plural(/([ú])([ns])$/i, "u$2es")
  .plural(/([aeiou])x$/i, "$1x");

/**
 * Default singularization rules.
 */

es.singular(/es$/i, "")
  .singular(/([ghñpv]e)s$/i, "$1")
  .singular(/([bcdfghjklmnñprstvwxyz]{2,}e)s$/i, "$1")
  .singular(/([^e])s$/i, "$1")
  .singular(/(é)s$/i, "$1")
  .singular(/(sis|tis|xis)+$/i, "$1")
  .singular(/(ces)$/i, "z")
  .singular(/oides$/i, "oide")
  .singular(/([a])([ns])es$/i, "á$2")
  .singular(/([e])([ns])es$/i, "é$2")
  .singular(/([i])([ns])es$/i, "í$2")
  .singular(/([o])([ns])es$/i, "ó$2")
  .singular(/([u])([ns])es$/i, "ú$2")
  .singular(/^([bcdfghjklmnñpqrstvwxyz]*)([aeiou])([ns])es$/i, "$1$2$3");

/**
 * Default irregular word mappings.
 */

es.irregular('país', 'países')
  .irregular('champú', 'champús')
  .irregular('jersey', 'jerséis')
  .irregular('carácter', 'caracteres')
  .irregular('espécimen', 'especímenes')
  .irregular('menú', 'menús')
  .irregular('régimen', 'regímenes')
  .irregular('curriculum', 'currículos')
  .irregular('ultimátum', 'ultimatos')
  .irregular('memorándum', 'memorandos')
  .irregular('referéndum', 'referendos')

/**
 * Default uncountables.
 */

es.uncountable('tijeras')
  .uncountable('gafas')
  .uncountable('agua')
  .uncountable('vacaciones')
  .uncountable('víveres')
  .uncountable('déficit')


},{"../language":15}],18:[function(require,module,exports){

/*!
 * Lingo
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs');

/**
 * Library version.
 * 
 * @type String
 */

exports.version = '0.0.4';

/**
 * Expose `Language`.
 *
 * @type Function
 */

exports.Language = require('./language');

/**
 * Extend `Language` with inflection rules.
 */

require('./inflection');

/**
 * Auto-require languages.
 */

require('./languages/en');
require('./languages/es');

/**
 * Capitalize the first word of `str` or optionally `allWords`.
 *
 * Examples:
 *
 *    lingo.capitalize('hello there');
 *    // => "Hello there"
 *
 *    lingo.capitalize('hello there', true);
 *    // => "Hello There"
 *
 * @param {String} str
 * @param {Boolean} allWords
 * @return {String}
 * @api public
 */

exports.capitalize = function(str, allWords){
  if (allWords) {
    return str.split(' ').map(function(word){
      return exports.capitalize(word);
    }).join(' ');
  }
  return str.charAt(0).toUpperCase() + str.substr(1);
};

/**
 * Camel-case the given `str`.
 *
 * Examples:
 *
 *    lingo.camelcase('foo bar');
 *    // => "fooBar"
 *  
 *    lingo.camelcase('foo bar baz', true);
 *    // => "FooBarBaz"
 *
 * @param {String} str
 * @param {Boolean} uppercaseFirst
 * @return {String}
 * @api public
 */

exports.camelcase = function(str, uppercaseFirst){
  return str.replace(/[^\w\d ]+/g, '').split(' ').map(function(word, i){
    if (i || (0 == i && uppercaseFirst)) {
      word = exports.capitalize(word);
    }
    return word;
  }).join('');
};

/**
 * Underscore the given `str`.
 *
 * Examples:
 *
 *    lingo.underscore('UserAccount');
 *    // => "user_account"
 *  
 *    lingo.underscore('User');
 *    // => "user"
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

exports.underscore = function(str){
  return str.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();
};

/**
 * Join an array with the given `last` string
 * which defaults to "and".
 *
 * Examples:
 *
 *    lingo.join(['fruits', 'veggies', 'sugar']);
 *    // => "fruits, veggies and sugar"
 *
 *    lingo.join(['fruits', 'veggies', 'sugar'], 'or');
 *    // => "fruits, veggies or sugar"
 *
 * @param {Array} arr
 * @param {String} last
 * @return {String}
 * @api public
 */

exports.join = function(arr, last){
  var str = arr.pop()
    , last = last || 'and';
  if (arr.length) {
    str = arr.join(', ') + ' ' + last + ' ' + str;
  }
  return str;
};

},{"./inflection":14,"./language":15,"./languages/en":16,"./languages/es":17,"fs":39}],19:[function(require,module,exports){

var traverse = require('./traverse');

/**
 * Accepts a flat object with path keys and
 * creates an hierarchical object from those
 * paths.
 * @param  {Object} flatObject A flat object with
 *                             paths for keys.
 * @return {Object}            A hierarchical
 *                             object.
 */
function arrange(flatObject) {
  var hierarchicalObject = {};
  for(var path in flatObject) {
    var val = flatObject[path];
    traverse(path, hierarchicalObject, val);
  }
  return hierarchicalObject;
};

module.exports = arrange;

},{"./traverse":33}],20:[function(require,module,exports){

var walk = require('./walk');
var camelize = require('./camelize');

function camelizeKeys(data) {
  walk(data, function(data) {
    if(typeof data == 'object' && data != null && typeof data.push != 'function') {
      for(var property in data) {
        var val = data[property];
        delete data[property];
        data[camelize(property)] = val;
      }
    }
  });
};

module.exports = camelizeKeys;
},{"./camelize":21,"./walk":36}],21:[function(require,module,exports){

/**
 * Converts a string to camelcase
 * @param  {String} s The source string
 * @return {String}   The output string
 */
function camelize(s) {
  var i = 0;
  var o = '';
  while(i < s.length) {
    if(s[i].match(/[ \-_]/)) {
      i += 1;
      o += s[i].toUpperCase();
    } else {
      o += s[i];
    }
    i += 1;
  }
  return o;
};

module.exports = camelize;

},{}],22:[function(require,module,exports){

function declareFunction(name, constructor) {

  // ensure that the name is free of exploits.
  if(!name.match(/^[a-zA-Z0-9]+$/)) {
    throw new Error('Function name can only contain alphanumeric characters.');
  }

  // create some args so fn.length is set
  // correctly.
  var args = [];
  for(var i = 0; i < constructor.length; i += 1) {
    args.push('a' + i);
  }
  args = args.join(', ');

  // create the function with the help of eval.
  var fn;
  if(args.length > 0) {
    eval('fn = function ' + name + '(' + args + ') { constructor.call(this, ' + args + '); };');
  } else {
    eval('fn = function ' + name + '() { constructor.call(this); };');
  }
  // return the function.
  return fn;
}

module.exports = declareFunction;

},{}],23:[function(require,module,exports){

/**
 * Preforms a comparison of two values. If both
 * arguments are objects then a deep compare is
 * preformed and each property is compared
 * recursively.
 *
 * @param  {*}       a First value to be compared
 * @param  {*}       b Second value to be compared
 * @return {Boolean}   True if the the objects
 *                     match, false if not.
 */
function deepCompare(a, b) {

  // if both arguments are the same then
  // return true
  if(a === b) { return true; }

  // return false if:
  // not the same type
  if(typeof a != typeof b) { return false; }

  // an object and
  if(typeof a == 'object') {

    // not the same size
    var ia = 0;
    var ib = 0;
    var property;
    for(property in a) { ia += 1; }
    for(property in b) { ib += 1; }
    if(ia != ib) { return false; }

    // not the same property names
    for(property in a) {
      if(!property in b) { return false; }
    }
    for(property in b) {
      if(!property in a) { return false; }
    }

    // not the same values
    for(property in a) {
      if(!deepCompare(a[property], b[property])) { return false; }
    }

    return true;
  }

  // not the same value
  return false;
}

module.exports = deepCompare;

},{}],24:[function(require,module,exports){

/**
 * Del accepts a path and traverses into
 * an object, then deletes the end point
 * of the path.
 * @param  {String} path  The path to traverse.
 * @param  {Object} obj   The object to traverse.
 */
function del(path, obj) {
  var pathChunks = path.split('.');
  for(var i = 0; i < pathChunks.length; i += 1) {
    if(obj == undefined) { return; }
    if(i == pathChunks.length - 1) {
      delete obj[pathChunks[i]];
    }
    obj = obj[pathChunks[i]];
  }
};

module.exports = del;

},{}],25:[function(require,module,exports){

var find = require('./find');
var traverse = require('./traverse');
var del = require('./del');
var deepCompare = require('./deep-compare');
var merge = require('./merge');


function createDelta(path, handledPaths, delta, a, b) {

  // throw errors if a or b is not an object.
  if(typeof path != 'string') {
    throw new Error('path must be an string');
  }
  if(delta === null || typeof delta != 'object') {
    throw new Error('delta must be an object');
  }
  if(delta.$set === null || typeof delta.$set != 'object') {
    throw new Error('delta.$set must be an object');
  }
  if(delta.$unset === null || typeof delta.$unset != 'object') {
    throw new Error('delta.$unset must be an object');
  }

  // compute the types.
  var aType = getDeltaType(a);
  var bType = getDeltaType(b);

  // if the same type
  if(aType == bType) {
    var type = aType;
    var subDelta;

    // if arrays.
    if(type == 'array') {
      createArrayDelta(path, handledPaths, delta, a, b);
    }

    // if object.
    else if(type == 'object') {
      createObjectDelta(path, handledPaths, delta, a, b);
    }

    // if anything else.
    else if(a !== b) {
      delta.$set[path] = b;
    }
  }

  // if b is undefined the unset the value
  else if(b === undefined) {
    delta.$unset[path] = a;
  }

  // otherwise set the value
  else {
    if(path === '') { return b; }
    delta.$set[path] = b;
  }

  // replace unset values with 1
  for(var uProp in delta.$unset) {
    delta.$unset[uProp] = 1;
  }
}

function findDeltaRenames(handledPaths, delta, a, b) {
  if(delta === null || typeof delta != 'object') {
    throw new Error('delta must be an object');
  }
  if(delta.$rename === null || typeof delta.$rename != 'object') {
    throw new Error('delta.$rename must be an object');
  }
  if(a === null || typeof a != 'object') {
    throw new Error('a must be an object');
  }
  if(b === null || typeof b != 'object') {
    throw new Error('b must be an object');
  }

  // (function exec(path, subB) {
  //   if(getDeltaType(subB) == 'object') {
  //     for(var prop in subB) {
  //       var subPath = path && path + '.' + prop || prop;
  //       exec(subPath, subB[prop]);
  //     }
  //   } else {
  //     if(traverse(path, a) === undefined) {
  //       var newPath = find(subB, b);
  //       if(newPath && newPath != path) {
  //         handledPaths.push(path, newPath);
  //         delta.$rename[path] = newPath;
  //       }
  //     }
  //   }
  // })('', b);
}

function createObjectDelta(path, handledPaths, delta, a, b) {

  // throw errors if a or b is not an object.
  if(typeof path != 'string') {
    throw new Error('path must be an string');
  }
  if(handledPaths === null || typeof handledPaths != 'object') {
    throw new Error('handledPaths must be an array');
  }
  if(a === null || typeof a != 'object') {
    throw new Error('a must be an object');
  }
  if(b === null || typeof b != 'object') {
    throw new Error('b must be an object');
  }

  // create delta against a.
  for(var prop in a) {
    var subPath = path && path + '.' + prop || prop;
    for(var i = 0; i < handledPaths.length; i += 1) {
      if(handledPaths[i].substr(0, subPath.length) == subPath) {
        subPath = undefined;
        break;
      }
    }
    if(subPath !== undefined) {
      createDelta(subPath, handledPaths, delta, a[prop], b[prop]);
    }
  }

  // create delta against b.
  for(var prop in b) {
    var subPath = path && path + '.' + prop || prop;
    for(var i = 0; i < handledPaths.length; i += 1) {
      if(handledPaths[i].substr(0, subPath.length) == subPath) {
        subPath = undefined;
        break;
      }
    }
    if(subPath !== undefined) {
      createDelta(subPath, handledPaths, delta, a[prop], b[prop]);
    }
  }
}

function createArrayDelta(path, handledPaths, delta, a, b) {

  if(typeof path != 'string') { throw new Error('path must be an string'); }
  if(delta === null || typeof delta != 'object') {
    throw new Error('delta must be an object');
  }
  if(delta.$push === null || typeof delta.$push != 'object') {
    throw new Error('delta.$push must be an object');
  }
  if(delta.$pullAll === null || typeof delta.$pullAll != 'object') {
    throw new Error('delta.$pullAll must be an object');
  }
  if(typeof a !== 'object' || a.constructor !== Array) {
    throw new Error('a must be an array');
  }
  if(typeof b !== 'object' || b.constructor !== Array) {
    throw new Error('b must be an array');
  }

  // clone the arrays so we can destroy visited
  // indexes
  a = a.slice(0);
  b = b.slice(0);

  // remove all things in both a and b.
  for(var i = 0; i < a.length; i += 1) {
    var aType = getDeltaType(a[i]);
    for(var j = 0; j < b.length; j += 1) {
      var bType = getDeltaType(b[j]);
      var match;
      if(aType == bType && ['object', 'array'].indexOf(aType) > -1) {
        match = deepCompare(a[i], b[j]);
      } else if(aType == bType && aType == 'class') {
        match = a[i] + '' === b[j] + '';
      } else if(a[i] !== undefined) {
        match = a[i] === b[j];
      }
      if(match) {
        a.splice(i, 1); i -= 1;
        b.splice(j, 1); break;
      }
    }
  }

  // note the removals.
  for(var i = 0; i < a.length; i += 1) {
    if(!delta.$pullAll[path]) { delta.$pullAll[path] = []; }
    delta.$pullAll[path].push(a[i]);
  }

  // and additions.
  for(var i = 0; i < b.length; i += 1) {
    if(!delta.$push[path]) { delta.$push[path] = { $each: [] }; }
    delta.$push[path].$each.push(b[i]);
  }

  // note the path as handled.
  handledPaths.push(path);
}

function getDeltaType(val) {
  if(typeof val == 'object') {
    switch(val.constructor) {
      case Array:
        return 'array';
      case Object:
        return 'object';
      default:
        return 'class';
    }
  } else {
    return typeof val;
  }
}

function applyRename(obj, rename) {
  for(var aPath in rename) {
    var bPath = rename[aPath];
    var val = traverse(aPath, obj);
    del(aPath, obj);
    traverse(bPath, obj, val);
  }
}

function applySet(obj, set) {
  for(var sPath in set) {
    traverse(sPath, obj, set[sPath]);
  }
}

function applyUnset(obj, unset) {
  for(var uPath in unset) {
    del(uPath, obj);
  }
}

function applyPush(obj, push) {
  (function exec(path, push) {
    for(var prop in push) {
      var subPath = path && path + '.' + prop || prop;
      if(getDeltaType(push[prop]) == 'object') {
        exec(subPath, push[prop]);
      } else if(prop == '$each') {
        var arr = traverse(path, obj);
        for(var i = 0; i < push[prop].length; i += 1) {
          arr.push(push[prop][i]);
        }
      } else {
        var arr = traverse(subPath, obj);
        arr.push(push[prop]);
      }
    }
  })('', push);
}

function applyPull(obj, pull) {
  (function exec(path, pull) {
    for(var prop in pull) {

      var subPath = path && path + '.' + prop || prop;
      if(getDeltaType(pull[prop]) == 'object') {
        exec(subPath, pull[prop]);
      } 

      else if(getDeltaType(pull[prop]) == 'array') {
        var arr = traverse(path, obj);
        for(var i = 0; i < pull[prop].length; i += 1) {
          arr.splice(arr.indexOf(pull[prop][i]), 1);
        }
      }

      else {
        var arr = traverse(subPath, obj);
        arr.splice(arr.indexOf(pull[prop]), 1);
      }
    }
  })('', pull);
}

exports.create = function(a, b) {

  if(a === null || typeof a != 'object') { throw new Error('a must be an object'); }
  if(a === null || typeof b != 'object') { throw new Error('b must be an object'); }

  var delta = {
    $set: {},
    $unset: {},
    $push: {},
    $pullAll: {},
    $rename: {}
  };
  var handledPaths = [];
  findDeltaRenames(handledPaths, delta, a, b);
  createDelta('', handledPaths, delta, a, b);

  // delete empty delta opts
  for(var opProp in delta) {
    var prop = undefined;
    for(prop in delta[opProp]) { break; }
    if(prop == undefined) { delete delta[opProp]; }
  }

  for(var prop in delta) { break; }
  if(prop == undefined) { return; }
  
  return delta;
};

exports.apply = function(obj, delta) {
  if(obj === null || typeof obj != 'object') {
    throw new Error('obj must be an object');
  }
  if(obj === null || typeof delta != 'object') {
    throw new Error('delta must be an object');
  }
  var obj = merge({}, obj);
  var isDelta = false;
  if(delta.$rename) { isDelta = true; applyRename(obj, delta.$rename); }
  if(delta.$unset) { isDelta = true; applyUnset(obj, delta.$unset); }
  if(delta.$pull) { isDelta = true; applyPull(obj, delta.$pull); }
  if(delta.$pullAll) { isDelta = true; applyPull(obj, delta.$pullAll); }
  if(delta.$set) { isDelta = true; applySet(obj, delta.$set); }
  if(delta.$push) { isDelta = true; applyPush(obj, delta.$push); }
  if(!isDelta) { return delta; }
  return obj;
};

},{"./deep-compare":23,"./del":24,"./find":27,"./merge":31,"./traverse":33}],26:[function(require,module,exports){

/**
 * Create a new merged object from one or more
 * source objects.
 *
 * @return {Object} The new merged object
 */
function extend(    ) {
  var objs = Array.prototype.slice.call(arguments);
  var newObj = objs[0] instanceof Array ? [] : {};
  var deepCopy = objs[objs.length - 1] == true;
  if(deepCopy) { objs.pop(); }
  while(objs[0]) {
    var obj = objs.shift();
    if(typeof obj !== 'object') { throw new Error('all arguments must be an object'); }
    for(var key in obj) {
      if(!obj.hasOwnProperty(key)) { continue; }
      if(deepCopy && typeof obj[key] == 'object') {
        newObj[key] = extend(obj[key], true);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  return newObj;
};

module.exports = extend;

},{}],27:[function(require,module,exports){


function find(target, obj, offset) {

  offset = offset || 0;

  if(typeof obj != 'object' || obj.constructor !== Object) {
    throw new Error('obj must be an object');
  }
  if(typeof offset != 'number') {
    throw new Error('offset must be a number');
  }

  return (function exec(path, obj) {
    for(var prop in obj) {
      var val = obj[prop];
      var subPath = path && path + '.' + prop || prop;

      // if the val is an object then recurse.
      if(typeof val == 'object') {
        var targetPath = exec(subPath, val);
        if(targetPath) {
          if(offset) { offset -= 1; }
          else { return targetPath; }
        }
      }

      // if the property val matches the target.
      if(val === target) {
        if(offset) { offset -= 1; }
        else { return subPath; }
      }
    }
  })('', obj);
}

module.exports = find;

},{}],28:[function(require,module,exports){

/**
 * Flattens a hierarchical object. Keys become
 * paths.
 * @param  {Object} hierarchicalObject An
 *                                     hierarchical
 *                                     object.
 * @return {Object}                    A flat
 *                                     object.
 */
function flatten(hierarchicalObject) {
  var flatObject = {};
  (function exec(basePath, obj) {
    for(var property in obj) {
      if(!obj.hasOwnProperty(property)) { continue; }
      var path = (basePath && basePath + '.' || '') + property;
      if(
        typeof obj[property] == 'object' &&
        [Object, Array].indexOf(obj[property].constructor) > -1
      ) {
        exec(path, obj[property]);
      } else {
        flatObject[path] = obj[property];
      }
    }
  })('', hierarchicalObject);
  return flatObject;
};

module.exports = flatten;

},{}],29:[function(require,module,exports){

var walk = require('./walk');
var hyphenate = require('./hyphenate');

function hyphenateKeys(data) {
  walk(data, function(data) {
    if(typeof data == 'object' && data != null && typeof data.push != 'function') {
      for(var property in data) {
        var val = data[property];
        delete data[property];
        data[hyphenate(property)] = val;
      }
    }
  });
};

module.exports = hyphenateKeys;

},{"./hyphenate":30,"./walk":36}],30:[function(require,module,exports){

/**
 * Converts a string to hyphens
 * @param  {String} s The source string
 * @return {String}   The output string
 */
function hyphenate(s) {
  var i = 0;
  var o = '';
  while(i < s.length) {
    if(s[i].match(/[A-Z\d]/)) {
      o += '-' + s[i].toLowerCase();
    } else if(s[i].match(/[ _]/)) {
      o += '-';
    } else {
      o += s[i];
    }
    i += 1;
  }
  return o;
};

module.exports = hyphenate;

},{}],31:[function(require,module,exports){

/**
 * Merge source objects into an existing object.
 * @return {Object} The new merged object
 */
function merge(targetObj    ) {
  var objs = Array.prototype.slice.call(arguments, 1);
  var deepMerge = objs[objs.length - 1] == true;
  if(deepMerge) { objs.pop(); }
  while(objs[0]) {
    var obj = objs.shift();
    if(typeof obj !== 'object') { throw new Error('all arguments must be an object'); }
    for(var key in obj) {
      if(!obj.hasOwnProperty(key)) { continue; }
      if(
        deepMerge && typeof obj[key] == 'object' && (
          typeof targetObj[key] == 'object' ||
          typeof targetObj[key] == undefined
        )
      ) {
        if(typeof targetObj[key] == undefined) {
          targetObj[key] = {};
        }
        merge(targetObj[key], obj[key], true);
      } else {
        targetObj[key] = obj[key];
      }
    }
  }
  return targetObj;
};

module.exports = merge;

},{}],32:[function(require,module,exports){

// OBJECT FUNCTIONS
exports.arrange = require('./arrange');
exports.deepCompare = require('./deep-compare');
exports.del = require('./del');
exports.extend = require('./extend');
exports.flatten = require('./flatten');
exports.find = require('./find');
exports.merge = require('./merge');
exports.traverse = require('./traverse');
exports.walk = require('./walk');
exports.delta = require('./delta');
exports.declareFunction = require('./declare-function');

// STRING FUNCTIONS
exports.camelize = require('./camelize');
exports.camelizeKeys = require('./camelize-keys');
exports.hyphenate = require('./hyphenate');
exports.hyphenateKeys = require('./hyphenate-keys');
exports.underscore = require('./underscore');
exports.underscoreKeys = require('./underscore-keys');

},{"./arrange":19,"./camelize":21,"./camelize-keys":20,"./declare-function":22,"./deep-compare":23,"./del":24,"./delta":25,"./extend":26,"./find":27,"./flatten":28,"./hyphenate":30,"./hyphenate-keys":29,"./merge":31,"./traverse":33,"./underscore":35,"./underscore-keys":34,"./walk":36}],33:[function(require,module,exports){

/**
 * Traverse accepts a path and traverses into
 * an object. If a value is given then
 * the end point of the path is set with the
 * given value.
 * @param  {String} path  The path to traverse.
 * @param  {Object} obj   The object to traverse.
 * @param  {*}      value [optional] A value to
 *                        assign to the end point
 *                        of the path.
 * @return {*}            The value at the end
 *                        of the traversal.
 */
function traverse(path, obj, value) {
  var pathChunks = path.split('.');
  for(var i = 0; i < pathChunks.length; i += 1) {

    // stop if the cursor is undefined
    if(obj == undefined) { return; }

    // if we are setting a value...
    if(value !== undefined) {

      // set the value if the cursor is at the end
      // of the path.
      if(i == pathChunks.length - 1) {
        obj[pathChunks[i]] = value;
      }

      // if the object does not have the current
      // path chunk create it.
      else if(obj[pathChunks[i]] === undefined) {

        // if the next chunk looks like an array
        // key then create an array.
        if(pathChunks[i + 1] == parseFloat(pathChunks[i + 1])) {
          obj[pathChunks[i]] = [];
        }

        // otherwise create an object.
        else { obj[pathChunks[i]] = {}; }
      }
    }

    // move the cursor down the path
    obj = obj[pathChunks[i]];


  }
  return obj;
};

module.exports = traverse;

},{}],34:[function(require,module,exports){

var walk = require('./walk');
var underscore = require('./underscore');

function underscoreKeys(data) {
  walk(data, function(data) {
    if(typeof data == 'object' && data != null && typeof data.push != 'function') {
      for(var property in data) {
        var val = data[property];
        delete data[property];
        data[underscore(property)] = val;
      }
    }
  });
};

module.exports = underscoreKeys;

},{"./underscore":35,"./walk":36}],35:[function(require,module,exports){

/**
 * Converts a string to underscore
 * @param  {String} s The source string
 * @return {String}   The output string
 */
function underscore(s) {
  var i = 0;
  var o = '';
  while(i < s.length) {
    if(s[i].match(/[A-Z\d]/)) {
      o += '_' + s[i].toLowerCase();
    } else {
      o += s[i];
    }
    i += 1;
  }
  return o;
};

module.exports = underscore;

},{}],36:[function(require,module,exports){

/**
 * Walks every property of an object and its
 * children recursively.
 * @param  {Object|Array} data     The subject 
 *                                 object or 
 *                                 array.
 * @param  {Function}     callback A function that
 *                                 will accept 
 *                                 each property.
 */
function walk(data, callback, includeRoot) {
  (function _walk(path, data, include) {
    if(include && typeof callback == 'function') { callback(data, path); }
    path += path && '.' || '';
    var propPath;
    if(typeof data == 'object' && data != null && data.constructor == Array) {
      for(var i = 0; i < data.length; i += 1) {
        _walk(path + i, data[i], true);
      }
    } else if(typeof data == 'object') {
      for(var property in data) {
        _walk(path + property, data[property], true);
      }
    }
  })('', data, includeRoot || false);
}

module.exports = walk;
},{}],37:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],38:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!util.isNumber(n) || n < 0)
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (util.isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (util.isUndefined(handler))
    return false;

  if (util.isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (util.isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              util.isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (util.isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (util.isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!util.isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  function g() {
    this.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (util.isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (util.isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (util.isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (util.isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (util.isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};
},{"util":40}],39:[function(require,module,exports){

// not implemented
// The reason for having an empty file and not throwing is to allow
// untraditional implementation of this module.

},{}],40:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var shims = require('_shims');

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  shims.forEach(array, function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }

  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = shims.reduce(output, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return shims.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.binarySlice === 'function'
  ;
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":37}],41:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],42:[function(require,module,exports){
var viceroy = require('viceroy');
var util = require('util');

// create and register the Persion model
function Person() {
  viceroy.Model.apply(this, arguments);
}

util.inherits(Person, viceroy.Model);
viceroy.model(Person);

module.exports = Person;

},{"util":40,"viceroy":12}]},{},[1])
;