/*
 * This file is a modified version of Nixinova/Wikity, whose license is given below:
 * Original: https://www.npmjs.com/package/wikity
 * 
 * > ISC License
 * > 
 * > Copyright © 2021 Nixinova
 * > 
 * > Permission to use, copy, modify, and/or distribute this software for any purpose with or 
 * > without fee is hereby granted, provided that the above copyright notice and this 
 * > permission notice appear in all copies.
 * > 
 * > The software is provided "as is" and the author disclaims all warranties with regard to 
 * > this software including all implied warranties of merchantability and fitness. In no 
 * > event shall the author be liable for any special, direct, indirect, or consequential 
 * > damages or any damages whatsoever resulting from loss of use, data or profits, whether 
 * > in an action of contract, negligence or other tortious action, arising out of or in 
 * > connection with the use or performance of this software.
 * 
 * Additonally, this project and my modifications are also licensed under the ISC license.
 */
import dateFormat from 'dateformat';
import htmlEscape from 'escape-html';
import * as fs from 'fs';

const re = (regex, flag = 'mgi') => {
    return RegExp(regex.replace(/ /g, '').replace(/\|\|.+?\|\|/g, ''), flag);
};
const r = String.raw;
const arg = r`\s*([^|}]+?)\s*`;

export function parse(data) {
    const vars = {};
    const metadata = {};
    let nowikis = [];
    let nowikiCount = 0;
    let rawExtLinkCount = 0;
    let refCount = 0;
    let refs = [];

    let outText = data;

    for (let l = 0, last = ''; l < parseInt(process.env.PARSER_MAX_RECURSION, 10); l++) {
        if (last === outText) break; last = outText;

        outText = outText

            // Nowiki: <nowiki></nowiki>
            .replace(re(r`<nowiki> ([^]+?) </nowiki>`), (_, m) => `%NOWIKI#${nowikis.push(m), nowikiCount++}%`)

            // Sanitise unacceptable HTML
            .replace(re(r`<(/?) \s* (?= script|link|meta|iframe|frameset|object|embed|applet|form|input|button|textarea )`), '&lt;$1')
            .replace(re(r`(?<= <[^>]+ ) (\bon(\w+))`), 'data-$2')

            // Comments: <!-- -->
            .replace(/<!--[^]+?-->/g, '')

            // Lines: ----
            .replace(/^-{4,}/gm, '<hr>')

            // Metadata: displayTitle, __NOTOC__, etc
            .replace(re(r`{{ \s* displayTitle: ([^}]+) }}`), (_, title) => (metadata.displayTitle = title, ''))
            .replace(re(r`{{ \s* navbarSortOrder: ([^}]+) }}`), (_, order) => (metadata.sortOrder = parseInt(order, 10), ''))
            .replace(re(r`__NOINDEX__`), () => (metadata.noindex = true, ''))
            .replace(re(r`__NOTOC__`), () => (metadata.notoc = true, ''))
            .replace(re(r`__FORCETOC__`), () => (metadata.toc = true, ''))
            .replace(re(r`__TOC__`), () => (metadata.toc = true, '<toc></toc>'))
            .replace(re(r`__PRIMARY__`), () => (metadata.primary = true, ''))
            .replace(re(r`__NOTITLE__`), () => (metadata.notitle = true, ''))

            // Magic words: {{!}}, {{reflist}}, etc
            .replace(re(r`{{ \s* ! \s* }}`), '&vert;')
            .replace(re(r`{{ \s* = \s* }}`), '&equals;')
            .replace(re(r`{{ \s* [Rr]eflist \s* }}`), '<references/>')

            // String functions: {{lc:}}, {{ucfirst:}}, {{len:}}, etc
            .replace(re(r`{{ \s* #? urlencode: ${arg} }}`), (_, m) => encodeURI(m))
            .replace(re(r`{{ \s* #? urldecode: ${arg} }}`), (_, m) => decodeURI(m))
            .replace(re(r`{{ \s* #? lc: ${arg} }}`), (_, m) => m.toLowerCase())
            .replace(re(r`{{ \s* #? uc: ${arg} }}`), (_, m) => m.toUpperCase())
            .replace(re(r`{{ \s* #? lcfirst: ${arg} }}`), (_, m) => m[0].toLowerCase() + m.substr(1))
            .replace(re(r`{{ \s* #? ucfirst: ${arg} }}`), (_, m) => m[0].toUpperCase() + m.substr(1))
            .replace(re(r`{{ \s* #? len: ${arg} }}`), (_, m) => m.length)
            .replace(re(r`{{ \s* #? pos: ${arg} \|${arg} (?: \s*\|${arg} )? }}`), (_, find, str, n = 0) => find.substr(n).indexOf(str))
            .replace(re(r`{{ \s* #? sub: ${arg} \|${arg} (?:\|${arg})? }}`), (_, str, from, len) => str.substr(+from - 1, +len))
            .replace(re(r`{{ \s* #? padleft: ${arg} \|${arg} \|${arg} }}`), (_, str, n, char) => str.padStart(+n, char))
            .replace(re(r`{{ \s* #? padright: ${arg} \|${arg} \|${arg} }}`), (_, str, n, char) => str.padEnd(+n, char))
            .replace(re(r`{{ \s* #? replace: ${arg} \|${arg} \|${arg} }}`), (_, str, find, rep) => str.split(find).join(rep))
            .replace(re(r`{{ \s* #? explode: ${arg} \|${arg} \|${arg} }}`), (_, str, delim, pos) => str.split(delim)[+pos])

            // Parser functions: {{#if:}}, {{#switch:}}, etc
            .replace(re(r`{{ \s* (#\w+) \s* : \s* ( [^{}]+ ) \s* }}  ( ?!} )`), (_, name, content) => {
                if (/{{\s*#/.test(content)) return _;
                const args = content.trim().split(/\s*\|\s*/);
                switch (name) {
                case '#if':
                    return (args[0] ? args[1] : args[2]) || '';
                case '#ifeq':
                    return (args[0] === args[1] ? args[2] : args[3]) || '';
                case '#vardefine':
                    vars[args[0]] = args[1] || '';
                    return '';
                case '#var':
                    if (re(r`{{ \s* #vardefine \s* : \s* ${args[0]}`).test(outText)) return _; // wait until var is set
                    return vars[args[0]] || args[1] || '';
                case '#switch':
                    return args.slice(1)
                        .map(arg => arg.split(/\s*=\s*/))
                        .filter(duo => args[0] === duo[0].replace('#default', args[0]))[0][1];
                case '#time':
                case '#date':
                case '#datetime':
                    return dateFormat(args[1] ? new Date(args[1]) : new Date(), args[0]);
                }
            })

            // Templates: {{template}}
            .replace(re(r`{{ \s* ([^#}|]+?) (\|[^}]+)? }} (?!})`), (_, title, params = '') => {
                if (/{{/.test(params)) return _;
                const page = 'Template:' + title.trim().replace(/ /g, '_');

                // Retrieve template content
                let content = '';
                try {
                    content = fs.readFileSync(page + '.wiki', 'utf8' );
                }
                catch {
                    return `<a class="internal-link redlink" title="${title}" href="${page}">${title}</a>`;
                }

                // Remove non-template sections
                content = content
                    .replace(/<noinclude>.*?<\/noinclude>/gs, '')
                    .replace(/.*<(includeonly|onlyinclude)>|<\/(includeonly|onlyinclude)>.*/gs, '');

                // Substitite arguments
                const argMatch = (arg) => re(r`{{{ \s* ${arg} (?:\|([^}]*))? \s* }}}`);
                let args = params.split('|').slice(1);
                for (let i in args) {
                    let parts = args[i].split('=');
                    let [arg, val] = parts[1] ? [parts[0], ...parts.slice(1)] : [(+i + 1) + '', parts[0]];
                    content = content.replace(argMatch(arg), (_, m) => val || m || '');
                }
                for (let i = 1; i <= 10; i++) {
                    content = content.replace(argMatch(arg), '$2');
                }

                return content;
            })

            // Images: [[File:Image.png|options|caption]]
            .replace(re(r`\[\[ (?:File|Image): (.+?) (\|.+?)? \]\]`), (_, file, params) => {
                if (/{{/.test(params)) return _;
                const path = 'File:' + file.trim().replace(/ /g, '_');
                let caption = '';
                let imageData = {};
                let imageArgs = params.split('|').map((arg) => arg.replace(/"/g, '&quot;'));
                for (const param of imageArgs) {
                    if (['left', 'right', 'center', 'none'].includes(param)) {
                        imageData.float = param;
                    }
                    if (['baseline', 'sub', 'super', 'top', 'text-bottom', 'middle', 'bottom', 'text-bottom'].includes(param)) {
                        imageData.align = param;
                    }
                    else if (['border', 'frameless', 'frame', 'framed', 'thumb', 'thumbnail'].includes(param)) {
                        imageData.type = { framed: 'frame', thumbnail: 'thumb' }[param] || param;
                        if (imageData.type === 'thumb') imageData.hasCaption = true;
                    }
                    else if (param.endsWith('px')) {
                        param.replace(/(?:(\w+)?(x))?(\w+)px/, (_, size1, auto, size2) => {
                            if (size1) Object.assign(imageData, { width: size1, height: size2 });
                            else if (auto) Object.assign(imageData, { width: 'auto', height: size2 });
                            else Object.assign(imageData, { width: size2, height: 'auto' });
                            return '';
                        });
                    }
                    else if (param.startsWith('upright=')) {
                        imageData.width = +param.replace('upright=', '') * 300;
                    }
                    else if (param.startsWith('link=')) {
                        imageData.link = param.replace('link=', '');
                    }
                    else if (param.startsWith('alt=')) {
                        imageData.alt = param.replace('alt=', '');
                    }
                    else if (param.startsWith('style=')) {
                        imageData.style = param.replace('style=', '');
                    }
                    else if (param.startsWith('class=')) {
                        imageData.class = param.replace('class=', '');
                    }
                    else {
                        caption = param;
                    }
                }
                let content = `
                    <figure
                        class="${imageData.class || ''} image-container image-${imageData.type || 'default'}"
                        style="float:${imageData.float || 'none'};vertical-align:${imageData.align || 'unset'};${imageData.style || ''}"
                    >
                        <img
                            src="${path}"
                            alt="${imageData.alt || file}"
                            width="${imageData.width || 300}"
                            height="${imageData.height || 300}"
                        >
                        ${imageData.hasCaption ? `<figcaption>${caption}</figcaption>` : ''}
                    </figure>
                `;
                if (imageData.link) content = `<a href="/${imageData.link}" title="${imageData.link}">${content}</a>`;
                return content;
            })

            // Markup: '''bold''' and '''italic'''
            .replace(re(r`''' ([^']+?) '''`), '<b>$1</b>')
            .replace(re(r`''  ([^']+?)  ''`), '<i>$1</i>')

            // Headings: ==heading==
            .replace(re(r`^ (=+) \s* (.+?) \s* \1 \s* $`), (_, lvl, txt) => `<h${lvl.length} id="${encodeURI(txt.replace(/ /g, '_'))}">${txt}</h${lvl.length}>`)

            // Internal links: [[Page]] and [[Page|Text]]
            .replace(re(r`\[\[ ([^\]|]+?) \]\]`), '<a class="internal-link" title="$1" href="$1">$1</a>')
            .replace(re(r`\[\[ ([^\]|]+?) \| ([^\]]+?) \]\]`), '<a class="internal-link" title="$1" href="/$1">$2</a>')
            .replace(re(r`(</a>)([a-z]+)`), '$2$1')

            // External links: [href Page] and just [href]
            .replace(re(r`\[ ((?:\w+:)?\/\/ [^\s\]]+) (\s [^\]]+?)? \]`), (_, href, txt) => `<a class="external-link" href="${href}">${txt || '[' + (++rawExtLinkCount) + ']'}</a>`)

            // Bulleted list: *item
            .replace(re(r`^ (\*+) (.+?) $`), (_, lvl, txt) => `${'<ul>'.repeat(lvl.length)}<li>${txt}</li>${'</ul>'.repeat(lvl.length)}`)
            .replace(re(r`</ul> (\s*?) <ul>`), '$1')

            // Numbered list: #item
            .replace(re(r`^ (#+) (.+?) $`), (_, lvl, txt) => `${'<ol>'.repeat(lvl.length)}<li>${txt}</li>${'</ol>'.repeat(lvl.length)}`)
            .replace(re(r`</ol> (\s*?) <ol>`), '$1')

            // Definition list: ;head, :item
            .replace(re(r`^ ; (.+) $`), '<dl><dt>$1</dt></dl>')
            .replace(re(r`^ (:+) (.+?) $`), (_, lvl, txt) => `${'<dl>'.repeat(lvl.length)}<dd>${txt}</dd>${'</dl>'.repeat(lvl.length)}`)
            .replace(re(r`</dl> (\s*?) <dl>`), '$1')

            // Tables: {|, |+, !, |-, |, |}
            .replace(re(r`^ \{\| (.*?) $`), (_, attrs) => `<table ${attrs}><tr>`)
            .replace(re(r`^ ! ([^]+?) (?= \n^[!|] )`), (_, content) => `<th>${content}</th>`)
            .replace(re(r`^ \|\+ (.*?) $`), (_, content) => `<caption>${content}</caption>`)
            .replace(re(r`^ \|[^-+}] ([^]*?) (?= \n^[!|] )`), (_, content) => `<td>${content}</td>`)
            .replace(re(r`^ \|- (.*?) $`), (_, attrs) => `</tr><tr ${attrs}>`)
            .replace(re(r`^ \|\}`), '</tr></table>')

            // References: <ref></ref>, <references/>
            .replace(re(r`<ref> (.+?) </ref>`), (_, text) => {
                refs.push(text);
                refCount++;
                return `<sup><a id="cite-${refCount}" class="ref" href="#ref-${refCount}">[${refCount}]</a></sup>`;
            })
            .replace(re(r`<references \s* /?>`), '<ol>' + refs.map((ref, i) =>
                `<li id="ref-${+i + 1}"> <a href="#cite-${+i + 1}">↑</a> ${ref} </li>`).join('\n') + '</ol>'
            )

            // Nonstandard: ``code`` and ```code blocks```
            .replace(re(r` \`\`\` ([^\`]+?) \`\`\` `), '<pre class="code-block">$1</pre>')
            .replace(re(r` <pre> ([^\`]+?) </pre> `), '<pre class="code-block">$1</pre>')

            // Spacing
            .replace(/(\r?\n){2}/g, '\n</p><p>\n')

            // Restore nowiki contents
            .replace(/%NOWIKI#(\d+)%/g, (_, n) => htmlEscape(nowikis[n]));
    }
    metadata.buildTime = new Date();

    let result = {};
    result.html = outText;
    result.metadata = metadata;
    return result;
}
