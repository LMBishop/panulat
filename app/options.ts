import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface Options {
    pagesDir: string;
    viewsDir: string;
    staticDir: string;
    outputDir: string;
    createOutputDir: boolean;
    webserver: boolean;
    webserverAutorebuild: boolean;
    webserverPort: number;
    loggingLevel: string;
}

export const options = (await yargs(hideBin(process.argv))
    .env()
    .options({
        pagesDir: {
            type: 'string',
            default: 'pages',
            describe: 'Pages directory (env: PAGES_DIR)',
        },
        viewsDir: {
            type: 'string',
            default: 'views',
            describe: 'Views directory (env: VIEWS_DIR)',
        },
        staticDir: {
            type: 'string',
            default: 'static',
            describe: 'Static directory (env: STATIC_DIR)',
        },
        outputDir: {
            type: 'string',
            default: 'build',
            describe: 'Output directory (env: OUTPUT_DIR)',
        },
        createOutputDir: {
            type: 'boolean',
            default: false,
            describe: 'Create the output directory (env: CREATE_OUTPUT_DIR)',
        },
        webserver: {
            type: 'boolean',
            default: false,
            describe: 'Enable webserver (env: WEBSERVER)',
        },
        webserverAutorebuild: {
            type: 'boolean',
            default: false,
            describe: 'Enable auto rebuild (env: WEBSERVER_AUTOREBUILD)',
        },
        webserverPort: {
            type: 'number',
            default: 3000,
            describe: 'Webserver port (env: WEBSERVER_PORT)',
        },
        loggingLevel: {
            type: 'string',
            default: 'info',
            describe: 'Logging level (env: LOGGING_LEVEL)',
        }
    })
    .parse()) as Options;
