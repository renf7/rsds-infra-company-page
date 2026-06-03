# Serve the static RSD Software website with the official nginx image.
FROM nginx:alpine

# Copy the static site into the default nginx web root.
COPY public/ /usr/share/nginx/html/

# nginx serves on port 80 by default.
EXPOSE 80
