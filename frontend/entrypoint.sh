#!/bin/sh

API_URL="${API_URL:-http://localhost:8080}"

sed -i "s|__API_URL__|${API_URL}|g" /usr/share/nginx/html/index.html

exec nginx -g 'daemon off;'
