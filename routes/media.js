"use strict";
var Model = require('../models/DB.js'),
  IM = require('../lib/im.js'),
  path = require('path'),
  join = path.join,
  fs = require('fs'),
  multiparty = require('multiparty'),
  mediahandler = require('./mediahandler.js'),
  Model = require('../models/DB.js');

module.exports.form = function (req, res) {
  res.render('upload', {
    title: 'Nahrej fotku ..'
  });
};

module.exports.submit = function (dir) {
  return function (req, res, next) {
    var upload = new multiparty.Form({
      maxFieldSize: 20000000,
      uploadDir: dir
    });
    upload.on('part', function(part) {
      console.log(part.filename + ' has ben uploaded.');
    });
    /*Parse form data and send to processing media*/
    upload.parse(req, function(err, fields, files) {
      if (err) return next(err);
      var isupload = files.media;
      if(!isupload) {
        return res.status(500).send('Server error on media upload!');
      }
      mediahandler(isupload, 5, function(err, results) {
        res.render('newmedia', {
          title: "Výsledek uploadu",
          errors: err,
          times: results.times,
          queue: results.queue,
          sorted: results.sorted
        });
      });
    });
  };
};

module.exports.list = function(table) {
  return function (req, res, next) {
    var columns = ["id", "name", "ext", "file_id"];
    var page = parseInt(req.params.page, 10) || 1;
    var limit = parseInt(req.params.limit, 10) || 10;
    var sort_by = req.params.sortby || 'name';

    Model.query("SELECT " + columns.join(', ') + " FROM " + table, null, {
      limit: limit,
      page: page,
      order: sort_by
    }, function (err, media, pager) {
      if (err) return next(err);
      var pagenums = [];
      for (var n = 1; n <= pager.last_pg; n++) {
        pagenums.push(n.toString());
      }
      res.render('index', {
        title: 'Fotogalerka',
        media: media,
        pager: pager,
        pagenums: pagenums
      });
    });
  };
};

module.exports.display = function (dir, table) {
  return function (req, res, next) {
    var col, file_id, type, fpath;
    col = 'file_id';
    file_id = req.params.file_id;
    type = req.params.type;

    Model.query("SELECT * FROM " + table + " WHERE " + col + " = ?", [file_id], false, function (err, media) {
      if (err) return next('CHYBA ' + err);
      if (!media) {return res.status(404).send('Nenalezeno!');}
      media = media[0];
      if (type === "thumb") {
        fpath = join(dir, 'thumb_' + media.file_id + '.jpg');
      } else if (type === "full") {
        fpath = join(dir, media.file_id + media.ext);
      } else {
        res.status(404).send('Not found - Nenalezeno !');
      }
      res.sendfile(fpath, {maxAge: 345600000});
    });
  };
};

//TODO predelat na editacni page upravy/mazani....
module.exports.deleting = function (req, res, next) {
  var fid = req.params.file_id;
  res.render('delete', {
    title: 'Vymazání fotografie!',
    file_id: fid
  });
};

module.exports.remove = function (dir, table) {
  return function (req, res, next) {
    var col, file_id, img_path, thumb_path;
    col = 'file_id';
    file_id = req.params.file_id;

    if(req.body.confirm !== 'yes') {
      return res.redirect('/');
    }

    Model.query("SELECT * FROM " + table + " WHERE " + col + " = ?", [file_id], null, function (err, media) {
      if (err) return next(err);
      media = media[0];
      if (!media) {
        return res.status(404).send('Nelze vymazat - Nenalezeno v databázi!');
      }

      Model.query("DELETE  FROM " + table + " WHERE " + col + " = ?", [file_id], null, function (err) {
        if (err) return next(err);
        img_path = join(dir, media.file_id + media.ext);
        thumb_path = join(dir, 'thumb_' + media.file_id + '.jpg');
        res.redirect('/');
        [img_path, thumb_path].forEach(function(i) {
          fs.unlink(i, function (err) {
            if (err) return next(err);
          });
        });
        console.log(file_id + ' removed from DB!');
      });
    });
  };
};
