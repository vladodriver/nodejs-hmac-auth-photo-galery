var path = require('path');
var Flow = require('../lib/flow.js');
var fs = require('fs');
var crypto = require('crypto');
var IM = require('../lib/im');
var Model = require('../models/DB.js');

var im = new IM();
var sqltable = 'library'; /*SQL table for media*/

function onemedia(onefileob, final) {
  var fileid = crypto.randomBytes(16).toString('hex'); /*generated img name for save*/
  var uplpath = onefileob.path; /*path to uploaded file*/
  var filename = onefileob.originalFilename || '__empty__'; /*Original media filename to db*/
  var filetype = path.extname(filename);
  var imgpath = path.join(path.dirname(uplpath), fileid) + filetype;
  var thumbname = 'thumb_' + fileid + '.jpg';
  var thumbpath = path.join(path.dirname(uplpath), thumbname);

  /*Delete path and thumb when tasks returning any error*/
  var clean = function clean(files) {
    files.forEach(function(media) {
      fs.unlink(media, function(err) {
        if(!err) {
          console.log('Soubor ' + media + ' byl vymazán!');
        } else {
          console.log(err);
        }
      });
    });
  };

  /*tasks runs serial on one image file*/
  var tasks = [
    function renaming(cb) { /*rename image to orig name*/
      fs.rename(uplpath, imgpath, function(err) {
        if (err) {
          cb(' Uložení ' + filename + ' selhalo chyba: ' + err);
        } else {
          cb(null, ' Uložení ' + filename + ' OK ');
        }
      });
    },
    function mkThumb(cb) { /*create Thumb icon*/
      im.convert(imgpath, ['-resize', 'x100', '-auto-orient', 
        '-quality', 50, '-strip'], thumbpath, function(err, result){
          if (err) {
            cb(' Vytvoření náhledu ' + filename + ' selhalo chyba: ' + err);
            clean([imgpath]);
          } else {
            cb(null, ' Vytvoření náhledu ' + filename + ' OK ');
          }
        });
    },
    function save(cb) { /*save data to db*/
      var values = [null, filename, filetype, fileid];
      Model.query("INSERT INTO " + sqltable + " VALUES(?, ?, ?, ?)", values, false, function(err, result) {
        if (err) {
          cb(' Uložení záznamu o médiu ' + filename + ' selhalo chyba: ');
          clean([imgpath, thumbpath]);
        } else {
          cb(null, ' Údaje k souboru ' + filename + ' uloženy OK ');
        }
      });
    }
  ];

  var flow = new Flow();
  flow.cf(tasks, { errorbreak: true, limit: 1, debugmode: false }, function (err, results) {
    return (err) ? final(err, results) : final(null, results);
  });
}

function multifile(files, limit, final) {
  var flow = new Flow();
  flow.cf(files, { iterator: onemedia, limit: limit, debugmode: true }, function (err, results) {
    return (err) ? final(err, results) : final(null, results);
  });
}

module.exports = multifile;
