import { readFileSync } from 'fs';
import glob from 'glob';
import { logger } from '../logger.js'
import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import matter from 'gray-matter';

marked.use(gfmHeadingId());

export async function parsePage(page: Page) {
    try {
        const frontmatter = matter(page.raw);
        const config = frontmatter.data;
        const html = marked.parse(frontmatter.content, { mangle: false });

        page.html = html;
        page.config = config;
        page.view = config.view || 'index';
        page.buildTime = Date.now();
    } catch (e) {  
        logger.error(`Failed to parse page ${page.originalPath}: ${e.message}`);
    }
}

function loadRaw(path: string): string {
    return readFileSync(`${path}`, 'utf-8'); 
}

export class PageDirectory {
    private pagesPath: string;

    private pages: Record<string, Page> = {};
    private lastFullBuild: number;
    
    constructor(pagesPath: string) {
        this.pagesPath = pagesPath;

        for (const page in this.pages) {
            delete this.pages[page];
        }
    }
    
    public init = async (): Promise<void> => {
        const localPages = glob.sync(`**/*.{md,html}`, { cwd: this.pagesPath })
        for (const page in localPages) {
            await this.loadPage(localPages[page]);
        }
        this.lastFullBuild = Date.now();
    }
    
    public loadPage = async (page: string): Promise<Page> => {
        let route = `/${page.replace(/\.[^.]*$/,'')}`;
        let name = /[^/]*$/.exec(route)[0];
        let originalPath = page;
        let fullPath = `${this.pagesPath}/${page}`
        let buildPath = `${process.env.OUTPUT_DIR}/${route}.html`
        let view = `${route}`
        let raw: string;
        try {
            raw = loadRaw(fullPath);
        } catch (e) {
            logger.error(`Failed to read page ${originalPath}: ${e.message}`);
            return undefined;
        }

        this.pages[route] = {
            route: route,
            name: name,
            originalPath: originalPath,
            fullPath: fullPath,
            buildPath: buildPath,
            view: view,
            raw: raw,
            buildTime: 0,
            config: {}
        }
        
        await parsePage(this.pages[route]);
        
        return this.pages[route];
    }
    
    public removePage = (page: string): void => {
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

    public getPages(): Page[] {
        return Object.values(this.pages);
    }
    
    public getPagesBeginningWith(prefix: string): Page[] {
        return Object.values(this.pages).filter(page => page.route.startsWith(prefix));
    }
}

export type Page = {
    html?: string;
    raw?: string;
    route: string;
    name: string;
    originalPath: string;
    fullPath: string;
    buildPath: string;
    view: string;
    buildTime: number;
    config: any;
};
