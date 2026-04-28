import { state } from './state.js';
import { createDarkEnergyMesh, spawnDarkImpactSplash } from './utils.js';
import { playJumpSFX } from './music.js';

export function jumpClaw(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    playJumpSFX();
    state.currentAnim = 'jump';
    state.currentSequence = 0;
    const base = state.claw.userData.baseY ?? 0;
    const repeatCount = loop ? -1 : sequences - 1;
    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            const disp = document.getElementById('seqDisplay');
            if (disp) disp.textContent = state.currentSequence;
            spawnDarkImpactSplash(state.claw.position, 8);
            playJumpSFX();
        },
        onComplete: () => {
            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });
    state.activeTimeline = tl;
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';
    tl.to(state.claw.scale, { y: 0.75, duration: 0.12, ease: 'power2.in' })
      .to(state.claw.position, { y: base + 0.95, duration: 0.28, ease: 'power2.out' })
      .to(state.claw.scale, { y: 1.18, duration: 0.14 }, '-=0.15')
      .to(state.claw.position, { y: base, duration: 0.28, ease: 'bounce.out' })
      .to(state.claw.scale, { y: 0.85, duration: 0.08 }, '-=0.1')
      .to(state.claw.scale, { y: 1, duration: 0.18 })
      .call(() => spawnDarkImpactSplash(state.claw.position, 9), null, 0.38)
      .to(state.cardEl, {
          scale: 0.92,
          duration: 0.08,
          ease: 'power2.in',
          onComplete: () => gsap.to(state.cardEl, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' })
      }, 0.4);
}