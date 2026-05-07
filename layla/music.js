// Audio handles for Layla project – theme music and simple sound effects
let danceMusic = null;

/**
 * Creates and returns an Audio object for the theme music.
 * Used by AI mode to play looping background music.
 */
export function createDanceAudio() {
    const audio = new Audio('sounds/theme.mp3');
    audio.volume = 0.45;
    audio.loop = true;  // theme loops continuously
    return audio;
}

/**
 * Gets the duration of an audio file (in seconds) to schedule ending animations.
 */
export function getAudioDuration(audio) {
    return new Promise((resolve) => {
        if (audio.duration && isFinite(audio.duration)) {
            resolve(audio.duration);
        } else {
            audio.addEventListener('loadedmetadata', () => {
                resolve(audio.duration);
            });
            // Fallback if metadata never loads
            setTimeout(() => resolve(30), 3000);
        }
    });
}

// Simple SFX players
function playSFX(file) {
    try {
        const audio = new Audio(`sounds/${file}`);
        audio.volume = 0.65;
        audio.play().catch(e => console.warn(`SFX ${file} blocked`));
    } catch (e) {}
}

export function playJumpSFX()   { playSFX('jump.mp3'); }
export function playSpinSFX()   { playSFX('spin.mp3'); }
export function playAttackSFX() { playSFX('blast.mp3'); }  // renamed from attack.mp3 to blast.mp3 for Layla

// Legacy compatibility (if needed)
export function startDanceMusic() { /* not used directly – use createDanceAudio instead */ }
export function stopDanceMusic() {
    if (danceMusic) {
        danceMusic.pause();
        danceMusic.currentTime = 0;
        danceMusic = null;
    }
}