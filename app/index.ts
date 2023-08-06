import express from 'express';
import dotenv from 'dotenv-defaults';
import * as page from './routes/page/router.js';
import * as blog from './routes/blog/router.js';
import { logger } from './logger.js'
import { PageDirectory } from './pages.js';

dotenv.config()

const app = express();
app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.static('static', {
    etag: true,
    maxAge: '1d'
}));

app.use(blog.router);
app.use(page.router);

app.use((req, res) => {
    res.render('error.ejs', {
        code: '404',
    });
});

const server = app.listen(process.env.PORT, () => {
    logger.info(`App listening on port ${process.env.PORT}`);
});

const exit = () => {
    logger.info('Stopping server...');
    server.close(() => {
        process.exit(0);
    })
}

PageDirectory.rebuild('pages');

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
