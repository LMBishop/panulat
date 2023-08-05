import express from 'express';
import { page } from '../../middlewares/index.js';
import { blogs } from '../../middlewares/blogs.js';

export const router = express.Router({ mergeParams: true });

router.use('/blog/:page?', page);
router.use('/blog/:page?', blogs);

router.get('/blog/:page?', (req, res, next) => {
    let page = res.locals.page;
    let index = !page || res.locals.path === 'blog';

    res.render('blog.ejs', {
        index: index,
        blogs: res.locals.blogs,
        page: page,
    });
});
