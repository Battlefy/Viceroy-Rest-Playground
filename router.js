var appView = require('./views/app');
var isServer = typeof window === 'undefined';

var headerTemplate = [
  "<html>",
    "<head>",
    "</head>",
  "<body>"
].join('')

var footerTemplate = [
  "<!-- async script load -->",
  "<script type=\"text/javascript\">",
    "(function() {",
      "var po = document.createElement('script'); po.type = 'text/javascript';",
       "po.async = true; po.src = './app.js';",
      "var s = document.getElementsByTagName('script')[0];",
       "s.parentNode.insertBefore(po, s);",
    "})();",
  "</script>",
  "</body>",
  "</html>"
].join('')

function Router(opts) {
  var _this = this;
  this.opts = opts;
  this.app = opts.app;
  this.headerTemplate = opts.headerTemplate || headerTemplate;
  this.footerTemplate = opts.footerTemplate || footerTemplate;

  for(var prop in opts.routes){
    this.route(prop, opts.routes[prop]);
  }
}

Router.prototype._getResponse = function(req, res) {
  // if on server, wrap response in header/footer
  if(isServer){
    var _this = this;
    res.write(_this.headerTemplate);
    var realEnd = res.end;
    res.end = function() {
      res.write(_this.footerTemplate);
      realEnd.apply(this);
    }
  }
  return res;
}

Router.prototype.route = function(route, callback) {
  var _this = this;
  _this.app.use(route, function(req, res, next){
    res = _this._getResponse(req, res);
    callback(req, res, next);
  });
}

module.exports = Router
