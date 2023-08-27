import { Page, PageDirectory } from "./pages";
import ejs from 'ejs';
import path from 'path';
import buildInfo from "../config/info.js";

export async function render(page: Page, pageDirectory: PageDirectory): Promise<string> {
    const options = {
        page: page,
        site: {
            pages: pageDirectory,
        },
        build: buildInfo,
    };
    return await ejs.renderFile(path.join(process.env.VIEWS_DIR, `${page.view}.ejs`), options);
}
