document.getElementById('radio-ui').style.display = "none";

let playerInVehicle = false;
let ytPlayer = null;
let lastVideoID = null;
let lastVolume = 50;
let lastTime = 0;
let resumed = false;

// Select sliders
const volumeSlider = document.getElementById('volumeSlider');
const timeline = document.getElementById('timeline');

// Song info
const songInfo = document.getElementById('song-info');
const songThumbnail = document.getElementById('song-thumbnail');
const songTitle = document.getElementById('song-title');

// Extract YouTube ID
function extractVideoID(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : url;
}

// Slider neon fill
function updateSliderBackground(slider) {
    const value = slider.value;
    const max = slider.max || 100;
    slider.style.background = `linear-gradient(90deg, #48bfbf 0%, #48bfbf ${value}%, #333 ${value}%, #333 100%)`;
}

// Timeline updater
function startTimelineUpdate() {
    if (!ytPlayer) return;
    const duration = ytPlayer.getDuration() || 0;
    const interval = setInterval(() => {
        if (!ytPlayer || !playerInVehicle) {
            clearInterval(interval);
            return;
        }
        const currentTime = ytPlayer.getCurrentTime() || 0;
        const progress = duration ? (currentTime / duration) * 100 : 0;
        timeline.value = progress;
        updateSliderBackground(timeline);
    }, 500);
}

// Play video
function playVideo(videoID, volume = 50, startTime = 0) {
    lastVideoID = videoID;
    lastVolume = volume;

    if (ytPlayer) {
        ytPlayer.loadVideoById({ videoId: videoID, startSeconds: startTime });
        ytPlayer.setVolume(volume);
        ytPlayer.playVideo();
        startTimelineUpdate();
        return;
    }

    const existing = document.getElementById('ytplayer-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'ytplayer-container';
    container.style.display = 'none';
    document.body.appendChild(container);

    ytPlayer = new YT.Player('ytplayer-container', {
        videoId: videoID,
        playerVars: { autoplay: 1, controls: 0, loop: 1, playlist: videoID, start: startTime },
        events: {
            onReady: (event) => {
                event.target.setVolume(volume);
                event.target.seekTo(startTime, true);
                event.target.playVideo();
                startTimelineUpdate();
            }
        }
    });
}

// Stop video
function stopVideo() {
    if (ytPlayer) {
        try { lastTime = ytPlayer.getCurrentTime() || 0; } catch {}
        ytPlayer.stopVideo();
        ytPlayer.destroy();
        ytPlayer = null;
    }
    const container = document.getElementById('ytplayer-container');
    if (container) container.remove();
    songInfo.style.display = "none";
}

// Fetch song info
function setSongInfo(videoID) {
    const oEmbedURL = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoID}&format=json`;
    fetch(oEmbedURL)
        .then(res => res.json())
        .then(data => {
            songThumbnail.src = data.thumbnail_url;
            songTitle.textContent = data.title;
            songInfo.style.display = "flex";
        })
        .catch(() => { songInfo.style.display = "none"; });
}

// NUI messages
window.addEventListener('message', (event) => {
    const data = event.data;

    if (data.action === "updateVehicleState") {
        const wasInVehicle = playerInVehicle;
        playerInVehicle = data.inVehicle;

        if (!playerInVehicle && wasInVehicle) { stopVideo(); resumed = false; }
        if (playerInVehicle && !wasInVehicle && lastVideoID && !resumed) {
            playVideo(lastVideoID, lastVolume, lastTime);
            setSongInfo(lastVideoID);
            resumed = true;
        }
    }

    if (data.action === "playVideo") { if (playerInVehicle) playVideo(data.videoID, data.volume); setSongInfo(data.videoID); }
    if (data.action === "stopVideo") stopVideo();
    if (data.action === "open") { document.getElementById('radio-ui').style.display = "block"; SetNuiFocus(true, true); }
    if (data.action === "close") { document.getElementById('radio-ui').style.display = "none"; SetNuiFocus(false, false); }
    if (data.action === "setVolume") { lastVolume = data.volume; if (ytPlayer) ytPlayer.setVolume(data.volume); }
});

// Play button
document.getElementById('playBtn').onclick = () => {
    const input = document.getElementById('youtubeLink').value.trim();
    if (!input) return;
    const videoID = extractVideoID(input);

    setSongInfo(videoID);

    fetch(`https://${GetParentResourceName()}/playVideo`, {
        method: 'POST',
        body: JSON.stringify({ videoID, volume: volumeSlider.value })
    });

    if (playerInVehicle) playVideo(videoID, volumeSlider.value);
};

// Stop button
document.getElementById('stopBtn').onclick = () => {
    fetch(`https://${GetParentResourceName()}/stopVideo`, { method: 'POST', body: JSON.stringify({}) });
    stopVideo();
    lastVideoID = null;
    lastTime = 0;
    resumed = false;
};

// Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        document.getElementById('radio-ui').style.display = "none";
        fetch(`https://${GetParentResourceName()}/releaseFocus`, { method: 'POST', body: JSON.stringify({}) });
        SetNuiFocus(false, false);
    }
});

// Volume slider
volumeSlider.addEventListener('input', (e) => {
    fetch(`https://${GetParentResourceName()}/setVolume`, { method: 'POST', body: JSON.stringify({ volume: e.target.value }) });
    lastVolume = e.target.value;
    if (ytPlayer) ytPlayer.setVolume(e.target.value);
    updateSliderBackground(e.target);
});

// Timeline slider
timeline.addEventListener('input', (e) => updateSliderBackground(e.target));
timeline.addEventListener('change', (e) => {
    if (ytPlayer) {
        const duration = ytPlayer.getDuration() || 0;
        const newTime = (e.target.value / 100) * duration;
        ytPlayer.seekTo(newTime, true);
        lastTime = newTime;
    }
});

// Initialize fills
updateSliderBackground(volumeSlider);
updateSliderBackground(timeline);
