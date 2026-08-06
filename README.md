Panulat is hosted at **[git.leonardobishop.net](https://git.leonardobishop.net/panulat/)**.

# panulat

A static site generator for my own website. Uses 
[EJS](https://ejs.co/) for templates.

Designed on the basis that most templating languages suck.
EJS allows more functionality to live in sites themselves,
rather than in the site generator.

## Building and running

This program is intended to be run as a container.
For example, a script named `panulat` in `/usr/local/bin`:

```
#!/bin/bash

podman run \
        -v ${PWD}/pages:/app/pages \
        -v ${PWD}/static:/app/static \
        -v ${PWD}/views:/app/views \
        -v ${PWD}/build:/app/build:rw \
        -p 3000:3000 \
        repo.leonardobishop.net/docker/panulat:1.7.2 \
        --staticDir /app/static \
        --viewsDir /app/views \
        --pagesDir /app/pages \
        --buildDir /app/build \
        "$@"
```

## Options

You can pass the following command line arguments:

| Name                       | Value                                                       | Default  |
|----------------------------|-------------------------------------------------------------|----------|
| `--pagesDir`               | The directory containing Markdown and HTML formatted pages. | `pages`  |
| `--viewsDir`               | The directory containing templates.                         | `views`  |
| `--staticDir`              | The directory containing static files to be copied.         | `static` |
| `--outputDir`              | The output directory for rendered pages.                    | `build`  |
| `--createOutputDir`        | Create the output directory if it doesn't exist.            | `false`  |
| `--webserver`              | If the webserver should start. Used for testing.            | `false`  |
| `--webserverAutorebuild`   | If pages should be automatically rebuilt when changing.     | `true`   |
| `--webserverPort`          | The port the webserver should listen on.                    | `3000`   |
| `--loggingLevel`           | How verbose logs should be.                                 | `info`   |

These are also available as environment variables. E.g. `--pagesDir` would be `PAGES_DIR`.


