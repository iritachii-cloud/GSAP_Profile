import * as THREE from 'three';
import { state }   from './state.js';
import { createCableSprite, spawnSparks, spawnSlashEffects } from './fanny-utils.js';
import { startDanceMusic, stopDanceMusic } from './music.js';

// ── Arena lighting ────────────────────────────────────────────────
let arenaLights   = null;
let arenaTimeline = null;
let originalColours = null;

export function startArenaLights() {
    if (arenaTimeline) stopArenaLights();
    if (!originalColours) {
        originalColours = {
            ambient: state.lights.ambient?.color.getHex(),
            key:     state.lights.key?.color.getHex(),
            fill:    state.lights.fill?.color.getHex(),
            rim:     state.lights.rim?.color.getHex(),
            hemiSky: state.lights.hemi?.color?.getHex(),
            hemiGrd: state.lights.hemi?.groundColor?.getHex(),
        };
    }
    arenaLights = new THREE.Group();
    const l1 = new THREE.PointLight(0xc060ff, 24, 12);
    const l2 = new THREE.PointLight(0xe08020, 18, 10);
    const l3 = new THREE.PointLight(0xffa040,  8,  7);
    l1.position.set( 3, 3,  2);
    l2.position.set(-3, 2, -2);
    l3.position.set( 0, 5,  0);
    arenaLights.add(l1, l2, l3);
    state.scene.add(arenaLights);
    gsap.to(arenaLights.rotation, { y: Math.PI * 2, duration: 2.8, repeat: -1, ease: 'none' });
    arenaTimeline = gsap.timeline({ repeat: -1 });
    function addPulse() {
        const purple = new THREE.Color(0xc060ff);
        const deep   = new THREE.Color(0x0d0318);
        const bright = new THREE.Color(0xb040ff);
        const dur    = 0.22 + Math.random() * 0.18;
        if (state.lights.ambient) arenaTimeline.to(state.lights.ambient.color, { r: purple.r, g: purple.g, b: purple.b, duration: dur, ease: 'none' }, '>');
        if (state.lights.key)     arenaTimeline.to(state.lights.key.color,     { r: bright.r, g: bright.g, b: bright.b, duration: dur, ease: 'none' }, '<');
        if (state.lights.fill)    arenaTimeline.to(state.lights.fill.color,    { r: deep.r,   g: deep.g,   b: deep.b,   duration: dur, ease: 'none' }, '<');
        if (state.lights.rim)     arenaTimeline.to(state.lights.rim.color,     { r: purple.r, g: purple.g, b: purple.b, duration: dur, ease: 'none' }, '<');
        if (state.lights.hemi) {
            arenaTimeline.to(state.lights.hemi.color,       { r: bright.r, g: bright.g, b: bright.b, duration: dur, ease: 'none' }, '<');
            arenaTimeline.to(state.lights.hemi.groundColor, { r: deep.r,   g: deep.g,   b: deep.b,   duration: dur, ease: 'none' }, '<');
        }
    }
    addPulse();
    arenaTimeline.eventCallback('onRepeat', addPulse);
}

export function stopArenaLights() {
    if (arenaTimeline) { arenaTimeline.kill(); arenaTimeline = null; }
    if (arenaLights) {
        gsap.killTweensOf(arenaLights.rotation);
        arenaLights.traverse(c => { if (c.isLight) c.dispose?.(); });
        state.scene.remove(arenaLights);
        arenaLights = null;
    }
    if (!originalColours) return;
    if (state.lights.ambient) gsap.to(state.lights.ambient.color, { hex: originalColours.ambient, duration: 0.6 });
    if (state.lights.key)     gsap.to(state.lights.key.color,     { hex: originalColours.key,     duration: 0.6 });
    if (state.lights.fill)    gsap.to(state.lights.fill.color,    { hex: originalColours.fill,    duration: 0.6 });
    if (state.lights.rim)     gsap.to(state.lights.rim.color,     { hex: originalColours.rim,     duration: 0.6 });
    if (state.lights.hemi) {
        gsap.to(state.lights.hemi.color,       { hex: originalColours.hemiSky, duration: 0.6 });
        gsap.to(state.lights.hemi.groundColor, { hex: originalColours.hemiGrd, duration: 0.6 });
    }
}

