import { render } from './render.js';
import { Page, PageDirectory } from './pages.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';

export async function buildPages(): Promise<{ success: boolean, errors: number, pageDirectory: PageDirectory}> {
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
    logger.info(`Reading pages from disk...`);
    const pageDirectory = new PageDirectory(process.env.PAGES_DIR);

    let pagesCount = Object.keys(pageDirectory.getPages()).length;
    logger.info(`Found ${pagesCount} pages.`);


    // Render pages
    logger.info(`Rendering pages...`);
    let pagesRendered = 0;
    let pagesFailed = 0;
    for (const page of pageDirectory.getPages()) {
        if (await renderPage(page, pageDirectory)) {
            pagesRendered++;
        } else {
            pagesFailed++;
        } 
    }

    logger.info(`Rendered ${pagesRendered} of ${pagesCount} pages.`);


    // Copy static files
    logger.info(`Copying static files...`);
    try {
        fs.cpSync(`${process.env.STATIC_DIR}`, `${process.env.OUTPUT_DIR}/static`, { recursive: true });
        logger.info(`Done.`);
    } catch (e) {
        logger.error(`Failed to copy static files: ${e.message}`);
    }

    return { success: true, errors: pagesFailed, pageDirectory: pageDirectory};
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
    const page = pageDirectory.loadPage(path);
    if (!page) {
        return false;
    }

    return await renderPage(page, pageDirectory);
}
