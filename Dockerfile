FROM node:alpine AS build

WORKDIR /app

COPY --chown=node:node package*.json ./

COPY --chown=node:node tsconfig.json ./

RUN npm i -g typescript\
    && npm i

COPY --chown=node:node app app

RUN tsc



FROM node:alpine

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm i --production

COPY --chown=node:node --from=build /app/dist build

EXPOSE 3000

USER node

CMD [ "node", "build/index.js" ]
