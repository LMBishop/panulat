import { parse } from './wikiparser.js';
import { readFileSync } from 'fs';
import glob from 'glob';

export class PageDirectory {

    pages: Record<string, Page>;
    primaryPages: Page[];
    pagePath: string;
    lastBuild: number;
    
    constructor(root: string) {
        this.lastBuild = 0;
        this.pages = {};
        this.pagePath = root;

        this.rebuild();
    }

    /**
     * Build this page directory.
     * 
     * @returns whether the directory was built
     */
    rebuild(): boolean {
        if (this.lastBuild + parseInt(process.env.REBUILD_COOLDOWN_MIN, 10) * 60 * 1000 > Date.now()) {
            return false;
        }
        for (const page in this.pages) {
            delete this.pages[page];
        }

        const pages = glob.sync(`**/*.wiki`, { cwd: this.pagePath })

        pages.forEach(page => {
            page = page.replace('.wiki', '').replace('/', ':').replace(/[^a-z0-9:]/gi, '_').toLowerCase();
            this.pages[page] = {
                standardName: page,
                buildTime: 0,
                metadata: {}
            }
        });

        // Build templates first
        Object.keys(this.pages).forEach(name => {
            if (name.includes('Template:')) {
                this.pages[name] = this.buildPage(name);
            }
        });

        const primaryPages = [];
        Object.keys(this.pages).forEach(name => {
            if (!name.includes('Template:')) {
                this.pages[name] = this.buildPage(name);
            }
            if (this.pages[name].metadata.includeInNavbar) {
                primaryPages.push(this.pages[name]);
            }
        });

        primaryPages.sort((a, b) => {
            return a.metadata.sortOrder - b.metadata.sortOrder;
        });
        this.primaryPages = primaryPages;
        this.lastBuild = Date.now();
        return true;
    }

    /**
     * Get whether a page exists with this name.
     * 
     * @param name standard name for page
     * @returns whether the page exists
     */
    exists(name: string): boolean {
        return !!this.pages[this.convertNameToStandard(name)];
    }

    /**
     * Get a page.
     * 
     * @param name standard name for page 
     * @returns page
     */
    get(name: string): Page {
        name = this.convertNameToStandard(name);
        const page = this.pages[name];
        if (!page) {
            return undefined;
        }
    
        if (!page.html) {
            return this.buildPage(name)
        }
    
        return page;
    }

    /**
     * Get the raw wikitext for a page.
     * 
     * @param name standard name for page
     * @returns raw wikitext
     */
    getRaw(name: string): string {
        name = this.convertNameToStandard(name);
        return this.pages[name]?.raw;
    }

    /**
     * Purge (rebuild) a page.
     * 
     * @param name standard name for page 
     * @returns whether the page was rebuilt
     */
    purge(name: string): boolean {
        name = this.convertNameToStandard(name);
        const page = this.pages[name];
        if (page) {
            if (page.buildTime + parseInt(process.env.PURGE_COOLDOWN_MIN, 10) * 60 * 1000 > Date.now()) {
                return false;
            } else {
                delete this.pages[name];
                if (this.buildPage(name)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get all pages.
     * 
     * @returns all pages
     */
    getPages(): Record<string, Page> {
        return this.pages;
    }

    /**
     * Get primary pages.
     * 
     * @param current 
     * @returns 
     */
    getPrimaryPages(): Page[] {
        return this.primaryPages;
    }
    
    /**
     * Build a page.
     * 
     * @param path standard name for page
     * @returns newly built page, or undefined
     */
    private buildPage(name: string): Page {
        name = this.convertNameToStandard(name);
        let data: string;
        try {
            data = readFileSync(`${this.pagePath}/${this.convertStandardToFilePath(name)}`, 'utf-8'); 
        } catch {
            return undefined;
        }
        const result = parse(this, data);
        const title = result.metadata.displayTitle ?? name
        const content = `${result.metadata.notitle ? '' : `<h1>${title}</h1>`}${result.html}`;
    
        const page: Page = {
            html: content,
            raw: data,
            standardName: name,
            buildTime: Date.now(),
            metadata: {
                includeInNavbar: result.metadata.primary ?? false,
                sortOrder: result.metadata.sortOrder ?? -1,
                showTitle: !result.metadata.notitle ?? true,
                displayTitle: title
            }
        };
        this.pages[name] = page;
        return page;
    }

    /**
     * Convert a page name to a standard name.
     * A standard name is the key used by the page directory.
     * 
     * @param name non-standard name for a page
     */
    private convertNameToStandard(name: string): string {
        return name.replace(/[^a-z0-9:]/gi, '_').toLowerCase();
    }

    /**
     * Convert a standard name to a file path.
     * 
     * @param name standard name for a page
     */
    private convertStandardToFilePath(name: string): string {
        const [first, second] = name.split(':');
        const [title, subpage] = ((second) ? second : first).split('.')
        const namespace = (second) ? first : undefined

        return `${namespace ? `${namespace}/` : ''}${title}${subpage ? `.${subpage}` : ''}.wiki`
    }
}

export type Page = {
    html?: string;
    raw?: string;
    standardName: string,
    buildTime: number;
    metadata: PageMetadata;
};

export type PageMetadata = {
    displayTitle?: string;
    sortOrder?: number;
    showTitle?: boolean;
    includeInNavbar?: boolean;
};
