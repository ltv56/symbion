FROM node:26-alpine AS build
RUN npm install -g pnpm@12.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @symbion/api build
RUN pnpm --filter @symbion/api deploy --legacy --prod /out

FROM node:26-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
