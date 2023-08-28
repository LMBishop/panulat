import { Page, PageDirectory } from "./pages";
import ejs from 'ejs';
import path from 'path';
import buildInfo from "../config/info.js";
import htmlMinify from 'html-minifier-terser';

export async function render(page: Page, pageDirectory: PageDirectory): Promise<string> {
    const options = {
        page: page,
        site: {
            pages: pageDirectory,
        },
        build: buildInfo,
    };
    const html = await ejs.renderFile(path.join(process.env.VIEWS_DIR, `${page.view}.ejs`), options);
    
    const minifiedHtml = await htmlMinify.minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        continueOnParseError: true,
        minifyCSS: true,
        minifyJS: true,
    });
    
    return minifiedHtml;
}
