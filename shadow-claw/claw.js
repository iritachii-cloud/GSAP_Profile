import { state } from './state.js';
import { spawnThreeClawMark, spawnDarkSparks } from './utils.js';
import { playClawSFX } from './music.js';
import { resetPose } from './reset.js';

// Small card-shake helper
function cardShake(dx, dy = 0) {
    if (!state.cardEl) return;
    gsap.to(state.cardEl, {
        x: dx, y: dy, duration: 0.04, yoyo: true, repeat: 3, ease: 'none',
        onComplete: () => gsap.set(state.cardEl, { x: 0, y: 0 })
    });
}

export function clawAttack(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    state.currentAnim = 'claw';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    // Snapshot resting position so every repeat starts from the same base
    const base = {
        x: state.claw.position.x,
        y: state.claw.userData.baseY ?? state.claw.position.y,
        z: state.claw.position.z
    };

    function buildCombo(tl, offset) {
        // ─────────────────────────────────────────────
        // WIND-UP: pull left & lean back, squish for anticipation
        // ─────────────────────────────────────────────
        tl.to(state.claw.position, { x: base.x - 0.20, y: base.y + 0.06, duration: 0.13, ease: 'power2.out' }, offset)
          .to(state.claw.rotation, { z:  0.30, x: -0.10, duration: 0.13, ease: 'power2.out' }, offset)
          .to(state.claw.scale,    { x: 0.88, y: 1.10, z: 0.88, duration: 0.13 }, offset);

        // ─────────────────────────────────────────────
        // SLASH 1: diagonal right (upper-left → lower-right)
        // ─────────────────────────────────────────────
        const s1 = offset + 0.13;
        tl.to(state.claw.position, { x: base.x + 0.26, y: base.y - 0.06, duration: 0.075, ease: 'power4.out' }, s1)
          .to(state.claw.rotation, { z: -0.40, x:  0.20, duration: 0.075, ease: 'power4.out' }, s1)
          .to(state.claw.scale,    { x: 1.18, y: 0.88, z: 1.0, duration: 0.06 }, s1)
          .call(() => {
              playClawSFX();
              spawnThreeClawMark(state.claw.position, 1);
              spawnDarkSparks(state.claw.position, 16);
              cardShake(5, -2);
          }, null, s1 + 0.065);

        const r1 = s1 + 0.10;
        tl.to(state.claw.position, { x: base.x, y: base.y, duration: 0.10, ease: 'power2.inOut' }, r1)
          .to(state.claw.rotation, { z: 0, x: 0, duration: 0.10 }, r1)
          .to(state.claw.scale,    { x: 1, y: 1, z: 1, duration: 0.10 }, r1);

        // ─────────────────────────────────────────────
        // SLASH 2: diagonal left (upper-right → lower-left)
        // ─────────────────────────────────────────────
        const s2 = r1 + 0.08;
        tl.to(state.claw.position, { x: base.x - 0.26, y: base.y - 0.06, duration: 0.075, ease: 'power4.out' }, s2)
          .to(state.claw.rotation, { z:  0.40, x:  0.20, duration: 0.075, ease: 'power4.out' }, s2)
          .to(state.claw.scale,    { x: 1.18, y: 0.88, z: 1.0, duration: 0.06 }, s2)
          .call(() => {
              playClawSFX();
              spawnThreeClawMark(state.claw.position, -1);
              spawnDarkSparks(state.claw.position, 16);
              cardShake(-5, -2);
          }, null, s2 + 0.065);

        const r2 = s2 + 0.10;
        tl.to(state.claw.position, { x: base.x, y: base.y, duration: 0.10, ease: 'power2.inOut' }, r2)
          .to(state.claw.rotation, { z: 0, x: 0, duration: 0.10 }, r2)
          .to(state.claw.scale,    { x: 1, y: 1, z: 1, duration: 0.10 }, r2);

        // ─────────────────────────────────────────────
        // SLASH 3: overhead power slam straight down
        // ─────────────────────────────────────────────
        const raise = r2 + 0.06;
        tl.to(state.claw.position, { y: base.y + 0.22, duration: 0.10, ease: 'power2.out' }, raise)
          .to(state.claw.rotation, { x: -0.32, z: 0, duration: 0.10, ease: 'power2.out' }, raise)
          .to(state.claw.scale,    { x: 1.25, y: 1.25, z: 1.0, duration: 0.10 }, raise);

        const s3 = raise + 0.10;
        tl.to(state.claw.position, { y: base.y - 0.10, duration: 0.08, ease: 'power4.in' }, s3)
          .to(state.claw.rotation, { x:  0.35, duration: 0.08, ease: 'power4.in' }, s3)
          .to(state.claw.scale,    { x: 0.85, y: 1.38, z: 1.0, duration: 0.06 }, s3 + 0.02)
          .call(() => {
              playClawSFX();
              spawnThreeClawMark(state.claw.position,  1);
              spawnThreeClawMark(state.claw.position, -1);
              spawnDarkSparks(state.claw.position, 28);
              if (state.cardEl) {
                  gsap.to(state.cardEl, {
                      scale: 0.93, y: 7, duration: 0.07,
                      onComplete: () => gsap.to(state.cardEl, { scale: 1, y: 0, duration: 0.40, ease: 'elastic.out(1, 0.3)' })
                  });
              }
          }, null, s3 + 0.07);

        const settle = s3 + 0.10;
        tl.to(state.claw.position, { x: base.x, y: base.y, z: base.z, duration: 0.22, ease: 'power2.out' }, settle)
          .to(state.claw.rotation, { x: 0, z: 0, duration: 0.22, ease: 'power2.out' }, settle)
          .to(state.claw.scale,    { x: 1, y: 1, z: 1, duration: 0.28, ease: 'elastic.out(1, 0.4)' }, settle)
          .to({}, { duration: 0.12 });
    }

    const repeatCount = loop ? -1 : sequences - 1;
    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
        },
        onComplete: () => {
            if (!loop) resetPose(0.25);
            state.activeTimeline = null;
        }
    });
    state.activeTimeline = tl;
    buildCombo(tl, 0);
}