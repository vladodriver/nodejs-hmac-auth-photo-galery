"use strict";
var path = require('path'),
  spawn = require('child_process').spawn,
  fs = require('fs');

var IM = function () {
  this.execname = {
    convert: 'convert',
    identify: 'identify'
  };
  this.env = {
    //'MAGICK_MAP_LIMIT': 10000,
    //'MAGICK_MEMORY_LIMIT': 10000,
    //'MAGICK_TEMPORARY_PATH': process.cwd()
  };
};

IM.prototype = {
  /*return true||false for file type in||not in valid mimetypes Array*/
  validate: function (file, mimetypes, next) {
    var fileMime, i;
    this.identify(file, "%m", function (err, data) {
      if (err) {
        return next(err);
      }
      fileMime = data.toString(); //je to buffer
      for (i = 0; i < mimetypes.length; i = +1) {
        if (mimetypes[i] === fileMime) {
          return next(false, true);
        }
      }
      return next(false);
    });
  },

  /*identify commandmethod*/
  identify: function (file, fmt_string, next) {
    var cmd = this.execname.identify,
      params = ['-format', fmt_string, file];
    return this._spawn(cmd, params, next);
  },

  /*convert command method OPTIONS IS ARRAY cmdline params*/
  convert: function (file, options, output_file, next) {
    var cmd = this.execname.convert,
      params = Array.prototype.concat(file, options, output_file);
    return this._spawn(cmd, params, next);
  },

  /*execute processing and return results stdout stderr*/
  _spawn: function (cmd, params, next) {
    
    var exec = spawn(cmd, params, {env: this.env});
    var out, err;
    exec.stdout.on('data', function (data) {
      out = data.toString();
    });
    exec.stderr.on('data', function (data) {
      err = data.toString();
    });
    exec.on('close', function (code) {
      if (code === 0) {
        next(false, out || 'Conversion image OK');
      } else {
        next(err, null);
      }
    });
  }
};

module.exports = IM;
