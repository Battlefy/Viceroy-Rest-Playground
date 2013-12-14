var fs = require('fs');
var hyperglue = require('hyperglue');
var html = fs.readFileSync('./person.html');

module.exports = function renderTemplate (data) {
  return hyperglue(html, {
    '.name': data.name,
    '.id': data._id
  });
}
