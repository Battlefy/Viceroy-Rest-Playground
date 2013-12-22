var domstream = require('domnode-dom');

function ReConnect () {
  this._firstBoot = true;
  this._routes = {};
  this._addPopstateListener();
  this._addClickListener();
  this.stack = [];
  for (var i = 0; i < arguments.length; ++i) {
    this.use(arguments[i]);
  }
}

ReConnect.prototype._addPopstateListener = function() {
  var _this = this;
  window.addEventListener("popstate", function(e) {
    if(_this._routeExists(window.location.pathname)){
      _this.listen();
    }
  });
}

// override this for custom logic onFirstBoot
ReConnect.prototype.onFirstBoot = function() {}

ReConnect.prototype._onFirstBoot = function() {
  this.onFirstBoot()
}

ReConnect.prototype._getResponse = function(req, res) {
  var body = document.querySelector('body');
  var stream = domstream.createWriteStream(body, 'text/html');
  return stream;
}

ReConnect.prototype._addClickListener = function() {
  var _this = this;

  document.addEventListener("click", function(e) {
    if(e.srcElement.href){
      e.preventDefault()
      var matches = e.srcElement.href.split(window.location.protocol + '//')
      var link = matches.join('').split('/').slice(1, matches.length).join('/');
      if(link.substring(1) !== '/') { link = '/' + link}
      history.pushState(null, null, link);
      if(_this._routeExists(link)){
        _this.listen();
        e.preventDefault();
      }
    }
  }, false);

}

ReConnect.prototype._routeExists = function(route) {
  for(var i = 0; i < this.stack.length; i++){
    if(this.stack[i].route === route) {
      return true;
    }
  }
  return false;
}

ReConnect.prototype.listen = function() {
  var req = {
    url: window.location.href,
    pathname: window.location.pathname
  }
  var res = this._getResponse();
  this.handle(req, res, function() {});
}

ReConnect.prototype.handle = function(req, res, out) {
  var _this = this;
  var stack = this.stack;
  var index = 0;
  var layer = stack[index];

  function next(err) {
    if(!layer) {
      // and were done
      if(out) return out(err);
    } else {
      if(window.location.pathname === layer.route) {
        if(_this._firstBoot){
          _this._onFirstBoot();
        }
        layer.handle(req, res, next);
      } else {
        layer = stack[index++];
        next();
      }
    }
  }
  next();
}

ReConnect.prototype.use = function(route, fn) {
  if(typeof route !== 'string') {
    fn = route;
    route = '/';
  }
  this.stack.push({route: route, handle: fn});
  return this;
}

module.exports = function (){
  return new ReConnect;
};
