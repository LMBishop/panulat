import express from 'express';
import { navbar, page } from '../../middlewares/index.js';

export const router = express.Router({ mergeParams: true });

router.use('/:page.wiki', page);
router.use('/:page?', page);

router.get('/:page.wiki', (req, res, next) => {
    const page = res.locals.page;

    if (!page) {
        next();
        return;
    }

    res.type('text/plain');
    res.send(page.raw).end();
});

router.get('/:page?', navbar, (req, res, next) => {
    const page = res.locals.page;

    if (!page) {
        next();
        return;
    } 

    let html: string;
    let title: string;

    if (page.metadata.errors.length != 0) {
        html = '<div class="box-red">This page could not be built due to the following errors:<br><ul>'
        page.metadata.errors.forEach(e => {
            html += `<li>${e.identifier}: ${e.message}</li>`
        });
        html += '</ul>Go <a href="/">home</a>?</div>'
        title = 'Page error'
    } else {
        html = page.html;
        title = page.metadata.displayTitle;
    }

    res.render('page.ejs', {
        navbar: res.locals.navbarHtml,
        path: res.locals.path,
        content: html,
        title: title,
        buildTime: new Date(page.buildTime)
    });
});
