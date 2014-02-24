"use strict";
var Hauth = require('../public/js/hauth.js');
var model = require('../models/DB');
var crypto = require('crypto');
var hauth = new Hauth();
var NOCACHE = {"Cache-control": "no-cache,no-store, must-revalidate"};
var nonOKdelay = 1000; /*1sec delay when non 200 responses*/

function gensid() {
  return crypto.randomBytes(24).toString('base64');
}

/*******  formuláře  *************************************/
module.exports.login = function login(req, res, next) {
  res.set(NOCACHE);
  res.render('login', {
    title: 'Přihlášení'
  });
};

module.exports.logout = function logout(req, res, next) {
  req.session = null; /*destroy session*/
  res.locals.user = null; /*delete loged username from views*/
  res.set(NOCACHE);
  res.redirect('/');
};

/*Main controller - public or private user request ***********/
module.exports.autentificated = function auth(publicurls) {
  return function auth (req, res, next) {
    if (req.session.user) {
      req.session.sid = gensid(); /*regenerate sid for auth users every request*/
      res.locals.user = req.session.user; /*Set loged username for views*/
      next();
    } else { /*public user*/
      req.session = null; /*Don't create session cookie*/
      console.log('PUBLICURLS ' + publicurls, 'PATH ' + req.path);
      if (publicurls.indexOf(req.path) >= 0) {
        next();
      } else {
        res.render('denny', {title: 'Přístup odepřen!'});
      }
    }
  };
};

/********Ged uid key from db if user exists and generate and save nonce key ************/
module.exports.finduser = function (req, res, next) {
  res.set(NOCACHE);
  console.log('HLEDA SE NEMO : ');
  var rh = req.headers;
  var requser = rh['x-' + hauth.pref + '-request-auth'];
  if (!requser) {
    setTimeout(function() {
      res.send(405, 'Invalid format of userid request headers!');
    }, nonOKdelay);
  } else {
    var sql = "SELECT * FROM users WHERE username=?";
    model.query(sql, [requser], false, function (err, cred) {
      if (err) return next('Chyba databáze ' + err); /*Database error*/
      var userid, secret, confirmkey; /*User credentials*/
      if (typeof cred[0] === 'object') {
        userid = cred[0].userid;
        secret = cred[0].secret;
        confirmkey = cred[0].confirmkey;
      }
      if (userid && secret) {
        //create new nonce or use nonce in db and resoponse
        var nonce = (confirmkey) ? confirmkey : crypto.randomBytes(16).toString('hex');
        res.send(200, userid + ':' + nonce);
      } else { //user not found
        setTimeout(function() {
          res.send(404, 'Valid registered user not found..');
        }, nonOKdelay);
      }
    });
  }
};

/********* Autentifikace kontrola podpisu klienta a podepsané odpovědí ********/
module.exports.auth = function (req, res, next) {
  res.set(NOCACHE);
  var rh = req.headers;
  /*Validate auth headers format*/
  var parseok = hauth.parse(rh);
  if (!parseok.res) {
    setTimeout(function() {
      res.send(405, 'Invalid format of auth headers. ' + parseok.msg);
    }, nonOKdelay);
  } else {
    /*Parse uid and nonce from req headers*/
    var userid = rh['x-' + hauth.pref + '-user-key'];
    var nonce = rh['x-' + hauth.pref + '-nonce'];
    var sql = "SELECT * FROM users WHERE userid=?";
    model.query(sql, [userid], false, function(err, cred) {
      if (err) return next('Chyba databáze ' + err); /*Database error*/
      /*Get username for obtained userid and secret shared key*/
      var user, secret, confirmkey;
      if (typeof cred[0] === 'object') {
        secret = cred[0].secret;
        user = cred[0].username;
        confirmkey = cred[0].confirmkey;
      }
      /*Validate that nonce in headers === confirmkey*/
      if (nonce !== confirmkey) {
        res.send(403, 'Nonce key in headers is invalid');
      }
      /*User exists and have secret shared key*/
      if (user && secret) {
        /*Validate headers with secret key*/
        var valid = hauth.validate(secret, rh, req.url);
        if (valid.res) {
          /*Auth OK 200 => generate session key*/
          req.session = {}; /*session object create only private pages*/
          req.session.sid = gensid(); /*regenerated every request*/
          req.session.user = user; /*save userid*/
          /*Generate and save new nonce to db*/
          var sql = "UPDATE users SET confirmkey=? WHERE userid=?";
          var newconfirm = crypto.randomBytes(16).toString('hex');
          model.query(sql, [newconfirm, userid], false, function(err) {
            if (err) return next('Chyba databáze ' + err); /*Database error*/
            /*Sign server response for client validation*/
            var sigokauth = hauth.mkSigHeaders(secret, userid, nonce, req.url);
            if (sigokauth.res) {
              res.set(sigokauth.res); /*signed auth 200 OK response*/
              res.send(200, 'Login OK, Welcome the matrix');
            } else {  /*sign request failed -> undefined server error*/
              res.send(500, 'Signing response headers failed ' + sgokauth.msg);
            }
          });
        } else {
          /*Denny validation failed*/
          setTimeout(function() {
            res.send(403, 'Access denied - invalid credentials! ' + valid.msg);
          }, nonOKdelay);
        }
      } else {
        setTimeout(function() {
          /*Db not return any credentials - invalid userid*/
          res.send(404, 'User nod found in the matrix..');
        }, nonOKdelay);
      }
    });
  }
};
