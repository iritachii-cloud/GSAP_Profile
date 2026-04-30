import { state } from './state.js';
import { spawnSlashEffects, spawnSparks } from './fanny-utils.js';
import { resetPose } from './reset.js';
import { playAttackSFX } from './music.js';

// ── Screen-edge flash on hit ──────────────────────────────────────
function flashHit() {
    const el = document.createElement('div');
    Object.assign(el.style, {
        position:  'fixed',
        inset:     '0',
        zIndex:    '9999',
        background:'radial-gradient(ellipse at center, rgba(0,212,255,0.0) 40%, rgba(0,212,255,0.45) 100%)',
        pointerEvents: 'none',
        opacity:   '1',
        transition:'opacity 0.25s ease'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    });
}

// ── One Cut Throat cycle ──────────────────────────────────────────
//  Phase 1 : cable-lock (lean forward, brief pause)
//  Phase 2 : aerial dash  (lunge toward target with tilt)
//  Phase 3 : slash impact (fast spin + slash burst + screen flash)
//  Phase 4 : recover      (pull back to neutral)
function buildCutThroatCycle(tl) {
    const k    = state.kitty;
    const base = k.userData.baseY ?? 0;

    // ── Phase 1: Wind-up / cable-lock pose ──
    tl
      .to(k.position, { z:  0.12, duration: 0.12, ease: 'power2.out' })
      .to(k.rotation, { x: -0.18, z: 0.12, duration: 0.12, ease: 'power2.out' }, '<')
      .to(k.scale,    { x: 0.9, y: 1.1, duration: 0.10, ease: 'power2.out' }, '<')

    // ── Phase 2: Aerial dash ──
      .to(k.position, { z: -0.45, y: base + 0.35, duration: 0.10, ease: 'power4.out' })
      .to(k.rotation, { x: 0.22, z: -0.15, duration: 0.10, ease: 'power4.out' }, '<')
      .to(k.scale,    { x: 1.18, y: 0.88, duration: 0.10, ease: 'power4.out' }, '<')

    // ── Phase 3: Slash impact ──
      .to(k.rotation, { z: 0.40, duration: 0.06, ease: 'power3.in' })
      .to(k.rotation, { z: -0.40, duration: 0.07, ease: 'power3.out' })
      .call(() => {
          spawnSlashEffects(10, 0.1, 2.0);
          spawnSparks(k, 16);
          flashHit();
      })
      .to(k.position, { x:  0.08, duration: 0.03, repeat: 5, yoyo: true, ease: 'none' })
      .to(k.scale,    { x: 1.25, y: 1.25, duration: 0.07, ease: 'power2.out' }, '<')

    // ── Phase 4: Recover ──
      .to(k.position, { z: 0, x: 0, y: base, duration: 0.22, ease: 'power3.inOut' })
      .to(k.rotation, { x: 0, z: 0, duration: 0.22, ease: 'power3.inOut' }, '<')
      .to(k.scale,    { x: 1, y: 1, duration: 0.20, ease: 'elastic.out(1, 0.4)' }, '<0.05');

    return tl;
}

// ── Public export ─────────────────────────────────────────────────
export function attackFanny(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playAttackSFX();
    state.currentAnim  = 'attack';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const repeatCount = loop ? -1 : sequences - 1;

    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playAttackSFX();
        },
        onComplete: () => {
            if (!loop) resetPose(0.25);
            state.activeTimeline = null;
        }
    });

    buildCutThroatCycle(tl);
    state.activeTimeline = tl;
}
