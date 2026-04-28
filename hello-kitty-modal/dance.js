import * as THREE from 'three';
import { state } from './state.js';
import {
    createHeartMesh,
    spawnLandingHearts,
    spawnHeartsAroundTarget,
    createSpinVortex
} from './utils.js';
import { startDisco, stopDisco } from './disco.js';
import { startDanceMusic, stopDanceMusic } from './music.js';

// ── Clone action helpers (all exactly 1.5 seconds) ────
function playCloneJump(clone) {
    const baseY = clone.userData.baseY ?? 0;
    const baseScale = clone.userData.baseScale ?? 0.5;
    const tl = gsap.timeline();
    tl.to(clone.scale, { y: baseScale * 0.65, duration: 0.12, ease: 'power2.in' })
      .to(clone.position, { y: baseY + 0.7, duration: 0.25, ease: 'power2.out' })
      .to(clone.scale,    { y: baseScale * 1.2, duration: 0.14 }, '-=0.15')
      .to(clone.position, { y: baseY, duration: 0.28, ease: 'bounce.out' })
      .to(clone.scale,    { y: baseScale * 0.8, duration: 0.08 }, '-=0.1')
      .to(clone.scale,    { y: baseScale, duration: 0.18 })
      .call(() => spawnLandingHearts(clone, 5), null, 0.35)
      .to({}, { duration: 0.45 });   // pad to 1.5s
    state.cloneTweens.push(tl);
    return tl;
}

function playCloneSpin(clone) {
    const tl = gsap.timeline();
    tl.to(clone.rotation, { y: '+=6.2832', duration: 1.5, ease: 'power2.inOut' });
    const vortex = createSpinVortex(clone);
    vortex.scale.setScalar(0.6);
    tl.eventCallback('onComplete', () => {
        if (vortex.parent) state.scene.remove(vortex);
    });
    state.cloneTweens.push(tl);
    return tl;
}

function playCloneAttack(clone) {
    const tl = gsap.timeline();
    tl.to(clone.position, { x: clone.position.x + 0.05, duration: 0.05, repeat: 7, yoyo: true, ease: 'none' }, 0)
      .to(clone.rotation, { z: -0.1, duration: 0.05, repeat: 7, yoyo: true, ease: 'none' }, 0)
      .to(clone.scale, { x: clone.userData.baseScale * 1.15, y: clone.userData.baseScale * 1.15, duration: 0.1, repeat: 3, yoyo: true, ease: 'power1.out' }, 0)
      .call(() => spawnHeartsAroundTarget(clone, 5, { radiusMin: 0.2, radiusMax: 0.6, scaleStart: 0.1, scaleEnd: 0.22 }), null, 0.1)
      .to({}, { duration: 0.7 });   // padding to 1.5s
    state.cloneTweens.push(tl);
    return tl;
}

// ── Shared round action (same for all clones) ────
function getRoundAction() {
    if (!state.nextCloneAction) {
        const actions = ['jump', 'spin', 'attack'];
        state.nextCloneAction = actions[Math.floor(Math.random() * actions.length)];
        state.nextCloneActionReaders = 1;
    } else {
        state.nextCloneActionReaders++;
    }
    const action = state.nextCloneAction;
    if (state.nextCloneActionReaders >= 4) {
        // Round completed – increment sequence counter
        state.currentSequence++;
        // Update the UI
        const disp = document.getElementById('seqDisplay');
        if (disp) disp.textContent = state.currentSequence;

        // Check if target reached (non-loop mode)
        if (state.danceSequencesTarget > 0 && state.currentSequence >= state.danceSequencesTarget) {
            // Stop after this round; we'll prevent further actions inside performActionThenMove
        }

        state.nextCloneAction = null;
        state.nextCloneActionReaders = 0;
    }
    return action;
}

