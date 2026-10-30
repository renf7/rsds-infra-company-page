# Keep nginx while applying Alpine security updates during every image build.
FROM nginx:alpine
RUN apk upgrade --no-cache
COPY public/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
