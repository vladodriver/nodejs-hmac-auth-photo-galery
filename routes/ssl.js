/*SSL auth micro middleware*/
  // var options = {
  //   key: fs.readFileSync('ssl/server.key'),
  //   cert: fs.readFileSync('ssl/server.crt'),
  //   ca: fs.readFileSync('ssl/ca.crt'),
  //   requestCert: true
  // };
  
/*Middlevare for ssl certs authentification*/
module.exports. sslauth = function ssllogin(req, res, next) {
  if (req.client.authorized) {
    return next();
  } else {
    console.log ('DENNY ! ' + req.client.authorized + ' ' + req.url);
    return res.render('denny', {
      url: req.url, host: req.host, port: app.get('sport')
    });
  }
};