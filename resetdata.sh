#!/bin/bash
rm -rf ../data/files/media/*
cd ../data/db
echo "DROP TABLE library;" | sqlite3 web.db
