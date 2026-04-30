import { state } from './state.js';
import { clearAllEffects, groundCharacter } from './utils.js';
import { stopAICleanup } from './aiMode.js';    // changed from dance.js

export function resetPose(dur = 0.35, fullReset = false) {
    if (!state.claw) return;
    stopAICleanup();

    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    clearAllEffects();
    if (state.mainDanceTL) {
        state.mainDanceTL.kill();
        state.mainDanceTL = null;
    }

    gsap.killTweensOf(state.claw.position);
    gsap.killTweensOf(state.claw.rotation);
    gsap.killTweensOf(state.claw.scale);

    const baseY = state.claw.userData.baseY ?? 0;
    const tl = gsap.timeline();
    tl.to(state.claw.position, { x:0, y: baseY, z:0, duration:dur, ease:'power2.out' }, 0);
    tl.to(state.claw.scale,    { x:1, y:1, z:1, duration:dur, ease:'power2.out' }, 0);
    const targetRotY = fullReset ? 0 : state.claw.rotation.y;
    tl.to(state.claw.rotation, { x:0, z:0, y: targetRotY, duration:dur, ease:'power2.out' }, 0);
    tl.call(() => groundCharacter(), null, dur);

    state.currentAnim = null;
    return tl;
}