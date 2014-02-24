var root = this;
(function(root) {
  "use strict";

  var hAuth = function () {
    this.version = '0.2';
    this.pref = 'hauth';
    /*max delay between clock time server and client*/
    this.maxdelay = 60000;
    /*signed headers*/
    this.sh = {};
    this.sh['content-type'] = '^\\w+?/\\w+?';
    this.sh.authorization = '^' + this.pref + '$';
    this.sh['x-' + this.pref + '-timestamp'] = '^[0-9]{4,20}$';
    this.sh['x-' + this.pref + '-nonce'] = '^[0-9a-f]{32,32}$';
    this.sh['x-' + this.pref + '-user-key'] = '^[0-9a-f]{32,32}$';
    this.sh['x-' + this.pref + '-sign'] = '^[0-9a-f]{64,64}$';
  };

  hAuth.prototype.debug = function debug(type, msg) {
    /*Type is lo or error*/
    if (typeof console === 'object' && typeof console.log === 'function') {
      type = type || 'log';
      msg = msg || '';
      return console[type](msg);
    }
  };

  /************* Headers parser and cannonical string method ******************/
  hAuth.prototype.parse = function parse(headers) {
    /*parse and validate JSON http headers*/
    var csob = {}; /*cannonical string for sign*/
    /*select relevant headers and copy to csob*/
    for (var h in this.sh) {
      if (this.sh.hasOwnProperty(h)) {
        csob[h] = headers[h];
      }
    }
    /*validate format of headers in csob object*/
    for (var htosign in csob) {
      if (csob.hasOwnProperty(htosign)) {
        if(! new RegExp(this.sh[htosign]).test(csob[htosign])) {
          var msg = 'Value ' + csob[htosign] + ' is nod a valid format for ' +
            htosign + ' !!';
          this.debug('error', msg);
          return {res: false, msg: msg};
        }
      }
    }
    /*cannonical strings in json*/
    return {res: true, msg: 'Headers format parse OK.'};
  };

  /*make cannonical string from incomming header object*/
  hAuth.prototype.cstring = function cstring(headers, path) {
    var cnheaders = this.parse(headers);
    if (cnheaders.res) {
      /*ordered string to sign*/
      return {
        res: path +
          headers['content-type'] +
          headers.authorization +
          headers['x-' + this.pref + '-timestamp'] +
          headers['x-' + this.pref + '-nonce'] +
          headers['x-' + this.pref + '-user-key'],
        msg: 'Creating cstring OK.'
      }
    } else {
      msg = 'Creating cstring failed: ' + cnheaders.msg;
      this.debug('error', msg);
      return {res: false, msg: msg};
    }
  };

  /********************* Validate method **************************************/
  hAuth.prototype.validate = function validate(secret, headers, path) {
    /*validate signed headers*/
    var now = new Date().getTime();
    var orig = parseInt(headers['x-' + this.pref + '-timestamp'], 10);
    var delay = Math.abs(now - orig);
    var msg; /*Result message*/
    var res; /*Result on validation*/
    if (delay > this.maxdelay) {
      res = false; /*Max delay is over*/
      msg = 'Time delay between server and client system time ' + (delay / 1000) + 'sec > ' +
        (this.maxdelay / 1000) + 'sec security limit! Please set true system time in your computer.';
      this.debug('error', msg);
    } else { /*Time delay is in limit*/
      var hsign = headers['x-' + this.pref + '-sign'];
      var cstring = this.cstring(headers, path);
      if (cstring.res) {
        var sign = this.sign(secret, cstring.res);
        if (sign === hsign) {
          res = true; /*Sign is valid*/
          msg = 'Sign is OK.';
        } else {
          res = false; /*Sign is invalid*/
          msg = 'Sign is not a valid, sign :' + hsign +
            ' in header not equal computed ' + sign + ' sign';
          this.debug('error', msg);
        }
      } else { /*Making cstring failed for cstring creating failed*/
        res = false;
        msg = 'Making a sign failed because error on creating cstring: ' + cstring.msg;
      }
    }
    return {res: res, msg: msg} /*Return validation results object*/
  };

  /********************* Signing requests/responses ****************************/
  hAuth.prototype.mkSigHeaders = function mkSigHeaders(secret, pub, nonce, path) {
    /*Create and sign || sign headers*/
    var headers = {};
    headers['content-type'] = 'application/json';
    headers.authorization = this.pref;
    headers['x-' + this.pref + '-timestamp'] = new Date().getTime();
    headers['x-' + this.pref + '-user-key'] = pub;
    headers['x-' + this.pref + '-nonce'] = nonce;

    var nosign = ''; /*Fill in zeros*/
    for (var n = 0; n < 64; n++) nosign += '0';

    headers['x-' + this.pref + '-sign'] = nosign;
    /*add sign to headers and return signed in*/
    var cstring = this.cstring(headers, path);
    if (cstring.res) { /*Signing if making cstring is OK*/
      var signed = this.sign(secret, cstring.res);
      headers['x-' + this.pref + '-sign'] = signed;
      return {res: headers, msg: 'Creating signed request headers OK.'};
    } else {
      return {
        res: false, /*Error for make cstring*/
        msg: 'Creating signed request headers failed because error on creating cstring: ' +
        cstring.msg
      };
    }
  };

  hAuth.prototype.sign = function sign(secret, cstrng) {
    /*Sign cannonical string using make HMAC-sha256*/
    var sig = this.MAC(secret, cstrng);
    return sig;
  };

  /*********** HMAC method Nodejs crypto  || SJCL in browser ******************/
  hAuth.prototype.MAC = function MAC(pass, msg) {
    /*Make secret of the user pubkey and user password*/
    var hmacfn = (typeof window === 'undefined') ? this._macNode : this._macSjcl;
    pass = pass.replace(/[\x00-\x1F\x80-\xFF]/, '');
    msg = msg.replace(/[\x00-\x1F\x80-\xFF]/, '');
    var mac = hmacfn(pass, msg);
    return mac;
  };

  hAuth.prototype._macNode = function macNode(secret, msg) {
    /*for nodejs Server*/
    var crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(msg).digest('hex');
  };

  hAuth.prototype._macSjcl = function macSjcl(secret, msg) {
    /*global sjcl*/
    var key = sjcl.codec.utf8String.toBits(secret);
    var mac = new sjcl.misc.hmac(key);
    var bitout = mac.encrypt(msg);
    return sjcl.codec.hex.fromBits(bitout);
  };

  /********************* Random numbers for nonce *****************************/
  hAuth.prototype.random = function random (num) {
    var n, ar = [], i;
    if (typeof window === 'object') {
      n = num;
      for (i = 0; i < n; i++) {
        ar.push(Math.floor(Math.random() * 16).toString(16));
      }
      return ar.join('');
    } else { /*Nodejs*/
      n = num / 2;
      var crypto = require('crypto');
      return crypto.randomBytes(n).toString('hex'); /*32char hex*/
    }
  };

  /************for registration links in email one-time-pad******************/
  hAuth.prototype.xor = function xor(input, key) {
    /*simple xor hex strings for email validation*/
    var out = [];
    input = input.split('');
    key = key.split('');
    for (var i = 0; i < input.length; i++) {
      var y = parseInt(input[i], 16);
      var x = parseInt(key[i], 16);
      out.push( (x ^ y).toString(16) );
    }
    return out.join('');
  };

  /***********Request user token for 2. part of authentification***************/
  hAuth.prototype.xhrUserRequest = function xhrUserRequest(username, authpath, cb) {
    var xhr = this.getXhr();
    xhr.open('PUT', authpath, true);
    xhr.setRequestHeader('content-type', 'application/json');
    xhr.setRequestHeader('x-' + this.pref + '-request-auth', username);
    //var json = '{"x-' + this.pref + '-request-auth":"' + username + '"}';
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var pubkey = xhr.responseText;
        if (pubkey) {
          cb(null, xhr);
        }
      } else if (xhr.readyState === 4 && xhr.status !== 200) {
        cb(xhr.status, xhr); /*xhr response not 200 OK - error*/
      }
    };
    xhr.send();
  };

  /*********validation server responses in browser if user exists**************/
  hAuth.prototype.xhrHeadValidate = function xhrHeadValidate(xhr, user, passwd, path) {
    /*Xhr server response object to json headers prepared for validation*/
    var h = xhr.getAllResponseHeaders().toLowerCase().replace(/\n\r\t$/, '').split('\n');
    if (!h) return false;
    var headers = {};
    for(var i = 0; i < h.length; i++) {
      var seg = h[i].split(': ');
      if (seg[0] && seg[1]) {
        var k = seg[0].replace(/\r$/, '')
        var v = seg[1].replace(/\r$/, '')
        headers[k] = v;
      }
    }
    /*validate parsed headers*/
    var userid = headers['x-' + this.pref + '-user-key'];
    var userstr = user + userid;
    var secret = this.MAC(passwd, userstr); /*Make a secret*/
    return this.validate(secret, headers, path); /*Return validation object {res:res, msg:msg}*/
  };

  /********* Sign and send signed headers and get Auth response  **************/
  hAuth.prototype.xhrSignAuth = function xhrSignAuth (secret, pub, nonce, authpath, cb) {
    /*sign client request headers for browsers, need @Secret key, public key,
    auth path and callback function*/
    var xhr = this.getXhr();
    xhr.open('PUT', authpath, true);
    var signedheaders = this.mkSigHeaders(secret, pub, nonce, authpath);
    if (signedheaders.res) {
      var headers = signedheaders.res;
      /*add signed hAuth headers to ajax request headers*/
      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header, headers[header]);
        }
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          cb(null, xhr);  /*Auth allow*/
        } else if (xhr.readyState === 4 && xhr.status !== 200) {
          cb(xhr.status, xhr); /*Auth denny or error..*/
        }
      };
      xhr.send();
    } else { /*Signing headers failed*/
      cb('Client signing headers failed: ' +  signedheaders.msg);
    }
  };

  hAuth.prototype.getXhr = function() {
    /*global XMLHttpRequest,ActiveXObject*/
    var xhr = '';
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else { // old IE IE6, IE5
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    return xhr;
  };

  /************ NODEJS || browsers ********************************************/
  if (typeof module !== 'undefined') {
    module.exports = hAuth;
  } else {
    root.hAuth = hAuth;
  }

})(root);
