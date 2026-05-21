import dotenv from 'dotenv-defaults';
import { logger } from './logger.js';
import { buildPages } from './builder/buildProject.js';
import buildInfo from './config/info.js';
import { options } from './options.js';

dotenv.config();

logger.info('');
logger.info(`panulat v${buildInfo.panulat.version}, a static site generator`);
logger.info(buildInfo.date);
logger.info('');
logger.info(`   Static directory: ${options.staticDir}`);
logger.info(`    Pages directory: ${options.pagesDir}`);
logger.info(`    Views directory: ${options.viewsDir}`);
logger.info(`   Output directory: ${options.outputDir}`);
logger.info(`          Webserver: ${options.webserver ? 'enabled' : 'disabled'}`);
logger.info(`       Auto rebuild: ${options.webserverAutorebuild ? 'enabled' : 'disabled'}`);
logger.info(`Incremental rebuild: disabled`); //TODO
logger.info('');

const {success, errors, pageDirectory} = await buildPages(options);

if (!success && errors == 0) {
    logger.error('');
    logger.error(`Build failed. Quitting.`);
    process.exit(1);
}

const exitString = `Finished${errors > 0 ? `, with ${errors} errors` : ''}. Build took ${new Date().getTime() - buildInfo.date.getTime()}ms.`;

if (!success) {
    logger.error('');
    logger.error(exitString);
    process.exit(1);
} else {
    logger.info('');
    logger.info(exitString);
}

if (options.webserver) {
    logger.info('');
    import('./webserver/webserver.js').then(m => m.start(pageDirectory, options));
}
