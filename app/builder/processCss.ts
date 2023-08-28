import fs from 'fs';
import * as sass from 'sass';
import CleanCSS from 'clean-css';

const cleanCss = new CleanCSS({ returnPromise: true });

export async function process(file: string): Promise<string> {
    const scss = file.endsWith('.scss');
    
    const content = fs.readFileSync(file, 'utf-8').toString();

    let css: string;
    if (scss) {
        css = sass.compileString(content).css;
    } else {
        css = content;
    }

    const minified = (await cleanCss.minify(css)).styles;

    return minified;
}
