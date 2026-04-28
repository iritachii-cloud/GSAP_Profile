let danceMusic = null;

export function startDanceMusic() {
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
function playSFX(file) {
    try {
        const audio = new Audio(file);
        audio.volume = 0.65;
        audio.play().catch(e => console.warn(`SFX ${file} blocked`));
    } catch(e) {}
}
export function playJumpSFX() { playSFX('../hello-kitty-modal/jump.mp3'); }
export function playSpinSFX() { playSFX('../hello-kitty-modal/spin.mp3'); }
export function playClawSFX() { playSFX('../hello-kitty-modal/attack.mp3'); }