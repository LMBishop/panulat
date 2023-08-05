import { readFileSync } from 'fs';
import glob from 'glob';
import { logger } from './logger.js'
import { marked } from 'marked';
import matter from 'gray-matter';

export function buildPage(page: Page) {
    logger.info(`Building ${page.path}`);
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

export namespace PageDirectory {
    export const pages: Record<string, Page> = {};
    export let lastBuild: number;
    
    export const rebuild = (pagePath: string): boolean => {
        for (const page in pages) {
            delete pages[page];
        }

        const localPages = glob.sync(`**/*.{md,html}`, { cwd: pagePath })

        // Load page content
        localPages.forEach(page => {
            let route = page.replace(/\.[^.]*$/,'')
            let name = /[^/]*$/.exec(route)[0];
            let path = `${pagePath}/${page}`
            let raw: string;
            try {
                raw = loadRaw(path);
            } catch (e) {
                logger.error(`Failed to read page ${path}: ${e.message}`);
                return;
            }

            pages[route] = {
                route: route,
                name: name,
                path: path,
                raw: raw,
                buildTime: 0,
                metadata: {
                    title: "A Page"
                }
            }
        });
        
        // Build pages
        Object.values(pages).forEach(page => buildPage(page));

        lastBuild = Date.now();
        return true;
    }

    export function get(name: string): Page {
        const page = pages[name];
        if (!page) {
            return undefined;
        }

        return page;
    }

    function loadRaw(path: string): string {
        return readFileSync(`${path}`, 'utf-8'); 
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
