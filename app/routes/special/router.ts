import express from 'express';
import { navbar, page } from '../../middlewares/index.js';

export const router = express.Router({ mergeParams: true });

router.use('/special/purge/:page?', page);
router.use('/special/purge/:page/confirm', page);

router.get('/special/purge/:page?', navbar, (req, res, next) => {
    const page = res.locals.page;

    if (!page) {
        next();
        return;
    }

    res.render('purge.ejs', {
        navbar: res.locals.navbarHtml,
        page: res.locals.path,
        buildTime: new Date(page.buildTime) ?? 'never',
        buildTimeRelative: Math.round((Date.now() - page.buildTime) / 1000 / 60)
    });
});

router.get('/special/purge/:page/confirm', (req, res, next) => {
    const page = res.locals.page;

    if (!page) {
        next();
        return;
    }

    if (res.locals.directory.purge(res.locals.path)) {
        res.status(200).send();
    } else {
        res.status(429).send();
    }
});

router.get('/special/rebuild', navbar, (req, res) => {
    res.render('rebuild.ejs', {
        navbar: res.locals.navbarHtml
    });
});

router.get('/special/rebuild/confirm', (req, res) => {
    if (res.locals.directory.rebuild()) {
        res.status(200).send();
    } else {
        res.status(429).send();
    }
});
