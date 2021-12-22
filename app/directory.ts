import * as parser from './wikiparser.js';
import { readFileSync } from 'fs';
import glob from 'glob';
import { logger } from './logger.js'

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
            page = this.convertNameToStandard(page.replace('.wiki', '').replace('/', ':'));
            this.pages[page] = {
                standardName: page,
                raw: this.loadRaw(page),
                buildTime: 0,
                metadata: {
                    dependencies: [],
                    dependents: [],
                    errors: []
                }
            }
        });

        const dependencyGraph: Record<string, string[]>  = {};

        Object.keys(this.pages).forEach(name => dependencyGraph[name] = Array.from(parser.findDependencies(this.pages[name].raw)).map(e => this.convertNameToStandard(e)));

        function traverse(dependents: string[], dependencies: string[], recursionCount: number) {
            if (recursionCount > parseInt(process.env.PARSER_MAX_RECURSION, 10)) {
                throw new RecursionError('max recursion reached');
            }
            dependencies?.forEach((dependency: string) => {
                if (dependencyGraph[dependency]?.length != 0) {
                    dependents.forEach((dependent: string) => {
                        if (dependencyGraph[dependency]?.includes(dependent)) {
                            throw new DependencyError(`circular dependency between ${dependent} and ${dependency}`, [dependent, dependency]);
                        }
                    });
                    traverse([...dependents, dependency], dependencyGraph[dependency], recursionCount + 1);
                }
            });
        }

        Object.keys(dependencyGraph).forEach(name => { 
            dependencyGraph[name].forEach(dependency => {
                try {
                    traverse([name, dependency], dependencyGraph[dependency], 1);
                } catch (e) {
                    if (e instanceof RecursionError) {
                        this.pages[name].metadata.errors.push({
                            identifier: 'max-recursion-reached', 
                            message: `maximum dependency depth of ${process.env.PARSER_MAX_RECURSION} reached`
                        })
                        logger.warn(`max recursion for ${name} reached`)
                    } else if (e instanceof DependencyError) {
                        if (e.pages.includes(name)) {
                            this.pages[name].metadata.errors.push({
                                identifier: 'circular-dependency', 
                                message: e.message
                            })
                            logger.warn(`${e.pages[0]} has a circular dependency with ${e.pages[1]}`)
                        } else {
                            logger.warn(`transclusions on page ${name} may not resolve due to dependency errors in its dependency tree`)
                        }
                    } else {
                        throw e;
                    }
                }
            });
        });

        const primaryPages = [];
        Object.keys(this.pages).forEach(name => {
            if (this.pages[name].metadata.errors.length == 0) {
                this.pages[name] = this.buildPage(name);
                if (this.pages[name].metadata.includeInNavbar) {
                    primaryPages.push(this.pages[name]);
                }
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

    private loadRaw(name: string): string {
        name = this.convertNameToStandard(name);
        let data: string;
        try {
            data = readFileSync(`${this.pagePath}/${this.convertStandardToFilePath(name)}`, 'utf-8'); 
        } catch {
            return undefined;
        }
        return data;
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
        if (this.pages[name]?.raw) {
            data = this.pages[name]?.raw
        } else {
            data = this.loadRaw(name)
        }

        const result = parser.parse(this, data);
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
                displayTitle: title,
                dependencies: [],
                dependents: [],
                errors: []
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
        name = name.replace(/[^a-z0-9:]/gi, '_').toLowerCase();
        if (!name.includes(':')) {
            name = `main:${name}`;
        }
        return name;
    }

    /**
     * Convert a standard name to a file path.
     * 
     * @param name standard name for a page
     */
    private convertStandardToFilePath(name: string): string {
        const [first, second] = name.replace('main:', '').split(':');
        const [title, subpage] = ((second) ? second : first).split('.')
        const namespace = (second) ? first : undefined

        return `${namespace ? `${namespace}/` : ''}${title}${subpage ? `.${subpage}` : ''}.wiki`
    }
}

export type Page = {
    html?: string;
    raw?: string;
    standardName: string;
    buildTime: number;
    metadata: PageMetadata;
};

export type PageMetadata = {
    displayTitle?: string;
    sortOrder?: number;
    showTitle?: boolean;
    includeInNavbar?: boolean;
    dependencies: string[];
    dependents: string[];
    errors: PageError[];
};

export type PageError = {
    identifier: string;
    message: string;
}

export class DependencyError extends Error {
    pages: string[]

    constructor(message: string, pages: string[]) {
        super(message);
        this.pages = pages;

        Object.setPrototypeOf(this, DependencyError.prototype);
    }
}

export class RecursionError extends Error {
    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, RecursionError.prototype);
    }
}
