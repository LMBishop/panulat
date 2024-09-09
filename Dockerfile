FROM node:20-alpine AS build

WORKDIR /app

COPY --chown=node:node package*.json ./

COPY --chown=node:node tsconfig.json ./

RUN npm i

COPY --chown=node:node app app

RUN npx tsc



FROM node:20-alpine

LABEL org.opencontainers.image.source=https://github.com/LMBishop/panulat

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm i --production

COPY --chown=node:node --from=build /app/dist dist

EXPOSE 3000

USER node

CMD [ "npm", "start" ]
