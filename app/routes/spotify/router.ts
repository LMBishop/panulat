import express from 'express';

export const router = express.Router({ mergeParams: true });

router.get('/spotify/auth', (req, res, next) => {
    let scope = 'user-read-currently-playing';
    let params = new URLSearchParams(); 
    params.append('response_type', 'code');
    params.append('client_id', process.env.SPOTIFY_CLIENT_ID);
    params.append('scope', scope);
    params.append('redirect_uri', process.env.SPOTIFY_REDIRECT_URI);
  
    res.redirect('https://accounts.spotify.com/authorize?' + params.toString());
});

router.get('/spotify/auth/callback', (req, res, next) => {
    if (req.query.error) {
        res.send('Error: ' + req.query.error);
        return;
    }
    if (!req.query.code) {
        res.send('No code');
        return;
    }
    res.send('Your authentication code: ' + req.query.code);
});
