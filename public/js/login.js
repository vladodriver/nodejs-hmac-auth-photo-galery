var root = window;
(function(root) {
  /*global hAuth, documment */
  var con = (document.body.textContent) ? 'textContent' : 'innerText';
  var username = document.getElementById('username');
  var namemsg = document.getElementById('namemsg');
  var pass = document.getElementById('password');
  var passmsg = document.getElementById('passmsg');
  var sendbtn = document.getElementById('send');

  var ha = new hAuth('hauth');

  /*apply to send button*/
  var uidurl = location.pathname + '/userid';
  var authurl = location.pathname + '/auth';

  /*reset form*/
  function resetform() {
    username.value = '';
    pass.value = '';
  }

  sendbtn.onclick = function auth() {
    /*Get the user public key from the server and continue, when it was obtained.*/
    ha.xhrUserRequest(username.value, uidurl, function(err, xhr) {
      if (err) {
        namemsg[con] = 'Chyba :' + err + ' neexistující uživatel!';
      } else if (xhr) {
        var uidn = xhr.responseText.split(':');
        var uid = uidn[0];
        var nonce = uidn[1];
        namemsg[con] = uid + ' : ' + nonce;
        authsign(uid, nonce, authurl);
      }
    });
  };

  var authsign = function authsign(uid, nonce, authurl) {
    /*Generate secret key and sign auth headers.*/
    var secret = ha.MAC(pass.value, username.value + uid);
    ha.xhrSignAuth(secret, uid, nonce, authurl, function (err, xhrok) {
      if (err) {
        resetform();
        passmsg[con] = 'Autentifikace selhala! ' + err + ' ' + xhrok.responseText;
      } else {
        passmsg[con] = 'Přihlášení dokončeno : ' + xhrok.responseText;
        var validresp = ha.xhrHeadValidate(xhrok, username.value, pass.value, authurl);
        /*Client validate server response*/
        if (validresp.res) {
          /*When server response is valid, then go to sign and send auth credentials*/
          resetform();
          passmsg[con] +=  ' ' + validresp.msg + ' Server je oprávněn odpovědět OK! Je to von :)';
        } else {
          resetform();
          passmsg[con] += ' Nesprávný podpis serveru! Kontaktujte administrátora. ' + validresp.msg;
        }
      }
    });
  };

})(root);
