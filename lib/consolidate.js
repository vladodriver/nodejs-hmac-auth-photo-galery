var fs = require('fs'),
  path = require('path'),
  join = path.join,
  extname = path.extname,
  dirname = path.dirname,
  dot = require('dot');

var readCache = {};
var cacheStore = {};

exports.clearCache = function() {
  cacheStore = {};
};

function cache(options, compiled) {
  // cachable
  if (compiled && options.filename && options.cache) {
    delete readCache[options.filename];
    cacheStore[options.filename] = compiled;
    return compiled;
  }
  // check cache
  if (options.filename && options.cache) {
    return cacheStore[options.filename];
  }
  return compiled;
}

function read(path, options, fn) {
  var str = readCache[path];
  var cached = options.cache && str && 'string' == typeof str;
  // cached (only if cached is a string and not a compiled template function)
  if (cached) return fn(null, str);
  // read
  fs.readFile(path, 'utf8', function(err, str){
    if (err) return fn(err);
    // remove extraneous utf8 BOM marker
    str = str.replace(/^\uFEFF|\n$/, '');
    if (options.cache) readCache[path] = str;
    fn(null, str);
  });
}

exports.dot = function(path, options, fn) {
  options.filename = path;
  if (cache(options)) {
    exports.dot.render('', options, fn);
  } else {
    read(path, options, function(err, str){
      if (err) return fn(err);
      exports.dot.render(str, options, fn);
    });
  }
};

exports.dot.render = function (str, options, fn) {
  try {
    var tmpl = cache(options) || cache(options, dot.compile(str, options));
    fn(null, tmpl(options));
  } catch (err) {
    fn(err);
  }
};
