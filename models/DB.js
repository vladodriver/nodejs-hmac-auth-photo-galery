"use strict";
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();

var Model = function (db_file, sql_file) {
  this.DB = new sqlite3.cached.Database(db_file);
  var DB = this.DB;
  fs.readFile(sql_file, 'utf8', function (err, sql) {
    if (err) return console.log(err);
    console.log(sql);
    DB.exec(sql + "PRAGMA SYNCHRONOUS = 0;", function (err) {
      if (err) return console.log(err);
    });
  });

  this.tsizeref = 'rowid'; /*reference column for determine size of the tables*/
  this.countname = 'count'; /*name to number of rows*/
};

Model.prototype.query = function (query, params, paginate, cb) {
  paginate = (paginate && paginate.limit &&
    paginate.page && paginate.order) ?
    paginate : false; /*no paginate options set*/

  var Model = this;
  if (paginate) { /*return count results without get data*/
    Model.DB.each(query, function() {}, function(err, count) {
      if (err) return cb(err);
      var pager = Model.paginator(count, paginate.limit, paginate.page);
      pager.sort_by = paginate.order;
      /*Paged part query*/
      Model.DB.all(query + " ORDER BY " + pager.sort_by + " LIMIT ? OFFSET ?",
        [pager.limit, pager.offset], function (err, data) {
        if (err) return cb(err);
        cb(null, data, pager);
      });
    });
  /*No paginate queries*/
  } else {
    this.DB.all(query, params, function(err, data) {
       if (err) {
        return cb(err);
      }
      cb(null, data);
    });
  }
};

Model.prototype.paginator = function (count, limit, page) {
  /*Compute parameters for pagination for sql query*/

  var remainder, last_pg, prew_pg, next_pg, offset;
  /*correction limit number for count*/
  limit = parseInt(limit, 10);
  if (limit <= 0) {
    limit = 1; /* <= 0*/
  } else if (limit > count) {
    limit = count; /* > count*/
  }

  remainder = count % limit;
  /*compute last page number for count and remainder*/
  if ((count > limit) && (remainder > 0)) {
    /*Last full page + 1 for remanpg*/
    last_pg = ((count - remainder) / limit) + 1;
  } else if ((count > limit) && (remainder === 0)) {
    /*remainpg not found .. +0*/
    last_pg = (count / limit);
  } else if (count <= limit) {
    /*need more cound for pagination*/
    last_pg = 1;
  }

  /*correction page num*/
  if (page < 1) {
    page = 1; /*min page is 1*/
  } else if (page > last_pg) {
    page = last_pg; /*max page num is last_pg*/
  }

  /*offset is begin on page * limit - limit*/
  offset = (page * limit) - limit;

  /*compute prew_pg and next_pg for corrected page*/
  if (last_pg === 1) { /*no pagination*/
    prew_pg = next_pg = undefined;
  } else if (last_pg > 1) {
    if (page === 1) {
      prew_pg = undefined;
      next_pg = 2;
    } else if ((page > 1) && (page < last_pg)) {
      prew_pg = page - 1;
      next_pg = page + 1;
    } else if (page === last_pg) {
      prew_pg = page - 1;
      next_pg = undefined;
    }
  }
  return {
    limit: limit,
    offset: (page * limit) - limit,
    prew_pg: prew_pg,
    page: page,
    next_pg: next_pg,
    last_pg: last_pg,
    count: count
  };
};

/*export shared instance*/
module.exports = new Model(__dirname + '/' + 'web.db', __dirname + '/' + 'web.sql');
