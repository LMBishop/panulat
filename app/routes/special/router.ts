import express from 'express';
import { navbar, page } from '../../middlewares/index.js';
import { logger } from './../../logger.js'

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

    logger.info(`Purge for page ${page.standardName} requested by ${req.headers['x-forwarded-for'] || req.socket.remoteAddress }`)
    if (res.locals.directory.purge(res.locals.path)) {
        res.status(200).send();
    } else {
        res.status(429).send();
    }
});

router.use('/special/info/:page?', page);

router.get('/special/info/:page?', navbar, (req, res, next) => {
    const page = res.locals.page;

    if (!page) {
        next();
        return;
    }

    res.render('pageinfo.ejs', {
        navbar: res.locals.navbarHtml,
        standardName: page.standardName,
        displayTitle: page.metadata.displayTitle,
        buildTime: page.buildTime,
        primary: page.metadata.includeInNavbar,
        showTitle: page.metadata.showTitle,
        sortOrder: page.metadata.sortOrder,
        dependencies: page.metadata.dependencies,
        dependents: page.metadata.dependents,
        errors: page.metadata.errors,
    });
});

router.get('/special/rebuild', navbar, (req, res) => {
    res.render('rebuild.ejs', {
        navbar: res.locals.navbarHtml
    });
});

router.get('/special/rebuild/confirm', (req, res) => {
    logger.info(`Directory rebuild requested by ${req.headers['x-forwarded-for'] || req.socket.remoteAddress }`)
    if (res.locals.directory.rebuild()) {
        res.status(200).send();
    } else {
        res.status(429).send();
    }
});
