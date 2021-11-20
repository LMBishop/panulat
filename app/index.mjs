'use strict';

import { SERVER_PORT } from './constants.mjs';
import * as directory from './directory.mjs';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

directory.rebuild();

app.use(express.static(__dirname + '/static'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/:page?', (req, res) => {
    let path = req.params.page ?? 'index';
    let page = directory.pageFor(path);

    if (!page) {
        error(res, 404);
        return;
    }

    res.render('page.ejs', {
        navbar: directory.getNavbar(path),
        path: path,
        content: page.html,
        title: page.displayTitle,
        buildTime: page.buildTime.toString()
    });
});

app.get('/special/purge/:page?', (req, res) => {
    let path = req.params.page ?? 'index';
    let page = directory.rawDataFor(path);

    if (!page) {
        error(res, 404);
        return;
    }

    res.render('purge.ejs', {
        navbar: directory.getNavbar(),
        page: path,
        buildTime: page.buildTime?.toString() ?? 'never',
        buildTimeRelative: Math.round((Date.now() - page.buildTime?.getTime()) / 1000 / 60)
    });
});

app.get('/special/purge/:page/confirm', (req, res) => {
    let path = req.params.page;
    let page = directory.rawDataFor(path);

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
        navbar: directory.getNavbar()
    });
});

app.get('/special/rebuild/confirm', (req, res) => {
    if (directory.rebuild()[0]) {
        res.status(200).send();
    } else {
        res.status(429).send();
    }
});

app.listen(SERVER_PORT, () => {
    console.log(`App listening on ${SERVER_PORT}`);
});

function error(res, code) {
    res.render('error.ejs', {
        code: code,
        navbar: directory.getNavbar()
    });
}
