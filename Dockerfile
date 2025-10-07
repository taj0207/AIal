FROM node:20-alpine AS deps
WORKDIR /app
COPY packages/router-core/package.json packages/router-core/tsconfig.json ./packages/router-core/
COPY packages/daemon/package.json packages/daemon/tsconfig.json ./packages/daemon/
RUN npm -w packages/router-core -w packages/daemon install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages ./packages
RUN npm -w packages/router-core -w packages/daemon run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages ./packages
COPY package.json .
EXPOSE 4000
CMD ["node","packages/daemon/dist/server.js"]
