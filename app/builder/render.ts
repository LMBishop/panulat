import { Page, PageDirectory } from "./pages";
import ejs from 'ejs';
import path from 'path';
import os from 'os';

export async function render(page: Page, pageDirectory: PageDirectory): Promise<string> {
    const options = {
        page: page,
        site: {
            pages: pageDirectory,
        },
        build: {
            date: new Date(),
            os: {
                hostname: os.hostname(),
                platform: os.platform(),
                release: os.release(),
                type: os.type(),
            },
            palunat: {
                version: process.env.npm_package_version,
            },
        }
    };
    return await ejs.renderFile(path.join(process.env.VIEWS_DIR, `${page.view}.ejs`), options);
}
