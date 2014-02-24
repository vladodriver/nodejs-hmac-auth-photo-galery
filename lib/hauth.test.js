"use strict";
var hauth = require('./hauth.js');
var prefix = 'hb';

var Hauth = new hauth(prefix);

var a = 'bfe397325a77af9db1550c274933a967';
var b = 'a93bcf90dceafc1335f1bb3cc71343f1';

console.log('\nTest xoru: ');
var c = Hauth.xor(a, b);
console.log((Hauth.xor(a, c) === b) ? 'XOR OK' : 'TEST XORU selhal!!');

var secret = '7560c866b9a57707da76b7638e18c60f0f629ba26957ad17bdfd7e6713115a20';
var pub = 'a93bcf90dceafc1335f1bb3cc71343f1';
var nonce = '5287165475f0d5058fdfbbd6251c29b0';
var url = 'https://brzlikov.com/asd/ju?=care';

var mh = Hauth.mkSigHeaders(secret, pub, nonce, url);

console.log('\nVytvořeny Signed headers\n\n', mh ||
  'Signed headers výroba se nezdařila\n');

var out = Hauth.parse(mh) || 'TEST headers selhal!';
console.log('\nHEADERY PARSOVÁNY:');
console.log(out || 'HEADERS PARSE FAILED!!!');

console.log('\nVALIDACE Podpisu:');
var valid = Hauth.validate(secret, mh, url);
console.log((valid) ? 'OK => VALIDACE v pořádku..' : 'VALIDACE nesedí..');

console.log('\nVALIDACE neplatného Podpisu');
mh['x-hb-sign'] = '7560c866b9a57707da76b7638e18c60f0f629ba26957ad17bdfd7e6713115a21';
var valid = Hauth.validate(secret, mh, url);
console.log((valid) ? 'OK => VALIDACE v pořádku..' : 'Validace nesedí');
