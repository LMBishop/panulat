'use strict';

import { PageDirectory, Page, PageMetadata } from './directory.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config()

const app = express();
const directory = new PageDirectory(process.env.PAGES_DIR);

directory.rebuild();

function navbar(current: string = ''): string {
    let navbar = '';
    directory.primaryPages.forEach(page => {
        navbar += `<div class="navbar-element"><a href="/${page.standardName}"${current == page.standardName ? ' class="highlight"' : ''}>${page.metadata.displayTitle}</a></div>`;
    })
    return navbar
}

app.use(express.static('static'));
app.set('view engine', 'ejs');
app.set('views', 'views');

app.get('/:page.wiki', (req, res) => {
    let path = req.params.page;
    let raw = directory.getRaw(path);

    if (!raw) {
        error(res, 404);
        return;
    }

    res.type('text/plain');
    res.send(raw).end();
});

app.get('/:page?', (req, res) => {
    let path = req.params.page ?? 'index';
    let page = directory.get(path);

    if (!page) {
        error(res, 404);
        return;
    }

    res.render('page.ejs', {
        navbar: navbar(),
        path: path,
        content: page.html,
        title: page.metadata.displayTitle,
        buildTime: new Date(page.buildTime)
    });
});

app.get('/special/purge/:page?', (req, res) => {
    let path = req.params.page ?? 'index';
    let page = directory.get(path);

    if (!page) {
        error(res, 404);
        return;
    }

    res.render('purge.ejs', {
        navbar: navbar(),
        page: path,
        buildTime: new Date(page.buildTime) ?? 'never',
        buildTimeRelative: Math.round((Date.now() - page.buildTime) / 1000 / 60)
    });
});

app.get('/special/purge/:page/confirm', (req, res) => {
    let path = req.params.page;
    let page = directory.get(path);

    if (!page) {
        error(res, 404);
        return;
    }

    if (directory.purge(path)) {
        res.status(200).send();
    } else {
        res.status(429).send();
    }
});

app.get('/special/rebuild', (req, res) => {
    res.render('rebuild.ejs', {
        navbar: navbar()
    });
});

app.get('/special/rebuild/confirm', (req, res) => {
    if (directory.rebuild()) {
        res.status(200).send();
    } else {
        res.status(429).send();
    }
});

app.listen(process.env.PORT, () => {
    console.log(`App listening on ${process.env.PORT}`);
});

function error(res, code) {
    res.render('error.ejs', {
        code: code,
        navbar: navbar()
    });
}
