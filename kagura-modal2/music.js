let danceMusic = null;

export function startDanceMusic() {
    // This is no longer used by dance.js, kept for compatibility
    if (danceMusic) return;
    try {
        danceMusic = new Audio('theme.mp3');
        danceMusic.loop = true;
        danceMusic.volume = 0.45;
        danceMusic.play().catch(e => console.warn('Dance music blocked:', e));
    } catch (e) {}
}

export function stopDanceMusic() {
    if (danceMusic) {
        danceMusic.pause();
        danceMusic.currentTime = 0;
        danceMusic = null;
    }
}

// New helpers for dance.js
export function createDanceAudio() {
    const audio = new Audio('theme.mp3');
    audio.volume = 0.45;
    return audio;
}

export function getAudioDuration(audio) {
    return new Promise((resolve) => {
        if (audio.duration && isFinite(audio.duration)) {
            resolve(audio.duration);
        } else {
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            // fallback if metadata never loads
            setTimeout(() => resolve(30), 3000);
        }
    });
}

function playSFX(file) {
    try {
        const audio = new Audio(file);
        audio.volume = 0.65;
        audio.play().catch(e => console.warn(`SFX ${file} blocked`));
    } catch(e) {}
}

export function playJumpSFX() { playSFX('jump.mp3'); }
export function playSpinSFX() { playSFX('spin.mp3'); }
export function playAttackSFX() { playSFX('attack.mp3'); }