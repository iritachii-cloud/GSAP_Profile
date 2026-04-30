import { state } from './state.js';
import { spawnSparks, createCableSprite } from './fanny-utils.js';
import { playJumpSFX } from './music.js';

// ── One Cable Dash cycle ─────────────────────────────────────────
//   Phase 1 : crouch hard (cable coils)
//   Phase 2 : explosive launch (fast, punchy)
//   Phase 3 : mid-air spin + cable trail + sparks
//   Phase 4 : fast land + ground impact squash → recover
//
// KEY FIXES:
//   • baseY is now 0 (grounded), not some floating value
//   • Crouch goes BELOW base to sell weight
//   • Airtime is shorter/snappier — no floaty hang time
//   • Landing squash is exaggerated for impact feel
//   • Recovery is elastic & quick
function buildCableDashCycle(tl) {
    const k    = state.kitty;
    const base = k.userData.baseY ?? 0;   // always 0 now

    // Create cable trail
    const cable = createCableSprite();
    cable.scale.set(0.05, 0.8, 1);
    cable.material.opacity = 0;
    state.scene.add(cable);
    state.tempGroups.push(cable);

    // ── Phase 1: Hard crouch (weight loading) ──
    // Compress below base — this sells the "power" before launch
    tl.to(k.scale,    { y: 0.68, x: 1.18, duration: 0.10, ease: 'power3.in' })
      .to(k.position,  { y: base - 0.08, duration: 0.10, ease: 'power3.in' }, '<')
      .to(k.rotation,  { z: 0.10, duration: 0.10, ease: 'power2.in' }, '<');

    // ── Phase 2: Explosive launch ──
    // Fast upward acceleration, no slow float — snappy!
    tl.to(k.position, { y: base + 1.05, duration: 0.18, ease: 'power4.out' })
      .to(k.scale,    { x: 0.88, y: 1.20, duration: 0.14, ease: 'power3.out' }, '<')
      .to(k.rotation, { z: -0.28, duration: 0.16, ease: 'power3.out' }, '<')
      .to(cable.material, { opacity: 0.9, duration: 0.10 }, '-=0.14');

    // Keep cable tracking the character during flight
    tl.to(cable.position, {
        x: k.position.x,
        y: base + 0.6,
        z: k.position.z,
        duration: 0.18
    }, '-=0.18');

    // ── Phase 3: Mid-air spin + sparks ──
    // One full rotation (not 2π×many) — clean, readable
    tl.to(k.rotation, { y: '+=6.2832', duration: 0.28, ease: 'power2.inOut' })
      .to(cable.scale, { x: 0.10, y: 1.8, duration: 0.22, ease: 'power2.out' }, '<');

    tl.call(() => spawnSparks(k, 18), null, '<0.14');

    // ── Phase 4: Fall — gravity pull down ──
    // Fast downward snap, not a slow drift
    tl.to(k.position, { y: base,        duration: 0.14, ease: 'power3.in' })
      .to(k.rotation, { z: 0,           duration: 0.14, ease: 'power2.out' }, '<')
      .to(cable.material, { opacity: 0, duration: 0.12, ease: 'power2.in' }, '<');

    // ── Phase 5: Landing impact squash ──
    // Big squash on contact → elastic recovery
    tl.to(k.scale,    { x: 1.35, y: 0.62, duration: 0.07, ease: 'power4.in' })
      .to(k.position, { y: base - 0.04, duration: 0.07, ease: 'power4.in' }, '<')
      .call(() => spawnSparks(k, 8));   // landing dust puff

    // Recovery bounce
    tl.to(k.scale,    { x: 1, y: 1, duration: 0.28, ease: 'elastic.out(1.2, 0.38)' })
      .to(k.position, { y: base,     duration: 0.20, ease: 'power2.out' }, '<');

    // Cleanup cable
    tl.call(() => {
        if (cable.parent) state.scene.remove(cable);
        cable.material.dispose();
        cable.material.map?.dispose();
        const idx = state.tempGroups.indexOf(cable);
        if (idx > -1) state.tempGroups.splice(idx, 1);
    });

    return tl;
}

// ── Public export ────────────────────────────────────────────────
export function jumpFanny(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playJumpSFX();
    state.currentAnim = 'jump';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const repeatCount = loop ? -1 : sequences - 1;

    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playJumpSFX();
            if (state.kitty) spawnSparks(state.kitty, 6);
        },
        onComplete: () => {
            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });

    buildCableDashCycle(tl);
    state.activeTimeline = tl;
}