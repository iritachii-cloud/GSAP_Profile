import { state } from './state.js';
import { spawnHeartsFromKitty } from './utils.js';
import { resetPose } from './reset.js';
import { playAttackSFX } from './music.js';

export function attackKitty(loop = false, sequences = 1) {
    // Kill any ongoing animation
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playAttackSFX();
    state.currentAnim = 'attack';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    // For loop: infinite repeats; for non-loop: sequences - 1 repeats
    const repeatCount = loop ? -1 : sequences - 1;

    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playAttackSFX();                 // SFX on each repeat
            spawnHeartsFromKitty(8, 0.6, 1.2);
        },
        onComplete: () => {
            if (!loop) resetPose(0.25);
            state.activeTimeline = null;
        }
    });

    state.activeTimeline = tl;

    // Inner tweens have FIXED repeats (they define one attack cycle)
    tl.to(state.kitty.position, { x: 0.10, duration: 0.05, ease: 'none', repeat: 10, yoyo: true })
      .to(state.kitty.scale,    { x: 1.18, y: 1.18, duration: 0.12, ease: 'power1.out', repeat: 3, yoyo: true }, 0)
      .to(state.kitty.rotation, { z: -0.14, duration: 0.07, repeat: 5, yoyo: true, ease: 'none' }, 0)
      .call(() => spawnHeartsFromKitty(8, 0.6, 1.2), null, 0.1);
}