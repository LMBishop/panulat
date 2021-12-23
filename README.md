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

## Caveats
This website is essentially built like a wiki system, though there are some drawbacks with this compared to actual wiki software, considering this is a highly specific use case of it. In no particular order:
* re-rendering pages are a pain after edits
* files are read from <code>/static/image</code> rather than <code>/pages/file</code> (which breaks the point of the entire namespace system)
* ~~templates can't transclude other templates~~ (✅ fixed [144fec4](https://github.com/LMBishop/website/commit/144fec46aff02621d53fa1a101d879adaaf6126d))
* ~~the Template namespace is the only transcludable namespace~~ (✅ fixed [144fec4](https://github.com/LMBishop/website/commit/144fec46aff02621d53fa1a101d879adaaf6126d))
* ~~circular dependencies cause infinite recursion~~ (✅ fixed [951984f](https://github.com/LMBishop/website/commit/951984fb55d552d9c816a30069e2321f3602d305))
* code is a bit wack in places
* I'm never happy with the visual design
* I don't actually know what to fill this website with
* I've written this list both on the website itself and in this readme so I will have to update it twice (and will likely forget one of them)

## License
The **source code** for this project is licensed under the [ISC License](https://github.com/LMBishop/website/blob/master/LICENSE.txt). You can read the full license text in the [LICENSE.txt](https://github.com/LMBishop/website/blob/master/LICENSE.txt) file.

Any media (images, binary files, videos), or any other non-source code in this repository do not fall under this license.
