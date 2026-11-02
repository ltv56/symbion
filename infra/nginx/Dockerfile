FROM node:26-alpine AS build
RUN npm install -g pnpm@12.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @symbion/web build

FROM nginx:1.29-alpine
COPY infra/nginx/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80 443