// ── Main performer: arrive → face centre → action → face next → move ─
function performActionThenMove(clone, currentIdx, actionType) {
    const positions = [
        new THREE.Vector3( 2.12, 0,  2.12),
        new THREE.Vector3(-2.12, 0,  2.12),
        new THREE.Vector3(-2.12, 0, -2.12),
        new THREE.Vector3( 2.12, 0, -2.12),
    ];

    // 1. Face the centre (main kitty)
    const centre = state.kitty.position.clone();
    const toCentre = new THREE.Vector3().subVectors(centre, clone.position);
    const centreAngle = Math.atan2(toCentre.x, toCentre.z);
    const rotToCentre = gsap.to(clone.rotation, { y: centreAngle, duration: 0.3, ease: 'power2.out' });
    state.cloneTweens.push(rotToCentre);

    rotToCentre.eventCallback('onComplete', () => {
        // 2. Perform the current action
        let actionTL;
        switch (actionType) {
            case 'jump':   actionTL = playCloneJump(clone); break;
            case 'spin':   actionTL = playCloneSpin(clone); break;
            case 'attack': actionTL = playCloneAttack(clone); break;
            default:       actionTL = playCloneJump(clone);
        }

        actionTL.eventCallback('onComplete', () => {
            // If we have reached the target sequences, stop the dance completely
            if (state.danceSequencesTarget > 0 && state.currentSequence >= state.danceSequencesTarget) {
                stopDisco();
                clearDanceClones();
                if (state.mainDanceTL) state.mainDanceTL.kill();
                state.currentAnim = null;
                state.activeTimeline = null;
                return;
            }

            // 3. Determine next action for the NEXT station (shared)
            const nextAction = getRoundAction();  // increments counter at the right time
            const nextIdx = (currentIdx + 1) % 4;
            const targetPos = positions[nextIdx].clone();

            // 4. Rotate to face the next station
            const direction = new THREE.Vector3().subVectors(targetPos, clone.position);
            const targetAngle = Math.atan2(direction.x, direction.z);
            let curAngle = clone.rotation.y % (Math.PI * 2);
            let delta = targetAngle - curAngle;
            if (delta > Math.PI) delta -= Math.PI * 2;
            if (delta < -Math.PI) delta += Math.PI * 2;
            const finalAngle = curAngle + delta;

            const rotToDest = gsap.to(clone.rotation, { y: finalAngle, duration: 0.3, ease: 'power2.out' });
            state.cloneTweens.push(rotToDest);

            rotToDest.eventCallback('onComplete', () => {
                // 5. Move to the next station (3s with arc + walking bob)
                const startY = clone.position.y;
                gsap.killTweensOf(clone.position);
                const moveTL = gsap.to(clone.position, {
                    x: targetPos.x,
                    z: targetPos.z,
                    y: startY,
                    duration: 3,
                    ease: 'none',
                    onUpdate: () => {
                        const progress = moveTL.progress();
                        const arc = Math.sin(progress * Math.PI) * 0.5;
                        const walkBob = Math.sin(progress * Math.PI * 6) * 0.06;
                        clone.position.y = startY + arc + walkBob;
                    },
                    onComplete: () => {
                        clone.position.y = startY;
                        performActionThenMove(clone, nextIdx, nextAction);
                    }
                });
                state.cloneTweens.push(moveTL);
            });
        });
    });
}

// ── Clone management ───────────────────────────
export function clearDanceClones() {
    state.cloneTweens.forEach(t => t.kill());
    state.cloneTweens = [];
    if (state.cloneGroup) {
        state.scene.remove(state.cloneGroup);
        state.cloneGroup.traverse(c => {
            if (c.material) {
                if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                else c.material.dispose();
            }
            if (c.geometry) c.geometry.dispose();
        });
        state.cloneGroup = null;
    }
    state.danceClones = [];
    state.nextCloneAction = null;
    state.nextCloneActionReaders = 0;
    state.danceSequencesTarget = 0;
}

export function spawnDanceClones() {
    if (!state.kitty) return;
    clearDanceClones();
    state.cloneGroup = new THREE.Group();
    state.cloneGroup.position.copy(state.kitty.position);
    state.scene.add(state.cloneGroup);

    const positions = [
        new THREE.Vector3( 2.12, 0,  2.12),
        new THREE.Vector3(-2.12, 0,  2.12),
        new THREE.Vector3(-2.12, 0, -2.12),
        new THREE.Vector3( 2.12, 0, -2.12),
    ];

    // First round action – all clones share this
    const firstAction = getRoundAction();
    for (let i = 0; i < 4; i++) {
        const clone = state.kitty.clone(true);
        clone.position.copy(positions[i]);
        clone.scale.setScalar(0.5);
        clone.rotation.set(0, 0, 0);
        clone.userData.baseY = state.kitty.userData.baseY;
        clone.userData.baseScale = 0.5;
        clone.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
        state.cloneGroup.add(clone);
        state.danceClones.push({ mesh: clone, index: i });
        performActionThenMove(clone, i, firstAction);
    }
}

export function danceKitty(loop = false, sequences = 1) {
    // Kill any previous animation
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    // Stop any other music / disco from previous dance
    stopDanceMusic();
    stopDisco();
    // Clear clones from previous dance if any
    clearDanceClones();

    state.currentAnim = 'dance';
    startDanceMusic();
    startDisco();

    // Sequence handling: loop = infinite, otherwise run exactly `sequences` rounds
    state.danceSequencesTarget = loop ? 0 : sequences;
    state.currentSequence = 0;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '0';

    spawnDanceClones();

    if (state.mainDanceTL) state.mainDanceTL.kill();
    const base = state.kitty.userData.baseY ?? 0;
    state.mainDanceTL = gsap.timeline({ repeat: -1, yoyo: true });
    state.mainDanceTL
        .to(state.kitty.rotation, { z: 0.1, duration: 0.5, ease: 'sine.inOut' }, 0)
        .to(state.kitty.position, { y: base + 0.2, duration: 0.35, ease: 'power1.out' }, 0)
        .to(state.kitty.position, { y: base, duration: 0.35, ease: 'power1.in' }, 0.35)
        .to(state.kitty.rotation, { z: -0.1, duration: 0.5, ease: 'sine.inOut' }, 0.6);

    // We'll treat mainDanceTL as the active timeline for dance
    state.activeTimeline = state.mainDanceTL;
}