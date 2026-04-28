import { state } from './state.js';
import { clearDanceClones } from './dance.js';
import { stopStorm } from './storm.js';
import { stopDanceMusic } from './music.js';
import { clearAllDarkEffects } from './utils.js';

export function resetPose(dur = 0.35, fullReset = false) {
    if (!state.claw) return;
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    clearAllDarkEffects();
    stopStorm();
    stopDanceMusic();
    clearDanceClones();
    if (state.mainDanceTL) { state.mainDanceTL.kill(); state.mainDanceTL = null; }
    gsap.killTweensOf(state.claw.position);
    gsap.killTweensOf(state.claw.rotation);
    gsap.killTweensOf(state.claw.scale);
    gsap.to(state.claw.position, { x:0, y: state.claw.userData.baseY ?? 0, z:0, duration:dur, ease:'power2.out' });
    gsap.to(state.claw.scale, { x:1, y:1, z:1, duration:dur, ease:'power2.out' });
    const targetRotY = fullReset ? 0 : state.claw.rotation.y;
    gsap.to(state.claw.rotation, { x:0, z:0, y: targetRotY, duration:dur, ease:'power2.out' });
    state.currentAnim = null;
}