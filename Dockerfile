FROM node:alpine AS build

WORKDIR /app

COPY --chown=node:node package*.json ./

COPY --chown=node:node tsconfig.json ./

RUN npm i -g typescript\
    && npm i

COPY --chown=node:node app app

RUN tsc



FROM node:alpine

LABEL org.opencontainers.image.source=https://github.com/LMBishop/panulat

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm i --production

COPY --chown=node:node --from=build /app/dist dist

EXPOSE 3000

USER node

CMD [ "node", "dist/index.js" ]
