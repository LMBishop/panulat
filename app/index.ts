import dotenv from 'dotenv-defaults';
import { logger } from './logger.js';
import { buildPages } from './builder/build.js';
import buildInfo from './config/info.js';

dotenv.config();

logger.info('');
logger.info(`panulat v${buildInfo.panulat.version}, a static site generator`);
logger.info(buildInfo.date);
logger.info('');
logger.info(`Static directory: ${process.env.STATIC_DIR}`);
logger.info(` Pages directory: ${process.env.PAGES_DIR}`);
logger.info(` Views directory: ${process.env.VIEWS_DIR}`);
logger.info(`Output directory: ${process.env.OUTPUT_DIR}`);
logger.info(`       Webserver: ${process.env.WEBSERVER_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
logger.info(`     Autorebuild: ${process.env.WEBSERVER_AUTOREBUILD === 'true' ? 'enabled' : 'disabled'}`);
logger.info('');

const {success, errors, pageDirectory} = await buildPages();

logger.info('');
if (!success && errors == 0) {
    logger.error(`Build failed. Quitting.`);
    process.exit(1);
}

const exitString = `Finished${errors > 0 ? `, with ${errors} errors` : ''}. Build took ${new Date().getTime() - buildInfo.date.getTime()}ms.`;

if (!success) {
    logger.error(exitString);
    process.exit(1);
} else {
    logger.info(exitString);
}

if (process.env.WEBSERVER_ENABLED === 'true') {
    logger.info('');
    import('./webserver/webserver.js').then(m => m.start(pageDirectory));
}