// ── Stubs so reset.js imports don't break ────────────────────────
export function clearDanceFanny() {
    state.cloneTweens.forEach(t => t.kill());
    state.cloneTweens = [];
    if (state.cloneGroup) {
        state.scene.remove(state.cloneGroup);
        state.cloneGroup = null;
    }
    state.danceClones = [];
    state.nextCloneAction = null;
    state.nextCloneActionReaders = 0;
    state.danceSequencesTarget = 0;
}

// ── Pick a random destination on the floor ────────────────────────
function randomDashTarget(baseY) {
    const angle  = Math.random() * Math.PI * 2;
    const radius = 1.2 + Math.random() * 0.9;
    return { x: Math.cos(angle) * radius, y: baseY, z: Math.sin(angle) * radius };
}

// ── Cable dash: Fanny flies from current pos to dest through an arc ─
function cableDashTo(k, destX, baseY, destZ, dur) {
    const cable = createCableSprite();
    cable.scale.set(0.05, 0.6, 1);
    cable.material.opacity = 0;
    state.scene.add(cable);
    state.tempGroups.push(cable);

    // Face direction of travel
    const facingY = Math.atan2(destX - k.position.x, destZ - k.position.z);

    const tl = gsap.timeline();

    // Wind-up crouch
    tl.to(k.rotation, { y: facingY, duration: 0.10, ease: 'power2.out' })
      .to(k.scale,    { x: 1.15, y: 0.72, duration: 0.10, ease: 'power3.in' }, '<')
      .to(k.position, { y: baseY - 0.06, duration: 0.10, ease: 'power3.in' }, '<');

    // Aerial dash with arc
    tl.to(cable.material, { opacity: 0.9, duration: 0.08 })
      .to(k.position, {
            x: destX, z: destZ, y: baseY,
            duration: dur,
            ease: 'power3.out',
            onUpdate: function() {
                const p   = this.progress();
                const arc = Math.sin(p * Math.PI) * 0.85;
                k.position.y = baseY + arc;
                cable.position.set(k.position.x, k.position.y + 0.2, k.position.z);
                cable.material.opacity = Math.sin(p * Math.PI) * 0.85;
                k.rotation.x = -0.22 * Math.sin(p * Math.PI);
            }
        })
      .to(k.scale, { x: 0.88, y: 1.22, duration: dur * 0.55, ease: 'power2.out' }, '<');

    // Land impact
    tl.to(k.scale,    { x: 1.32, y: 0.60, duration: 0.08, ease: 'power4.in' })
      .to(k.position, { y: baseY - 0.04, duration: 0.08, ease: 'power4.in' }, '<')
      .to(k.rotation, { x: 0,            duration: 0.08 }, '<')
      .call(() => {
            spawnSparks(k, 10);
            state.scene.remove(cable);
            cable.material.dispose();
            cable.material.map?.dispose();
            const idx = state.tempGroups.indexOf(cable);
            if (idx > -1) state.tempGroups.splice(idx, 1);
        })
      .to(k.scale,    { x: 1, y: 1, duration: 0.26, ease: 'elastic.out(1.2,0.4)' })
      .to(k.position, { y: baseY, duration: 0.18, ease: 'power2.out' }, '<');

    return tl;
}

