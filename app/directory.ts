import * as parser from './wikiparser.js';
import { readFileSync } from 'fs';
import glob from 'glob';
import { logger } from './logger.js'

/**
 * Build a page.
 * 
 * @param path standard name for page
 * @returns newly built page, or undefined
 */
export function buildPage(directory: PageDirectory, page: Page) {
    const result = parser.parse(directory, page.raw);
    const title = result.metadata.displayTitle ?? page.standardName;
    const content = `${result.metadata.notitle ? '' : `<h1>${title}</h1>`}${result.html}`;

    page.html = content;
    page.buildTime = Date.now();
    page.metadata.includeInNavbar = result.metadata.primary ?? false;
    page.metadata.sortOrder = result.metadata.sortOrder ?? -1;
    page.metadata.showTitle = !result.metadata.notitle ?? true;
    page.metadata.displayTitle = title;
}

/**
 * Convert a page name to a standard name.
 * A standard name is the key used by the page directory.
 * 
 * @param name non-standard name for a page
 */
export function convertNameToStandard(name: string): string {
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
export function convertStandardToFilePath(name: string): string {
    const [first, second] = name.replace('main:', '').split(':');
    const [title, subpage] = ((second) ? second : first).split('.')
    const namespace = (second) ? first : undefined

    return `${namespace ? `${namespace}/` : ''}${title}${subpage ? `.${subpage}` : ''}.wiki`
}

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

        // Load page content
        pages.forEach(page => {
            page = convertNameToStandard(page.replace('.wiki', '').replace('/', ':'));
            this.pages[page] = {
                standardName: page,
                raw: this.loadRaw(page),
                buildTime: 0,
                metadata: {
                    dependencies: new Set(),
                    dependents: new Set(),
                    errors: []
                }
            }
        });

        const dependencyGraph: Record<string, string[]>  = {};

        Object.keys(this.pages).forEach(name => dependencyGraph[name] = Array.from(parser.findDependencies(this.pages[name].raw)).map(e => convertNameToStandard(e)));

        // Revursive dependency graph traversal function
        function traverseGraph(dependents: string[], current: string, dependencies: string[], recursionCount: number, pages: Record<string, Page>) {
            if (recursionCount > parseInt(process.env.PARSER_MAX_RECURSION, 10)) {
                throw new RecursionError('max recursion reached');
            }

            dependencies?.forEach(e => { 
                pages[current]?.metadata.dependencies.add(e)
                if (e !== current) {
                    pages[e]?.metadata.dependents.add(current);
                }
            });

            dependencies?.forEach((dependency: string) => {
                if (dependencyGraph[dependency]?.length != 0) {
                    dependents.forEach((dependent: string) => {
                        if (dependencyGraph[dependency]?.includes(dependent)) {
                            throw new DependencyError(`circular dependency between ${dependent} and ${dependency}`, [dependent, dependency]);
                        }
                    });
                    traverseGraph([...dependents, dependency], dependency, dependencyGraph[dependency], recursionCount + 1, pages);
                }
            });
        }

        // Catch circular dependencies and build dependency tree
        Object.keys(dependencyGraph).forEach(name => { 
            try {
                traverseGraph([name], name, dependencyGraph[name], 1, this.pages);
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

        function recursiveBulld(pages: Record<string, Page>, current: Page, directory: PageDirectory, buildPage: (directory: PageDirectory, page: Page) => void) {
            if (current.metadata.errors.length == 0) {
                current.metadata.dependencies.forEach(dependency => {
                    if (pages[dependency].buildTime == 0) {
                        recursiveBulld(pages, pages[dependency], directory, buildPage);
                    }
                });
                buildPage(directory, current)
            }
        }

        // Build pages in order
        const primaryPages = [];
        Object.keys(this.pages).forEach(name => {
            recursiveBulld(this.pages, this.pages[name], this, buildPage);
        });

        // Sort primary pages
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
        return !!this.pages[convertNameToStandard(name)];
    }

    /**
     * Get a page.
     * 
     * @param name standard name for page 
     * @returns page
     */
    get(name: string): Page {
        name = convertNameToStandard(name);
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
        name = convertNameToStandard(name);
        return this.pages[name]?.raw;
    }

    /**
     * Purge (rebuild) a page.
     * 
     * @param name standard name for page 
     * @returns whether the page was rebuilt
     */
    purge(name: string): boolean {
        name = convertNameToStandard(name);
        const page = this.pages[name];
        if (page) {
            if (page.buildTime + parseInt(process.env.PURGE_COOLDOWN_MIN, 10) * 60 * 1000 > Date.now()) {
                return false;
            } else {
                // delete this.pages[name];
                // if (this.buildPage(name)) {
                //     return true;
                // }
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
        name = convertNameToStandard(name);
        let data: string;
        try {
            data = readFileSync(`${this.pagePath}/${convertStandardToFilePath(name)}`, 'utf-8'); 
        } catch {
            return undefined;
        }
        return data;
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
    dependencies: Set<string>;
    dependents: Set<string>;
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
