# Website
This repository hosts the source code which runs my website: https://leonardobishop.com/

The app is written in TypeScript and runs on NodeJS using [Express](https://www.npmjs.com/package/express), rendering web pages with [ejs](https://www.npmjs.com/package/ejs). It parses content pages written in Markdown from the `pages/` directory and renders them as HTML.

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
## License
The **source code** for this project is licensed under the [ISC License](https://github.com/LMBishop/website/blob/master/LICENSE.txt). You can read the full license text in the [LICENSE.txt](https://github.com/LMBishop/website/blob/master/LICENSE.txt) file.

Any media (images, binary files, videos), or any other non-source code in this repository do not fall under this license.
