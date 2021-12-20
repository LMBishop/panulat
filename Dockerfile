FROM node:alpine

WORKDIR /srv/node/app

COPY package*.json ./

RUN npm i -g typescript\
    && npm ci --only=production

COPY . .

RUN tsc

COPY --chown=node:node . .

EXPOSE 3000

USER node

CMD [ "node", "build/index.js" ]
