# Website
This repository hosts the source code which (eventually) powers my website: https://leonardobishop.com/

The app is written in TypeScript and runs on NodeJS using [Express](https://www.npmjs.com/package/express), rendering web pages with [ejs](https://www.npmjs.com/package/ejs). It parses content pages written in a markup language (currently [Wikitext](https://en.wikipedia.org/wiki/Help:Wikitext)) from the `pages/` directory and renders them as HTML.

## Building and running
Instructions to build and deploy the web app will be written here whenever it is finished.

### Using docker
```
$ docker build -t website .
$ docker run -p 3000:3000 website
```

### Building directly
```
$ npm i -g typescript
$ npm ci --only-production
$ tsc && node build/index.js
```

The application will be listening on port 3000.
