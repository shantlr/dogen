FROM nginx:stable-alpine AS serve
RUN echo -e -n "server {\n\
  listen       80;\n\
  server_name  localhost;\n\
\n\
  location / {\n\
      root   /usr/share/nginx/html;\n\
      index  index.html index.htm;\n\
      try_files $uri /index.html;\n\
  }\n\
\n\
  error_page   500 502 503 504  /50x.html;\n\
  location = /50x.html {\n\
      root   /usr/share/nginx/html;\n\
  }\n\
" > /etc/nginx/conf.d/default.conf
EXPOSE 80