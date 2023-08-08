import express from 'express';

export const router = express.Router({ mergeParams: true });

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
