# panulat
A static site generator for my own website. Uses 
[ejs](https://ejs.co/) for templates.

## Building and running

This program is intended to be run using Docker.

### Using Docker
```
$ docker build -t panulat .
```

The program uses the following environment variables:

| Name                       | Value                                                       | Default  |
|----------------------------|-------------------------------------------------------------|----------|
| `PAGES_DIR`                | The directory containing Markdown and HTML formatted pages. | `pages`  |
| `VIEWS_DIR`                | The directory containing templates.                         | `views`  |
| `STATIC_DIR`               | The directory containing static files to be copied.         | `static` |
| `OUTPUT_DIR`               | The output directory for rendered pages.                    | `build`  |
| `SKIP_OUTPUT_DIR_CREATION` | If the output dir should not be deleted and re-created.     | `false`  |
| `WEBSERVER_ENABLED`        | If the webserver should start. Used for testing.            | `false`  |
| `WEBSERVER_AUTOREBUILD`    | If pages should be automatically rebuilt when changing.     | `true`   |
| `WEBSERVER_PORT`           | The port the webserver should listen on.                    | `3000`   |
| `LOGGING_LEVEL`            | How verbose logs should be.                                 | `info`   |
