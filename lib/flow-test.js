'use strict';
var Flow = require('./flow');

var crypto = require('crypto');

// Set async time randomicity emulation
var interval = 450, stime = 400;

// Ramdom error state generator
function randerr(rate) {
  var error, rand;
  if (rate) {
    rand = Math.floor(Math.random() * 100);
    error = (rand < rate) ? 'Error-' + crypto.randomBytes(2).toString('hex') : undefined;
  } else {
    error = false;
  }
  return error;
}

// Async task (same in all examples in this chapter)
function task(a, cb) {
  var time = (Math.random() * interval) + stime;
  setTimeout(function () {
    var err = randerr(rate),
      out = err || a * 2;
    if (err) {
      cb(err);
    } else {
      cb(false, out);
    }
  }, time);
}

function f1(a, callback) {
  var time = (Math.random() * interval) + stime,
    args = JSON.stringify(arguments);
  setTimeout(function () {
    var err = randerr(rate),
      out = err || a * 2;
    if (err) {
      callback(err);
    } else {
      callback(false, out);
    }
  }, time);
}

function f2(a, b, callback) {
  var time = (Math.random() * interval) + stime,
    args = JSON.stringify(arguments);
  setTimeout(function () {
    var err = randerr(rate),
      out = err || a * b * 2;
    if (err) {
      callback(err);
    } else {
      callback(false, out);
    }
  }, time);
}

function f3(a, b, c, callback) {
  var time = (Math.random() * interval) + stime,
    args = JSON.stringify(arguments);
  setTimeout(function () {
    var err = randerr(rate),
      out = err || a * b * c * 2;
    if (err) {
      callback(err);
    } else {
      callback(false, out);
    }
  }, time);
}

var hr = function (char) {
  var line = char;
  for (var i = 0; i < (process.stdout.columns - 1); i++) {
    line = line + char;
  }
  console.log(line);
};

// Final task (same in all the examples)
function final(errors, results) {
  console.log('\n');
  hr('~');
  console.log('Dokončeno v pořadí: ');
  hr('~');
  console.log(results.queue);
  hr('~');
  console.log('Seřezené výsledeky: ');
  hr('~');
  console.log(results.sorted);
  hr('~');
  console.log('Chybné výsledky: ');
  hr('~');
  console.log(errors);
  hr('~');
  console.log('Časy dokončení: ');
  hr('~');
  console.log(results.times);
  hr('~');
}

var arr = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    function (cb) { f1(32, cb); },
    function (cb) { f2(32, 16, cb); },
    function (cb) { f3(32, 16, 8, cb); }
  ];

var flow = new Flow(),
  args = process.argv,
  rate = parseInt(args[2], 10) || 0,
  limit = parseInt(args[3], 10) || 0,
  err = (args[4]) ? true : false,
  options = {
    iterator: function(a, cb) { task(a, cb); },
    limit: limit || 0,
    errorbreak: err,
    debugmode: true
  };

console.log(['\n<TEST> ' + 'Chybovost : ' + rate + '%, limit: ' +
  limit + ', break při chybě: ' + err].toString() + ', debugmode: ' +
  options.debugmode + '\n');

var testy = function (options) {
  flow.cf(arr, options, final);
};

var testy2 = function (options) {
  flow.serial(arr, options, final);
};

/*RUN>>>>*/
testy(options);
//testy2(options);
