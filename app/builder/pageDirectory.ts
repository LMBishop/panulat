import { readFileSync } from "fs";
import glob from "glob";
import { logger } from "../logger.js";
import { marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import markedFootnote from "marked-footnote";
import matter from "gray-matter";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import hljsDefineSolidity from 'highlightjs-solidity';
import YAML from 'yaml'

hljsDefineSolidity(hljs);
hljs.initHighlightingOnLoad();

// https://marked.js.org/using_pro#extensions
// TODO move parsinmg to its own file
const descriptionList = {
    name: 'descriptionList',
    level: 'block',

    start(src) {
        return src.match(/^[^\n]+\n: /m)?.index;
    },

    tokenizer(src) {
        const rule = /^([^\n]+)\n((?:: .*(?:\n|$))+)/;
        const match = rule.exec(src);
        if (!match) return;

        const term = match[1].trim();
        const definitions = match[2]
            .trim()
            .split('\n')
            .map(line => line.replace(/^: /, '').trim());

        return {
            type: 'descriptionList',
            raw: match[0],
            term: this.lexer.inlineTokens(term),
            definitions: definitions.map(def => this.lexer.inlineTokens(def))
        };
    },

    renderer(token) {
        const dt = `<dt>${this.parser.parseInline(token.term)}</dt>`;
        const dds = token.definitions .map(def => `<dd>${this.parser.parseInline(def)}</dd>` ) .join('\n');
        return `<dl>\n${dt}\n${dds}\n</dl>`;
    },

    childTokens: ['term', 'definitions']
};

marked.use({ extensions: [descriptionList] });

marked.use(gfmHeadingId());
marked.use(markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    }
}));
marked.use(markedFootnote());

// https://github.com/markedjs/marked/discussions/2982
marked.use({
    renderer: {
        link(href, title, text) {
            const link = marked.Renderer.prototype.link.call(this, href, title, text);
            if (/href=['"]https?:\/\//g.test(link)) {
                return link.replace("<a","<a target='_blank' rel='noreferrer' ");
            }
            return link
        }
    }
})

export async function parsePage(page: Page) {
    try {
        const frontmatter = matter(page.raw);
        const config = frontmatter.data;
        const html = marked.parse(frontmatter.content, { mangle: false });

        page.html = html;
        page.config = config;
        page.view = config.view || "index";
        page.buildTime = Date.now();
    } catch (e) {
        logger.error(`Failed to parse page ${page.originalPath}: ${e.message}`);
    }
}

function loadRaw(path: string): string {
    return readFileSync(`${path}`, "utf-8");
}

export class PageDirectory {
    private pagesPath: string;
    private outputDir: string;

    private pages: Record<string, Page> = {};
    private feeds: Record<string, Feed> = {};
    private lastFullBuild: number;

    constructor(pagesPath: string, outputDir: string) {
        this.pagesPath = pagesPath;
        this.outputDir = outputDir;

        for (const page in this.pages) {
            delete this.pages[page];
        }
    }

    public init = async (): Promise<void> => {
        const localPages = glob.sync(`**/*.{md,html}`, { cwd: this.pagesPath });
        for (const page in localPages) {
            await this.loadPage(localPages[page]);
        }
        const localFeeds = glob.sync(`**/feed.yml`, { cwd: this.pagesPath });
        for (const feed in localFeeds) {
            await this.loadFeed(localFeeds[feed]);
        }
        this.lastFullBuild = Date.now();
    };

    public loadPage = async (page: string): Promise<Page> => {
        let route = `/${page.replace(/\.[^.]*$/, "")}`;
        let name = /[^/]*$/.exec(route)[0];
        let originalPath = page;
        let fullPath = `${this.pagesPath}/${page}`;
        let outputPath = `${route}.html`
        let buildPath = `${this.outputDir}/${outputPath}`;
        let view = `${route}`;
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
            outputPath: outputPath,
            buildPath: buildPath,
            view: view,
            raw: raw,
            buildTime: 0,
            config: {},
        };

        await parsePage(this.pages[route]);

        return this.pages[route];
    };

    public loadFeed = async (path: string): Promise<Feed> => {
        let feed;
        try {
            feed = YAML.parse(loadRaw(`${this.pagesPath}/${path}`));
        } catch (e) {
            logger.error(`Failed to read feed ${path}: ${e.message}`);
            return undefined;
        }

        this.feeds[feed.pages] = {
            title: feed.title,
            route: feed.pages,
            url: feed.url,
            originalPath: path,
            outputPath: `${feed.pages}/atom.xml`,
            buildPath: `${this.outputDir}/${feed.pages}/atom.xml`,
            paramStrategy: feed.paramStrategy,
            updated: new Date(0),
            entries: []
        }

        return this.feeds[feed.pages];
    };

    public removePage = (page: string): void => {
        let route = page.replace(/\.[^.]*$/, "");
        delete this.pages[route];
    };

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

    public getFeeds(): Feed[] {
        return Object.values(this.feeds);
    }

    public getPagesBeginningWith(prefix: string): Page[] {
        return Object.values(this.pages).filter((page) =>
            page.route.startsWith(prefix)
        );
    }
}

export type Page = {
    html?: string;
    raw?: string;
    route: string;
    name: string;
    originalPath: string;
    fullPath: string;
    outputPath: string;
    buildPath: string;
    view: string;
    buildTime: number;
    config: any;
};

export type Feed = {
    route: string;
    title: string;
    url: string;
    originalPath: string;
    outputPath: string;
    buildPath: string;
    paramStrategy: any;
    updated: Date;
    entries: FeedEntry[];
}

export type FeedEntry = {
    title: string;
    updated: Date;
    id: string;
    url: string;
    content: string;
}
