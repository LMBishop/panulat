import chokidar, { FSWatcher } from 'chokidar';
import { logger } from '../logger.js';
import { PageDirectory } from '../builder/pageDirectory.js';
import { buildPages, rebuildSinglePage } from '../builder/buildProject.js';
import { Options } from '../options.js';
import path from 'path';
import fs from 'fs';

function attachPageEvents(watcher: FSWatcher, pages: PageDirectory, opts: Options) {
    const onPageChange = async (file: string) => {
        logger.info(`File ${file} has been modified, rebuilding...`);
        if (await rebuildSinglePage(file, pages, opts)) {
            logger.info(`...done`);
        }
        logger.info(``);
    }

    const onPageRemoval = (file: string) => {
        logger.info(`File ${file} has been removed, deleting...`);
        const page = pages.get(file.replace(/\.[^.]*$/,''));
        if (!page) {
            logger.error(`Failed to find page for ${file}`);
            return;
        }
        const joinedPath = path.join(opts.outputDir, `${page.route}.html`);
        try {
            fs.rmSync(joinedPath)
        } catch (e) {
            logger.error(`Failed to remove ${joinedPath}: ${e.message}`);
        }
        logger.info(`...done`);
        logger.info(``);
    }

    watcher.on('add', onPageChange);
    watcher.on('change', onPageChange);
    watcher.on('unlink', onPageRemoval);
}

function attachStaticEvents(watcher: FSWatcher, opts: Options) {
    const onStaticChange = async (file: string) => {
        logger.info(`Static file ${file} has been modified, copying...`);
        const joinedPath = path.join(opts.staticDir, file);
        const joinedOutputPath = path.join(opts.outputDir, 'static', file);
        try {
            fs.copyFileSync(joinedPath, joinedOutputPath);
            logger.info(`...done`);
        } catch (e) {
            logger.error(`Failed to copy ${joinedPath} to ${joinedOutputPath}: ${e.message}`);
        }
        logger.info(``);
    }

    const onStaticRemoval = (file: string) => {
        logger.info(`Static file ${file} has been removed, deleting...`);
        const joinedOutputPath = path.join(opts.outputDir, 'static', file);
        try {
            fs.rmSync(joinedOutputPath)
            logger.info(`...done`);
        } catch (e) {
            logger.error(`Failed to remove ${joinedOutputPath}: ${e.message}`);
        }
        logger.info(``);
    }

    watcher.on('add', onStaticChange);
    watcher.on('change', onStaticChange);
    watcher.on('unlink', onStaticRemoval);
}

function attachViewEvents(watcher: FSWatcher, pages: PageDirectory, opts: Options) {
    const onViewChange = async (file: string) => {
        logger.info(`View ${file} has been modified, rebuilding pages with view...`);
        let pagesWithView = pages.getPages().filter(page => `${page.view}.ejs` === file);
        logger.info(`Found ${pagesWithView.length} pages with view ${file}`);
        for (const page of pagesWithView) {
            logger.info(`Rebuilding page ${page.route}...`);
            if (await rebuildSinglePage(page.originalPath, pages, opts)) {
                logger.info(`...done`);
            }
        }
        logger.info(``);
    }

    const onViewRemoval = (file: string) => {
        logger.info(``);
        logger.info(`View ${file} has been removed`);
        logger.info(``);
    }

    watcher.on('add', onViewChange);
    watcher.on('change', onViewChange);
    watcher.on('unlink', onViewRemoval);
}

let buildInProgress = false;

function attachFullRebuildEvents(watcher: FSWatcher, opts: Options) {
    
    const onFullRebuild = async (file: string) => {
        if (buildInProgress) {
            logger.info(`File ${file} has been modified, but a build is already in progress. Skipping...`);
            return;
        }
        buildInProgress = true;
        
        logger.info(`File ${file} has been modified, starting full rebuild...`);
        const startDate = new Date();
        const {success, errors, pageDirectory} = await buildPages(opts);
        const endDate = new Date();
        const finishString = `...done${errors > 0 ? `, with ${errors} errors` : ''}, after ${endDate.getTime() - startDate.getTime()}ms.`; 
        if (!success) {
            logger.error(finishString);
        } else {
            logger.info(finishString);
        }
        logger.info(``);
        buildInProgress = false;
    }

    watcher.on('add', onFullRebuild);
    watcher.on('change', onFullRebuild);
    watcher.on('unlink', onFullRebuild);
}

export const start = (pages: PageDirectory, opts: Options) => {
    const pagesWatcher = chokidar.watch('.', {
        persistent: true,
        cwd: opts.pagesDir,
        ignoreInitial: true,
    });
    const staticWatcher = chokidar.watch('.', {
        persistent: true,
        cwd: opts.staticDir,
        ignoreInitial: true,
    });
    const viewsWatcher = chokidar.watch('.', {
        persistent: true,
        cwd: opts.viewsDir,
        ignoreInitial: true,
    });

    // attachPageEvents(pagesWatcher, pages, opts);
    // attachStaticEvents(staticWatcher, opts);
    // attachViewEvents(viewsWatcher, pages, opts);
    // 
    attachFullRebuildEvents(pagesWatcher, opts);
    attachFullRebuildEvents(staticWatcher, opts);
    attachFullRebuildEvents(viewsWatcher, opts);
    
    const exitHandler = () => {
        logger.info(`Stopping file watcher...`);
        viewsWatcher.close();
        staticWatcher.close();
        pagesWatcher.close();
    }

    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
}
