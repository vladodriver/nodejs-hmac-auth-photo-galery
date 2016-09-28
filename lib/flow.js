"use strict";
var Flow = function () {
  this.version = '0.8';
  this._reset();
  this.options = {};
};

Flow.prototype._reset = function _reset() {
  this.state = {
    len: 0, /*Full length of stack*/
    stack: [], /*Input stack for new processing array*/
    index: 0, /*Index of runned task*/
    running: 0 /*Number of parralel runned tasks*/
  };
  this.out = {
    times: [], /*Done times*/
    queue: [], /*Non-sorted results*/
    sorted: [] /*Results sorted by stack order*/
  };
  this.errors = []; /*Errors array*/
  this.final = undefined; /*Optional final callback function*/
};

Flow.prototype._parseparam = function _parseparam(arr, options, final) {
  this.options = {
    iterator: options.iterator || null,
    limit: parseInt(options.limit, 10) || 0,
    errorbreak: options.errorbreak || false,
    debugmode: options.debugmode || false
  };

  /*Parse and validate array*/
  if (!Array.isArray(arr)) {
    throw new Error("First parameter must be an array!");
  }
  this.state.stack = arr.concat(); /*copy arr to this.state.stack*/
  this.state.len = this.state.stack.length; /*Length of full stack*/
  arr.map(function (item) {
    if (typeof item !== 'function' && !options.iterator) {
      throw new Error("You have non-function object in array, " +
        "but parameter of iterator in options object is not defined!");
    }
  });
  
  if (this.options.limit <= 0 || this.options.limit > arr.length) {
    this.options.limit = arr.length; /* limit auto correction */
  } else if (this.options.errorbreak) {
    this.options.limit = 1; /*With errorbreak, must be limit = 1*/
  }

  if (this.options.iterator && typeof this.options.iterator !== 'function') {
    throw new Error("Options.iterator must be a Function!");
  }
  /*And add final callback function*/
  this.final = final;
  if (this.final && typeof this.final !== 'function') {
    throw new Error("Final callback must be a Function!");
  }

};

Flow.prototype._timelog = function _timelog(index) {
  var donetime = (new Date().getTime() - this.out.times[index]); /*End time*/
  this.out.times[index] = donetime;
  var done = (this.state.len - this.state.stack.length - this.state.running + 1);

  if (this.options.debugmode) {
    console.log('Flow.js> ' + (index + 1)  + 'th => ' + done + ' of ' + this.state.len +
      ' tasks done in time: ' + (donetime / 1000) + ' sec' + ' parallely running: ' +
      this.state.running + ' limit: ' + this.options.limit +
      ' and return: '  + this.out.sorted[index]);
  }
};

Flow.prototype._finalize = function _finalize() {
  if(typeof this.final === 'function') {
    this.final((this.errors[0]) ? this.errors : null, this.out);
  }
  this._reset();
};

Flow.prototype._exec = function _exec(index) {
  this.out.times[index] = new Date().getTime(); /*log start time*/
  var self = this;
  /*callback function for each task*/
  var callback = function (err, result) {
    self.out.queue.push(result || err); /*fifo queue*/
    self.out.sorted[index] = result || err; /*order by input array*/
    self._timelog(index); /*log end time*/
    if (err) {
      self.errors.push(err);
      if (self.options.errorbreak) {
        self._finalize();
      }
    }
    
    self.state.running -= 1; /*one iteration ends*/
    /* Run one iteration and run next or final, when all tasks is done*/
    if (self.state.stack.length > 0) {
      self.cf(self.state.stack, self.options, self.final);
    } else if (self.state.stack.length === 0 && self.state.running === 0) {
      self._finalize();
    }
  };
  /* Run callback next loop */
  var tick = (typeof window === 'object' && typeof window.setTimeout === 'function') ?
    setTimeout : process.nextTick;
  tick(function () {
    /*execute/iterate and save results..*/
    var item = self.state.stack.shift();
    if (typeof item !== 'function') {
      self.options.iterator.call(self, item, callback);
    } else {
      item.call(self, callback);
    }
  }, 0);
};

Flow.prototype.cf = function cf(arr, options, final) {
  /*Run any control flow set by options object parset by this._parseparam*/
  if (!this.state.stack[0]) {
    this._parseparam(arr, options, final);
  }
  /*Control number of iterations paralelly running*/
  while ((this.state.running < this.options.limit) && (this.state.stack.length > 0)) {
    this._exec(this.state.index);
    this.state.running += 1;
    this.state.index += 1;
  }
};

Flow.prototype.serial = function serial(arr, options, final) {
  /*Alias to this.cf with force limit 1*/
  options = options || {};
  options.limit = 1;
  return this.cf(arr, options, final);
};

module.exports = Flow;
