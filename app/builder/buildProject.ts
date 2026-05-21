import { render } from './renderPage.js';
import { Page, PageDirectory } from './pageDirectory.js';
import { Options } from '../options.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';
import glob from 'glob';
import { process as processCss } from './processCss.js';
import { discoverFeed } from './discoverFeed.js';

export async function buildPages(options: Options): Promise<{ success: boolean, errors: number, pageDirectory: PageDirectory}> {
    // Recreate output directory
    if (options.createOutputDir) {
        try {
            if (fs.existsSync(options.outputDir)) {
                fs.rmSync(options.outputDir, { recursive: true });
            }
            fs.mkdirSync(options.outputDir);
        } catch (e) {
            logger.error(`Failed to create output directory: ${e.message}`);
            return { success: false, errors: 0, pageDirectory: null };
        }
    }


    // Load pages
    logger.info(`Reading pages from disk...`);
    let pagesCount;
    let feedsCount;
    const pageDirectory = new PageDirectory(options.pagesDir, options.outputDir);
    {
        let startDate = new Date().getTime();
        await pageDirectory.init();

        pagesCount = Object.keys(pageDirectory.getPages()).length;
        feedsCount = Object.keys(pageDirectory.getFeeds()).length;
        if (feedsCount > 0) {
            logger.info(`Parsed ${pagesCount} pages and ${feedsCount} feeds (${new Date().getTime() - startDate}ms)`);
        } else {
            logger.info(`Parsed ${pagesCount} pages (${new Date().getTime() - startDate}ms)`);
        }
    }


    // Render pages
    let pagesRendered = 0;
    let pagesFailed = 0;
    if (pagesCount > 0) {
        logger.info(``);
        logger.info(`Rendering pages...`);
        for (const page of pageDirectory.getPages()) {
            if (await renderPage(page, pageDirectory, options.viewsDir)) {
                pagesRendered++;
            } else {
                pagesFailed++;
            }
        }
    }

    // Discover feeds
    if (feedsCount > 0) {
        logger.info(``);
        logger.info(`Discovering feeds...`);
        const feeds = pageDirectory.getFeeds();
        for (const feed of feeds) {
            try {
                let startDate = new Date().getTime();
                await discoverFeed(feed, pageDirectory);
                logger.info(`${feed.originalPath} => ${feed.outputPath} (${new Date().getTime() - startDate}ms)`)
            } catch (e) {
                logger.error(`Failed to discover feed ${feed.title}: ${e.message}`);
            }
        }
    }


    //TODO move to util
    const ensureParentDirExists = (file: string) => {
        const joinedOutputPath = path.join(options.outputDir, file);
        const dir = path.dirname(joinedOutputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return joinedOutputPath;
    };

    // Copy static files
    logger.info(``);
    logger.info(`Copying static files...`);
    try {
        const files = glob.sync(`**/*`, { 
            cwd: options.staticDir, 
            nodir: true,
            ignore: ['**/*.scss', '**/*.css']
        })
        
        for (const file of files) {
            let startDate = new Date().getTime();
            const outputPath = ensureParentDirExists(file);
            const joinedPath = path.join(options.staticDir, file);
            fs.copyFileSync(joinedPath, outputPath);
            logger.info(`${file} => /${file} (${new Date().getTime() - startDate}ms)`)
        }
    } catch (e) {
        logger.error(`Failed to copy static files: ${e.message}`);
        logger.error(e);
    }
    
    // Process CSS files
    const cssFiles = glob.sync(`**/*.{css,scss}`, {
        cwd: options.staticDir,
        nodir: true,
    });
    if (cssFiles.length > 0) {
        logger.info(``);
        logger.info(`Processing CSS files...`);

        for (const file of cssFiles) {
            let startDate = new Date().getTime();
            const outputPath = ensureParentDirExists(file);
            const joinedPath = path.join(options.staticDir, file);
            let processedCss: string;
            try {
                processedCss = await processCss(joinedPath);
            } catch (e) {
                logger.error(`Failed to process CSS file ${joinedPath}`);
                logger.error(e.message);
                continue;
            }
            const newOutputPath = outputPath.replace(/\.scss$/, '.css');
            fs.writeFileSync(newOutputPath, processedCss);
            logger.info(`${file} => /${file.replace(/\.scss$/, '.css')} (${new Date().getTime() - startDate}ms)`)
        }
    }

    return { success: pagesFailed == 0, errors: pagesFailed, pageDirectory: pageDirectory};
}

async function renderPage(page: Page, pageDirectory: PageDirectory, viewsDir: string): Promise<boolean> {
    let startDate = new Date().getTime();
    let html;
    try {
        html = await render(page, pageDirectory, viewsDir);
    } catch (e) {
        logger.error(`Failed to render page ${page.originalPath}: ${e.message}`);
        return false;
    }
    
    try {
        const file = page.buildPath;
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(file, html);
        logger.info(`${page.originalPath} => ${page.outputPath} (${page.view}.ejs, ${new Date().getTime() - startDate}ms)`)
    } catch (e) {
        logger.error(`Failed to write page ${page.buildPath}: ${e.message}`);
        return false;
    }
    return true;
}

export async function rebuildSinglePage(path: string, pageDirectory: PageDirectory, options: Options): Promise<boolean> {
    const page = await pageDirectory.loadPage(path);
    if (!page) {
        return false;
    }

    return await renderPage(page, pageDirectory, options.viewsDir);
}
