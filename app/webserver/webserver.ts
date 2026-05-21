import express from 'express';
import { logger } from '../logger.js';
import { AddressInfo } from 'net';
import { PageDirectory } from '../builder/pageDirectory.js';
import { Options } from '../options.js';

const app = express();

export const start = (pages: PageDirectory, opts: Options) => {
    app.use(express.static(opts.outputDir, { extensions: ['html'] }));

    const server = app.listen(opts.webserverPort, () => {
        const address = server.address() as AddressInfo;
        logger.info(`Serving files from: ${opts.outputDir}`);
        logger.info(`           Address: http://localhost:${address.port}`);
        logger.info(`                    ^C to stop`);
        logger.info('')
        
        if (opts.webserverAutorebuild) {
            import('./fileWatcher.js').then((watcher) => {
                watcher.start(pages, opts);
            });
        }
    });

    const closeServer = () => {
        logger.info(`Stopping server...`);
        server.close();
    }

    const exitHandler = () => {
        if (server.listening) {
            closeServer();
        }
    }

    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);

};
