FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY pl ./pl
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY docs/privacy ./docs/privacy
ARG PRIVACY_POLICY_PREVIEW=false
RUN PRIVACY_POLICY_PREVIEW=$PRIVACY_POLICY_PREVIEW npm run build

# Preserve the hardened nginx runtime expected by the Helm chart.
FROM nginx:alpine
RUN apk upgrade --no-cache
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
