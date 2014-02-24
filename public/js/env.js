/*jshint indent: 2, browser: true, evil: true*/
/*global ActiveXObject*/
(function () {
  "use strict";
  function makehtml(json, elid) {
    var el = document.getElementById(elid), parse,
      envob, html = '', prop, val, section;
    try {
      parse = JSON.parse(json);
    } catch (e) {
      parse = eval('(' + json + ')');
    }
    envob = [parse.ram, parse.env];
    for (prop = 0; prop < envob.length; prop += 1) {
      section = envob[prop];
      for (val in section) {
        if (section.hasOwnProperty(val)) {
          html += '<li><strong>' + val + '</strong> > ' + section[val] + '</li>\n';
        }
      }
    }
    el.innerHTML = html;
  }

  function getenv() {
    var xhr = '';
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest;
    } else {// code for IE6, IE5
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhr.open('GET', '/env', true);
    xhr.setRequestHeader('Cache-Control', 'no-cache; no-store');
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4 && xhr.status == 200) {
        return makehtml(xhr.responseText, 'popup'); /*send json to html*/
      }
    };
    xhr.send();
  }

  function show() {
    var s = document.getElementById('popup'),
      css = s.style;
    getenv(); /*get fresh env*/
    css.display = 'block';
  }

  function hide() {
    var h = document.getElementById('popup');
    h.style.display = 'none';
    h.textContent = '... loading ...';
  }

  function popup() {
    var el = document.createElement('ul'),
      css = el.style,
      h = document.getElementsByTagName('h1')[0];

    el.id = 'popup';
    css.backgroundColor = 'rgb(204, 126, 27)';
    css.border = '0.08em solid #009C71';
    css.borderRadius = '0.5em';
    css.wordWrap = 'break-word';
    css.display = 'none';

    document.body.insertBefore(el, document.body.firstChild);

    h.onmouseover = function () {
      this.style.color = 'rgb(204, 126, 27)';
    };
    h.onmouseout = function () {
      this.style.color = 'black';
    };
    h.onclick = show;
    el.onclick = hide;
  }

  window.onload = popup; /*Make ajax environ popup*/
})();
