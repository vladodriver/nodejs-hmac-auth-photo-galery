"use strict";
var ip = process.env.OPENSHIFT_DIY_IP || '::',
  port = process.env.OPENSHIFT_DIY_PORT || '8000';

var express = require('express'),
  media = require('./routes/media'),
  env = require('./routes/env'),
  //https = require('https'),
  http = require('http'),
  path = require('path'),
  fs = require('fs'),
  dot = require('dot'),
  engine = require('./lib/consolidate').dot,
  auth = require('./routes/auth');

var app = express();
app.configure(function () {
  app.set('sport', process.env.PORT || 6101);
  app.set('views', __dirname + '/views');
  dot.templateSettings.strip = false;
  app.engine('dot', engine);
  app.set('view engine', 'dot');
  app.set('title', 'Fotky - pokus.com'); /*Main default title*/

  app.locals.loadfile = function(path) {
    return fs.readFileSync(app.get('views') + '/' + path, 'utf8')
    .replace(/\uFEFF|\n$/, '');
  };
  app.locals.title = app.get('title');
  app.locals.publicurls = ['/login', '/login/auth', '/login/userid',
    '/env', '/upload']; /*public urls*/
  app.set('mediafiles', __dirname + '/../data/files/media'); /*upload media path*/

  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.compress({threshold: 0}));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(express.cookieParser('740dec8cb40847f9a8f74091f3ac0142'));
  app.use(express.cookieSession({key:'UAC', cookie:{ maxAge: 20*60*1000}}));
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: 186400000 }));
  app.use(auth.autentificated(app.locals.publicurls));
});

//dev only
app.configure('development', function () {
  app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

app.get('/', media.list('library'));
app.get('/library/page/:sortby?/:limit?/:page?', media.list('library'));
app.get('/upload', media.form);
app.post('/upload', media.submit(app.get('mediafiles')));
app.get('/media/:file_id/delete', media.deleting);
app.post('/media/:file_id/delete', media.remove(app.get('mediafiles'), 'library'));
app.get('/display/:file_id/:type', media.display(app.get('mediafiles'), 'library'));
app.get('/env', env.env);
app.put('/login/userid', auth.finduser); /*search and get userid from db*/
app.get('/login', auth.login); /*login form*/
app.put('/login/auth', auth.auth); /*push login autentification*/
app.get('/logout', auth.logout); /*Get for confirm, post for action*/

//vir 4smart.cz
//https.createServer(options, app).listen(3000, '192.168.0.100');
//https.createServer(options, app).listen(6101, '2a01:430:37::24');

http.createServer(app).listen(port, ip);
//https.createServer(options, app).listen(app.get('sport'), '::');
