import { readFileSync } from 'fs';
import glob from 'glob';
import { logger } from './logger.js'
import { marked } from 'marked';
import matter from 'gray-matter';
import chokidar from 'chokidar';

export function buildPage(page: Page) {
    try {
        const result = matter(page.raw);
        const metadata = result.data;
        const html = marked.parse(result.content, { mangle: false, headerIds: false });

        page.html = html;
        page.metadata = metadata;
        page.buildTime = Date.now();
    } catch (e) {  
        logger.error(`Failed to build page ${page.path}: ${e.message}`);
    }
}

function loadRaw(path: string): string {
    return readFileSync(`${path}`, 'utf-8'); 
}

export class PageDirectory {
    private pagesPath: string;

    public pages: Record<string, Page> = {};
    public lastFullBuild: number;
    
    constructor(pagesPath: string) {
        this.pagesPath = pagesPath;
    }
    
    public loadFromDisk = () => {
        for (const page in this.pages) {
            delete this.pages[page];
        }

        const localPages = glob.sync(`**/*.{md,html}`, { cwd: this.pagesPath })

        localPages.forEach(this.loadPage);

        this.lastFullBuild = Date.now();
        
        const watcher = chokidar.watch('.', {
            persistent: true,
            cwd: this.pagesPath,
            ignoreInitial: true,
        });
        
        const onPageChange = (page: string) => {
            logger.info(`File ${page} has been modified`);
            this.loadPage(page);
        }

        const onPageRemoval = (page: string) => {
            logger.info(`File ${page} has been removed`);
            this.removePage(page);
        }
        
        watcher.on('add', onPageChange);
        watcher.on('change', onPageChange);
        watcher.on('unlink', onPageRemoval);
    }
    
    public loadPage = (page: string): void => {
        logger.info(`Building page ${page}`);
        let route = page.replace(/\.[^.]*$/,'')
        let name = /[^/]*$/.exec(route)[0];
        let path = `${this.pagesPath}/${page}`
        let raw: string;
        try {
            raw = loadRaw(path);
        } catch (e) {
            logger.error(`Failed to read page ${path}: ${e.message}`);
            return;
        }

        this.pages[route] = {
            route: route,
            name: name,
            path: path,
            raw: raw,
            buildTime: 0,
            metadata: {
                title: "A Page"
            }
        }
        
        buildPage(this.pages[route]);
    }
    
    public removePage = (page: string): void => {
        logger.info(`Unloading page ${page}`);
        let route = page.replace(/\.[^.]*$/,'')
        delete this.pages[route];
    }

    public get(name: string): Page {
        const page = this.pages[name];
        if (!page) {
            return undefined;
        }

        return page;
    }
}

export type Page = {
    html?: string;
    raw?: string;
    route: string;
    name: string;
    path: string;
    buildTime: number;
    metadata: any;
};
