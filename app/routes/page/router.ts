import express, { Router } from 'express';
import { navbar, page } from '../../middlewares/index.js';

export const router = express.Router({ mergeParams: true });

router.use('/:page.wiki', page);
router.use('/:page?', page);

router.get('/:page.wiki', (req, res, next) => {
    let page = res.locals.page;

    if (!page) {
        next();
        return;
    }

    res.type('text/plain');
    res.send(page.raw).end();
});

router.get('/:page?', navbar, (req, res, next) => {
    let page = res.locals.page;

    if (!page) {
        next();
        return;
    } 

    res.render('page.ejs', {
        navbar: res.locals.navbarHtml,
        path: res.locals.path,
        content: page.html,
        title: page.metadata.displayTitle,
        buildTime: new Date(page.buildTime)
    });
});
