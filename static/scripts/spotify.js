const connectWebsocket = () => {
    document.getElementById('connection-status').innerHTML = "Connecting...";
    let url = new URL(window.location.href);
    url.protocol = url.protocol.replace('http', 'ws');
    const socket = new WebSocket(url);
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
    }
}

document.addEventListener("DOMContentLoaded", connectWebsocket);
