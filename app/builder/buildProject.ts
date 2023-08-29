import { render } from './renderPage.js';
import { Page, PageDirectory } from './pageDirectory.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';
import glob from 'glob';
import { process as processCss } from './processCss.js';

export async function buildPages(verbose: boolean = true): Promise<{ success: boolean, errors: number, pageDirectory: PageDirectory}> {
    // Recreate output directory
    if (process.env.SKIP_OUTPUT_DIR_CREATION !== 'true') {
        try {
            if (fs.existsSync(process.env.OUTPUT_DIR)) {
                fs.rmSync(process.env.OUTPUT_DIR, { recursive: true });
            }
            fs.mkdirSync(process.env.OUTPUT_DIR);
        } catch (e) {
            logger.error(`Failed to create output directory: ${e.message}`);
            return { success: false, errors: 0, pageDirectory: null };
        }
    }


    // Load pages
    if (verbose) logger.info(`Reading pages from disk...`);
    const pageDirectory = new PageDirectory(process.env.PAGES_DIR);
    await pageDirectory.init();

    let pagesCount = Object.keys(pageDirectory.getPages()).length;
    if (verbose) logger.info(`Found ${pagesCount} pages.`);


    // Render pages
    if (verbose) logger.info(`Rendering pages...`);
    let pagesRendered = 0;
    let pagesFailed = 0;
    for (const page of pageDirectory.getPages()) {
        if (await renderPage(page, pageDirectory)) {
            pagesRendered++;
        } else {
            pagesFailed++;
        } 
    }

    if (verbose) logger.info(`Rendered ${pagesRendered} of ${pagesCount} pages.`);

    //TODO move to util
    const ensureParentDirExists = (file: string) => {
        const joinedOutputPath = path.join(process.env.OUTPUT_DIR, 'static', file);
        const dir = path.dirname(joinedOutputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return joinedOutputPath;
    };

    // Copy static files
    if (verbose) logger.info(`Copying static files...`);
    try {
        const files = glob.sync(`**/*`, { 
            cwd: process.env.STATIC_DIR, 
            nodir: true,
            ignore: ['**/*.scss', '**/*.css']
        })
        
        for (const file of files) {
            const outputPath = ensureParentDirExists(file);
            const joinedPath = path.join(process.env.STATIC_DIR, file);
            fs.copyFileSync(joinedPath, outputPath);
        }

        if (verbose) logger.info(`Done.`);
    } catch (e) {
        logger.error(`Failed to copy static files: ${e.message}`);
        logger.error(e);
    }
    
    // Process CSS files
    const cssFiles = glob.sync(`**/*.{css,scss}`, {
        cwd: process.env.STATIC_DIR,
        nodir: true,
    });
    if (cssFiles.length > 0) {
        if (verbose) logger.info(`Processing CSS files...`);

        for (const file of cssFiles) {
            const outputPath = ensureParentDirExists(file);
            const joinedPath = path.join(process.env.STATIC_DIR, file);
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
        }
        
        if (verbose) logger.info(`Done.`);
    }
    

    return { success: pagesFailed == 0, errors: pagesFailed, pageDirectory: pageDirectory};
}

async function renderPage(page: Page, pageDirectory: PageDirectory): Promise<boolean> {
    let html;
    try {
        html = await render(page, pageDirectory);
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
    } catch (e) {
        logger.error(`Failed to write page ${page.buildPath}: ${e.message}`);
        return false;
    }
    return true;
}

export async function rebuildSinglePage(path: string, pageDirectory: PageDirectory): Promise<boolean> {
    const page = await pageDirectory.loadPage(path);
    if (!page) {
        return false;
    }

    return await renderPage(page, pageDirectory);
}
