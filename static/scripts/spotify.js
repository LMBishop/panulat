const connectedColor = '#2ECC40';
const connectingColor = '#FF851B';
const disconnectedColor = '#FF4136';

const websocketUrl = 'wss://wailt.leonardobishop.com/';

let progressMillis;
let durationMillis;

let predictProgressInterval;

const msToTime = (duration) => {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const setProgress = (progressMillis, durationMillis) => {
    const progressPercent = durationMillis == 0 ? 0 : Math.min((progressMillis / durationMillis) * 100, 100);

    const songProgress = document.getElementById('song-progress');
    const songDuration = document.getElementById('song-duration');
    const songProgressBarThumb = document.getElementById('song-progress-bar-thumb');
    
    const progressTime = msToTime(progressMillis);
    const durationTime = msToTime(durationMillis);

    songProgress.innerHTML = progressTime;
    songDuration.innerHTML = durationTime;
    songProgressBarThumb.style.width = `${progressPercent}%`;
}

const predictProgress = () => {
    progressMillis = Math.min(durationMillis, progressMillis + 1000);
    setProgress(progressMillis, durationMillis);
}

const setDefaultData = () => {
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    const songAlbum = document.getElementById('song-album');
    const songAlbumArt = document.getElementById('song-album-art');

    songTitle.innerHTML = 'No song playing';
    songArtist.innerHTML = '';
    songAlbum.innerHTML = '';
    songAlbumArt.src = '/images/blank-album-cover.png';

    setProgress(0, 0);
}

const setOpenInSpotify = (songUrl) => {
    const openInSpotify = document.getElementById('open-in-spotify');
    if (songUrl) {
        openInSpotify.href = songUrl;    
        openInSpotify.style.display = 'block';
    } else {
        openInSpotify.style.display = 'none';
    }
}

const connectWebsocket = () => {
    const connectionStatus = document.getElementById('connection-status-text');
    const connectionStatusIndicator = document.getElementById('connection-status-indicator');
    const onDisconnect = () => {
        connectionStatus.innerHTML = "Disconnected";
        connectionStatusIndicator.style.backgroundColor = disconnectedColor;
        setDefaultData();
        clearInterval(predictProgressInterval);
    }
    const onConnect = () => {
        connectionStatus.innerHTML = "Connected";
        connectionStatusIndicator.style.backgroundColor = connectedColor;
    }
    
    connectionStatus.innerHTML = "Connecting";
    connectionStatusIndicator.style.backgroundColor = connectingColor;
    
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    const songAlbum = document.getElementById('song-album');
    const songAlbumArt = document.getElementById('song-album-art');
    
    const updateData = (data) => {
        clearInterval(predictProgressInterval);
        progressMillis = data.progress;
        durationMillis = data.duration;
        
        songTitle.innerHTML = data.title;
        songArtist.innerHTML = data.artist;
        songAlbum.innerHTML = data.album;
        songAlbumArt.src = data.albumArt || '/images/blank-album-cover.png';
        
        setProgress(progressMillis, durationMillis);
        setOpenInSpotify(data.url);
        
        if (data.state === 'playing') {
            predictProgressInterval = setInterval(predictProgress, 1000);
        }
    }

    const socket = new WebSocket(websocketUrl);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateData(data);
    }

    socket.addEventListener('open', onConnect);
    socket.addEventListener('close', onDisconnect);
    socket.addEventListener('error', onDisconnect);
}

document.addEventListener("DOMContentLoaded", setDefaultData);
document.addEventListener("DOMContentLoaded", connectWebsocket);