// ── Dance moves (performed at current position, scale-safe) ───────
const DANCE_MOVES = [
    // Spin slash burst
    (k, baseY) => {
        const tl = gsap.timeline();
        tl.to(k.rotation, { y: '+=6.2832', duration: 0.55, ease: 'power2.inOut' })
          .to(k.scale,    { x: 1.10, y: 1.10, duration: 0.18, ease: 'power2.out' }, 0.05)
          .call(() => { spawnSlashEffects(7, 0.3, 1.8); spawnSparks(k, 10); }, null, 0.28)
          .to(k.scale,    { x: 1,    y: 1,    duration: 0.22, ease: 'elastic.out(1,0.4)' }, 0.42)
          .to({}, { duration: 0.12 });
        return tl;
    },
    // Jump twirl
    (k, baseY) => {
        const tl = gsap.timeline();
        tl.to(k.scale,    { y: 0.72, x: 1.16, duration: 0.10, ease: 'power3.in' })
          .to(k.position, { y: baseY - 0.06, duration: 0.10 }, '<')
          .to(k.position, { y: baseY + 0.90, duration: 0.18, ease: 'power4.out' })
          .to(k.scale,    { x: 0.90, y: 1.18, duration: 0.14 }, '<')
          .to(k.rotation, { y: '+=6.2832', duration: 0.28, ease: 'power2.inOut' })
          .call(() => spawnSparks(k, 14))
          .to(k.position, { y: baseY, duration: 0.14, ease: 'power3.in' })
          .to(k.scale,    { x: 1.30, y: 0.62, duration: 0.08, ease: 'power4.in' }, '<')
          .to(k.scale,    { x: 1,    y: 1,    duration: 0.26, ease: 'elastic.out(1.2,0.4)' })
          .to(k.position, { y: baseY, duration: 0.18, ease: 'power2.out' }, '<');
        return tl;
    },
    // Slash combo left-right
    (k, baseY) => {
        const tl = gsap.timeline();
        tl.to(k.rotation, { z:  0.42, duration: 0.11, ease: 'power3.out' })
          .call(() => spawnSlashEffects(4, 0.2, 1.3))
          .to(k.rotation, { z: -0.42, duration: 0.13, ease: 'power3.inOut' })
          .call(() => spawnSlashEffects(4, 0.2, 1.3))
          .to(k.rotation, { z:  0.28, duration: 0.11, ease: 'power3.inOut' })
          .call(() => spawnSlashEffects(3, 0.2, 1.0))
          .to(k.rotation, { z:  0,    duration: 0.20, ease: 'elastic.out(1,0.5)' })
          .to(k.scale,    { x: 1.10, y: 0.92, duration: 0.10 }, 0.10)
          .to(k.scale,    { x: 1,    y: 1,    duration: 0.22, ease: 'elastic.out(1,0.4)' })
          .to({}, { duration: 0.12 });
        return tl;
    },
    // Cable whip hover
    (k, baseY) => {
        const cables = [];
        for (let i = 0; i < 3; i++) {
            const c = createCableSprite();
            const ang = (i / 3) * Math.PI * 2 + Math.random();
            c.position.set(
                k.position.x + Math.cos(ang) * 0.3,
                k.position.y + 0.5,
                k.position.z + Math.sin(ang) * 0.3
            );
            c.material.opacity = 0;
            c.scale.set(0.05, 0.7, 1);
            state.scene.add(c);
            state.tempGroups.push(c);
            cables.push({ sprite: c, ang });
        }
        const tl = gsap.timeline();
        tl.to(k.position, { y: baseY + 0.32, duration: 0.18, ease: 'power2.out' })
          .to(k.scale,    { x: 0.92, y: 1.10, duration: 0.15 }, '<');
        cables.forEach(({ sprite, ang }) => {
            tl.to(sprite.material, { opacity: 0.9, duration: 0.14 }, 0.10)
              .to(sprite.position, {
                    x: k.position.x + Math.cos(ang) * 1.6,
                    z: k.position.z + Math.sin(ang) * 1.6,
                    duration: 0.32, ease: 'power2.out'
                }, 0.12)
              .to(sprite.scale, { x: 0.09, y: 1.8, duration: 0.28 }, 0.12);
        });
        tl.to(k.rotation, { y: '+=6.2832', duration: 0.50, ease: 'power2.inOut' }, 0.15)
          .call(() => { spawnSparks(k, 10); spawnSlashEffects(5, 0.4, 1.8); }, null, 0.40);
        cables.forEach(({ sprite }) => {
            tl.to(sprite.material, { opacity: 0, duration: 0.22 }, 0.52)
              .call(() => {
                    state.scene.remove(sprite);
                    sprite.material.dispose();
                    sprite.material.map?.dispose();
                    const idx = state.tempGroups.indexOf(sprite);
                    if (idx > -1) state.tempGroups.splice(idx, 1);
                }, null, 0.78);
        });
        tl.to(k.position, { y: baseY, duration: 0.22, ease: 'bounce.out' }, 0.62)
          .to(k.scale,    { x: 1.26, y: 0.66, duration: 0.08, ease: 'power4.in' }, 0.62)
          .to(k.scale,    { x: 1,    y: 1,    duration: 0.26, ease: 'elastic.out(1.2,0.4)' }, 0.72)
          .to({}, { duration: 0.10 });
        return tl;
    },
];

