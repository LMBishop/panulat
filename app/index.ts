import { PageDirectory } from './directory.js';
import express from 'express';
import dotenv from 'dotenv';
import * as page from './routes/page/router.js';
import * as special from './routes/special/router.js';
import { navbar } from './middlewares/index.js'

dotenv.config()

const app = express();
const directory = new PageDirectory(process.env.PAGES_DIR);

directory.rebuild();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.static('static'));

app.use((req, res, next) => {
    res.locals.directory = directory;
    next();
});

app.use(page.router);
app.use(special.router);

app.use(navbar, (req, res) => {
    res.render('error.ejs', {
        code: '404',
        navbar: res.locals.navbarHtml
    });
});

const server = app.listen(process.env.PORT, () => {
    console.log(`App listening on port ${process.env.PORT}`);
});

const exit = () => {
    console.info('Stopping server...');
    server.close(() => {
        process.exit(0);
    })
}

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
