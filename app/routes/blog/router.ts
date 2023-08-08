import express from 'express';

export const router = express.Router({ mergeParams: true });

router.get('/blog/:page?', (req, res, next) => {
    let page = res.locals.page;
    let index = !page || res.locals.path === 'blog';

    res.render('blog.ejs', {
        index: index,
        blogs: res.locals.blogs,
        page: page,
    });
});