// ── Dance loop state ──────────────────────────────────────────────
let _danceRunning   = false;
let _danceLoop      = false;
let _danceSeqTarget = 0;

function runDanceCycle(k, baseY) {
    if (!_danceRunning || !state.kitty) return;

    const dest    = randomDashTarget(baseY);
    const moveIdx = Math.floor(Math.random() * DANCE_MOVES.length);
    const disp    = document.getElementById('seqDisplay');

    // 1. Dash to random spot
    const dashOut = cableDashTo(k, dest.x, baseY, dest.z, 0.48);
    dashOut.eventCallback('onComplete', () => {
        if (!_danceRunning) return;

        // 2. Face center
        const centerFace = Math.atan2(-dest.x, -dest.z);
        const faceTL = gsap.to(k.rotation, { y: centerFace, duration: 0.16, ease: 'power2.out' });

        faceTL.eventCallback('onComplete', () => {
            if (!_danceRunning) return;

            // 3. Perform dance move at this spot
            const moveTL = DANCE_MOVES[moveIdx](k, baseY);

            moveTL.eventCallback('onComplete', () => {
                if (!_danceRunning) return;

                state.currentSequence++;
                if (disp) disp.textContent = state.currentSequence;

                // 4. Dash back to center
                const dashBack = cableDashTo(k, 0, baseY, 0, 0.42);
                dashBack.eventCallback('onComplete', () => {
                    if (!_danceRunning) return;

                    // Check stop condition
                    if (!_danceLoop && _danceSeqTarget > 0 && state.currentSequence >= _danceSeqTarget) {
                        gsap.to(k.rotation, { y: 0, duration: 0.20, ease: 'power2.out' });
                        stopArenaLights();
                        _danceRunning        = false;
                        state.currentAnim    = null;
                        state.activeTimeline = null;
                        return;
                    }

                    // Brief pause at center, then next cycle
                    gsap.to(k.rotation, {
                        y: k.rotation.y + (Math.random() - 0.5) * 0.8,
                        duration: 0.20,
                        ease: 'power2.out',
                        onComplete: () => {
                            if (_danceRunning) gsap.delayedCall(0.12, () => runDanceCycle(k, baseY));
                        }
                    });
                });
            });
        });
    });
}

// ── Public export ─────────────────────────────────────────────────
export function danceFanny(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        if (typeof state.activeTimeline.kill === 'function') state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    _danceRunning = false;   // stop any previous cycle first

    stopDanceMusic();
    stopArenaLights();
    clearDanceFanny();

    if (!state.kitty) return;

    const k     = state.kitty;
    const baseY = k.userData.baseY ?? 0;

    // CRITICAL: never touch kitty's scale here — only reset to exactly 1,1,1
    gsap.killTweensOf(k.scale);
    k.scale.set(1, 1, 1);

    state.currentAnim     = 'dance';
    state.currentSequence = 0;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '0';

    _danceRunning   = true;
    _danceLoop      = loop;
    _danceSeqTarget = sequences;

    startDanceMusic();
    startArenaLights();

    gsap.delayedCall(0.05, () => runDanceCycle(k, baseY));

    // Proxy object so reset.js can call .kill()
    state.activeTimeline = { kill: () => { _danceRunning = false; } };
}