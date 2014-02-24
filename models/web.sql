CREATE TABLE IF NOT EXISTS library (
  id INTEGER PRIMARY KEY,
  name TEXT COLLATE NOCASE,
  ext TEXT COLLATE NOCASE,
  file_id TEXT COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  userid TEXT,
  email TEXT,
  regdate INTEGER,
  secret TEXT,
  confirmkey TEXT
);
