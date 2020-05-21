#!/bin/bash

pm2 stop pubquiz
pm2 delete pubquiz
git pull
npm install
pm2 start ./pubquiz.config.js
pm2 save