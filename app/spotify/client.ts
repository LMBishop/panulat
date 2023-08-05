import axios from 'axios';
import { logger } from '../logger.js';
import { WebSocket } from 'ws';

export namespace SpotifyClient {
    let clients = new Set<WebSocket>();
    let interval: NodeJS.Timeout;
    
    let acceptingClients = false;
    let authenticationFailed = false;
    
    let accessToken: string;
    let refreshToken: string;

    export const addClient = (client: WebSocket) => {
        if (acceptingClients) {
            clients.add(client);
        } else {
            client.close();
        }
    }
    
    const apiTokenUrl = 'https://accounts.spotify.com/api/token';
    
    const spotifyClientHeaders = {    
        'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
    }
    
    const handleApiError = (err: any, verb: string) => {
        if (err.response?.data?.error) {
            logger.error(`Failed to ${verb} access token: ${err.message}: ${err.response.data.error}`);
        } else {
            logger.error(`Failed to get access token: ${err.message} (${err.response.status} ${err.response.statusText} ${err.response.data.error})`);
        }
        accessToken = undefined;
        refreshToken = undefined;
    }
    
    export const requestAccessToken = async () => {
        logger.info('Requesting access token from Spotify');
        await axios.post(apiTokenUrl, {
                grant_type: 'authorization_code',
                code: process.env.SPOTIFY_AUTH_CODE,
                redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        }, 
        { headers: spotifyClientHeaders,
        }).then(res => {
            logger.info('Authenticated with Spotify');
            accessToken = res.data.access_token;
        }).catch(err => {
            handleApiError(err, 'request');
        });
    }
    
    export const refreshAccessToken = async () => {
        logger.info('Refreshing access token from Spotify');
        await axios.post(apiTokenUrl, {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
        },
        { headers: spotifyClientHeaders,
        }).then(res => {
            logger.info('Refreshed access token from Spotify');
            accessToken = res.data.access_token;
        }).catch(err => {
            handleApiError(err, 'refresh');
        });
    }
                

    export const initialise = async () => {
        if (!accessToken) {
            await requestAccessToken();
            if (!accessToken) {
                logger.error('Failed to get access token, giving up permanently');
                authenticationFailed = true;
                return;
            }
        }
        await updateTimeout();
        acceptingClients = true;
    }
    
    const updateTimeout = async () => {
        await update();
        interval = setTimeout(updateTimeout, 5000);
    }
    
    export const update = async () => {
        if (authenticationFailed) {
            return;
        }
        clients.forEach(client => {
            if (client.readyState !== WebSocket.OPEN) {
                clients.delete(client);
            }
        });
        if (clients.size === 0) {
            return;
        } 
        await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': 'Bearer ' + accessToken,
            }
        }).then(async (res) => {
            if (res.status === 401) {
                logger.info('Access token expired, refreshing');
                await refreshAccessToken();
                if (!accessToken) {
                    authenticationFailed = true;
                    logger.error('Failed to get access token, giving up permanently');
                    stop();
                    return;
                }
                await update();
                return;
            }
            if (res.status !== 200) {
                logger.error(`Failed to get current song: ${res.status} ${res.statusText}`);
                return;
            }
            try {
                let song = res.data.item.name;
                let duration = res.data.item.duration_ms;
                let artist = res.data.item.artists[0].name;
                let time = res.data.progress_ms;
                let album = res.data.item.album.name;
                let albumImage = res.data.item.album.images[0].url;
                clients.forEach(client => {
                    client.send(JSON.stringify({
                        song: song,
                        artist: artist,
                        time: time,
                        duration: duration,
                        album: album,
                        albumImage: albumImage,
                    }));
                });
            } catch (err) {
                logger.error(`Failed to parse and send current song: ${err.message}`);
            }
        }).catch(err => {
            if (err.response?.data?.error?.message) {
                logger.error(`Failed to get current song: ${err.message}: ${err.response.data.error.message}`);
            } else {
                logger.error(`Failed to get current song: ${err.message} (${err.response.status} ${err.response.statusText} ${err.response.data.error})`);
            }
        });
    }
    
    export const stop = () => {
        clearInterval(interval);
        acceptingClients = false;
        clients.forEach(client => client.close());
    }
    
}
