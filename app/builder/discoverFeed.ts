import path from "path";
import fs from "fs";
import { Feed, PageDirectory } from "./pageDirectory.js";
import { logger } from "../logger.js";

export async function discoverFeed(feed: Feed, pageDirectory: PageDirectory): Promise<boolean> {
    const entries = [];

    const titleConfigPath = feed.paramStrategy?.title?.from || "title";
    const updatedConfigPath = feed.paramStrategy?.date?.from || "date";
    const descriptionConfigPath = feed.paramStrategy?.description?.from || "description";
    //todo support actual discovery strategies 

    for (const page of pageDirectory.getPagesBeginningWith(feed.route)) {
        if (page.name === 'index') {
            continue;
        }
        const entry = {
            title: page.config[titleConfigPath] || page.name,
            updated: page.config[updatedConfigPath] || new Date(0),
            id: page.name,
            url: `${feed.url}/${page.name}`,
            description: page.config[descriptionConfigPath] || "",
            // description: page.html?.length > 100 ? `${page.html?.substring(0, 100)}...` || "" : page.html || "",
        };
        entries.push(entry);
    }

    feed.entries = entries;
    feed.entries.sort((a, b) => b.updated.getTime() - a.updated.getTime());
    feed.updated = new Date(0);
    for (const entry of feed.entries) {
        if (entry.updated > feed.updated) {
            feed.updated = entry.updated;
        }
    }

    const atomFeed = `<feed xmlns="http://www.w3.org/2005/Atom">
<title>${feed.title}</title>
<updated>${feed.updated.toISOString()}</updated>
<link rel="self" href="${feed.url}/atom.xml" type="application/atom+xml"/>
<link rel="alternate" href="${feed.url}" type="text/html"/>
${feed.entries
        .map((entry) => {
            return `<entry>
<title>${entry.title}</title>
<updated>${entry.updated.toISOString()}</updated>
<id>${entry.id}</id>
<link rel="alternate" href="${entry.url}" type="text/html"/>
<summary>${entry.description}</summary>
</entry>`;
        })
        .join("\n")}
</feed>`;

    try {
        const file = feed.buildPath;
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(file, atomFeed);
    } catch (e) {
        logger.error(`Failed to write feed ${feed.buildPath}: ${e.message}`);
        return false;
    }
}