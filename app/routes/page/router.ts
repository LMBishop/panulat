import express from 'express';
import { page } from '../../middlewares/index.js';

export const router = express.Router({ mergeParams: true });

router.use('/:page?', page);

router.get('/:page?', (req, res, next) => {
    let page = res.locals.page;
    if (!page) {
        next();
        return;
    }
    
    res.render('index.ejs', {
        content: page.html,
        stylesheets: page.metadata.stylesheets,
        scripts: page.metadata.scripts,
    });
});
