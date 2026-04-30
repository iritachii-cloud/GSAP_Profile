import { state } from './state.js';
import { clearDanceFanny } from './fanny-dance.js';
import { stopArenaLights } from './fanny-dance.js';    // not exported originally, but safe
import { stopDanceMusic } from './music.js';
import { clearAllTempEffects } from './fanny-utils.js';

export function resetPose(dur = 0.35, fullReset = false) {
    if (!state.kitty) return;

    // Kill any active animation timeline
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    // Remove all temporary groups (spin vortex, cables, etc.) and hearts/particles
    clearAllTempEffects();

    stopDanceMusic();
    // Stop arena lights if they exist (safe call)
    if (typeof stopArenaLights === 'function') stopArenaLights();
    clearDanceFanny();
    if (state.mainDanceTL) { state.mainDanceTL.kill(); state.mainDanceTL = null; }

    gsap.killTweensOf(state.kitty.position);
    gsap.killTweensOf(state.kitty.rotation);
    gsap.killTweensOf(state.kitty.scale);

    gsap.to(state.kitty.position, { x: 0, y: state.kitty.userData.baseY ?? 0, z: 0, duration: dur, ease: 'power2.out' });
    gsap.to(state.kitty.scale,    { x: 1, y: 1, z: 1, duration: dur, ease: 'power2.out' });

    const targetRotY = fullReset ? 0 : state.kitty.rotation.y;
    gsap.to(state.kitty.rotation, { x: 0, z: 0, y: targetRotY, duration: dur, ease: 'power2.out' });
    state.currentAnim = null;
}