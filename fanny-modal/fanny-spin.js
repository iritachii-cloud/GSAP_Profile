import * as THREE from 'three';
import { state } from './state.js';
import { createCableRing, spawnSlashEffects, spawnSparks } from './fanny-utils.js';
import { playSpinSFX } from './music.js';

// ── One Pinate cycle (cable swing) ───────────────────────────────
//  Rise → cables fire out → rapid multi-rotation → cables retract → land
function buildPinateCycle(tl, cableRing) {
    const k     = state.kitty;
    const base  = k.userData.baseY ?? 0;
    const { group, cables } = cableRing;

    // ── 1. Rise off the ground (cable launches) ──
    tl.to(k.position, { y: base + 0.55, duration: 0.18, ease: 'power3.out' })
      .to(k.scale,    { x: 0.92, y: 1.10, duration: 0.14, ease: 'power2.out' }, '<')
      .to(k.rotation, { z: 0.18, duration: 0.14, ease: 'power2.out' }, '<');

    // ── 2. Cables extend outward ──
    cables.forEach(({ sprite, angle }, i) => {
        tl.to(sprite.material, { opacity: 0.95, duration: 0.12, ease: 'power2.out' }, 0.12 + i * 0.01)
          .to(sprite.position,  {
              x: Math.cos(angle) * 2.0,
              z: Math.sin(angle) * 2.0,
              duration: 0.30,
              ease: 'power3.out'
          }, 0.14 + i * 0.01)
          .to(sprite.scale, { x: 0.1, y: 2.2, duration: 0.28, ease: 'power2.out' }, 0.15);
    });

    // ── 3. Rapid rotation (3 × 2π) ──
    tl.to(k.rotation, { y: '+=18.8496', duration: 0.78, ease: 'power2.inOut' }, 0.20)
      .to(group.rotation, { y: '+=18.8496', duration: 0.78, ease: 'power2.inOut' }, 0.20)
      .to(k.scale, { x: 1.15, y: 1.15, duration: 0.20, ease: 'power1.out' }, 0.22);

    // ── 4. Slash burst at peak ──
    tl.call(() => {
        spawnSlashEffects(8, 0.4, 2.2);
        spawnSparks(k, 12);
    }, null, 0.60);

    // ── 5. Cables retract ──
    cables.forEach(({ sprite, angle }, i) => {
        tl.to(sprite.position, {
            x: Math.cos(angle) * 0.7,
            z: Math.sin(angle) * 0.7,
            duration: 0.22,
            ease: 'power3.in'
        }, 0.78 + i * 0.005)
          .to(sprite.scale,    { x: 0.06, y: 1.4, duration: 0.22, ease: 'power3.in' }, 0.78)
          .to(sprite.material, { opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.82);
    });

    // ── 6. Land ──
    tl.to(k.position, { y: base, duration: 0.22, ease: 'bounce.out' }, 0.80)
      .to(k.scale,    { x: 1.08, y: 0.88, duration: 0.10, ease: 'power2.in' }, 0.80)
      .to(k.scale,    { x: 1, y: 1, duration: 0.22, ease: 'elastic.out(1, 0.4)' }, 0.90)
      .to(k.rotation, { z: 0, duration: 0.20, ease: 'power2.out' }, 0.84);

    return tl;
}

// ── Public export ─────────────────────────────────────────────────
export function spinFanny(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playSpinSFX();
    state.currentAnim    = 'spin';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const cableRing   = createCableRing(10, 0.7);
    const repeatCount = loop ? -1 : sequences - 1;

    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playSpinSFX();
        },
        onComplete: () => {
            // Fade all cables out cleanly
            cableRing.cables.forEach(({ sprite }) => {
                gsap.to(sprite.material, {
                    opacity: 0, duration: 0.3,
                    onComplete: () => {
                        sprite.material.dispose();
                        sprite.material.map?.dispose();
                    }
                });
            });
            gsap.delayedCall(0.35, () => {
                state.scene.remove(cableRing.group);
                const idx = state.tempGroups.indexOf(cableRing.group);
                if (idx > -1) state.tempGroups.splice(idx, 1);
            });
            state.currentAnim    = null;
            state.activeTimeline = null;
        }
    });

    buildPinateCycle(tl, cableRing);
    state.activeTimeline = tl;
}
