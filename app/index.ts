import express from 'express';
import dotenv from 'dotenv-defaults';
import * as page from './routes/page/router.js';
import * as blog from './routes/blog/router.js';
import { logger } from './logger.js'
import { PageDirectory } from './pages.js';
// import { SpotifyClient } from './spotify/client.js';
// import { WebSocketServer } from 'ws';
// import * as spotifyauth from './routes/spotify/router.js';
// import * as spotifyWs from './websocket/spotify.js';

// TODO: Figure out Spotify's tedious auth flow

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
// app.use(spotifyauth.router);

app.use((req, res) => {
    res.render('error.ejs', {
        code: '404',
    });
});

const server = app.listen(process.env.PORT, () => {
    logger.info(`App listening on port ${process.env.PORT}`);
});
// const websocketServer: WebSocketServer = spotifyWs.createWebsocketServer(server);

const exit = () => {
    logger.info('Stopping server...');
    // websocketServer.clients.forEach(client => {
    //     client.terminate();
    // });
    // websocketServer.close();
    server.close(() => {
        process.exit(0);
    })
}

PageDirectory.rebuild('pages');

// SpotifyClient.initialise();

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
