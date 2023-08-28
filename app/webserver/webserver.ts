import express from 'express';
import { logger } from '../logger.js';
import { AddressInfo } from 'net';
import { PageDirectory } from '../builder/pageDirectory.js';

const app = express();

app.use(express.static(process.env.OUTPUT_DIR, { extensions: ['html'] }));

export const start = (pages: PageDirectory) => {
    const server = app.listen(process.env.WEBSERVER_PORT, () => {
        const address = server.address() as AddressInfo;
        logger.info(`Serving files from: ${process.env.OUTPUT_DIR}`);
        logger.info(`           Address: http://localhost:${address.port}`);
        logger.info(`                    ^C to stop`);
        logger.info('')
        
        if (process.env.WEBSERVER_AUTOREBUILD === 'true') {
            import('./fileWatcher.js').then((watcher) => {
                watcher.start(pages);
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
