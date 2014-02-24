//tests
"use strict";
var valid_file = '/usr/share/backgrounds/gnome/Road.jpg';
var IM = require('./im');

var im = new IM();


//validate and processing if valid
im.validate(valid_file, ['PNG', 'JPEG', 'GIF'], function(err, valid) {
  if (valid) {
    console.log('OK file je povolený typ');
    im.convert(valid_file, ['-resize', 145, '-auto-orient', '-quality', 20, '-debug', 'cache'], 'thumb.jpg', function(err, data) {
      if (err) {
        console.log("Error při konverzi: " + err);
      } else {
        console.log(data);
      }
    });
  } else {
    console.log('Soubor ' + valid_file + ' není povolený typ souboru !!!');
  }
});
