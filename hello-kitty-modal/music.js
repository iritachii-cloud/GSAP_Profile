// music.js – Audio manager for Hello Kitty 3D

let danceMusic = null;

export function startDanceMusic() {
    if (danceMusic) return;   // already playing
    try {
        danceMusic = new Audio('theme.mp3');
        danceMusic.loop = true;
        danceMusic.volume = 0.5;
        danceMusic.play().catch(e => console.warn('Dance music play failed:', e));
    } catch (e) {
        console.warn('Failed to create dance music:', e);
    }
}

export function stopDanceMusic() {
    if (danceMusic) {
        danceMusic.pause();
        danceMusic.currentTime = 0;
        danceMusic.loop = false;
        danceMusic = null;
    }
}

function playSFX(file) {
    try {
        const audio = new Audio(file);
        audio.volume = 0.7;
        audio.play().catch(e => console.warn(`SFX ${file} play failed:`, e));
    } catch (e) {
        console.warn(`Failed to create SFX ${file}:`, e);
    }
}

export function playJumpSFX() {
    playSFX('jump.mp3');
}

export function playSpinSFX() {
    playSFX('spin.mp3');
}

export function playAttackSFX() {
    playSFX('attack.mp3');
}