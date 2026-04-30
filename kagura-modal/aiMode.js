import * as THREE from 'three';
import { state } from './state.js';
import { spawnPetalBurst, groundCharacter, createPetalSprite } from './utils.js';
import { playJumpSFX, playSpinSFX, playAttackSFX, createDanceAudio, getAudioDuration } from './music.js';
import { showSpeechBubble, hideSpeechBubble } from './speechBubble.js';

// ─── Obstacle check ────────────────────────────
function isBlocked(x, z) {
    for (const obs of state.obstacles) {
        if (obs.type === 'rect') {
            const d = obs.data;
            if (x >= d.xFrom && x <= d.xTo && z >= d.zFrom && z <= d.zTo) return true;
        } else if (obs.type === 'circle') {
            const d = obs.data;
            const dist = Math.sqrt((x - d.x) ** 2 + (z - d.z) ** 2);
            if (dist <= d.radius) return true;
        }
    }
    return false;
}

// ─── Pick a safe position ──────────────────────
function getRandomWalkablePosition() {
    const bounds = state.groundBounds;
    for (let attempt = 0; attempt < 50; attempt++) {
        const x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
        const z = bounds.zMin + Math.random() * (bounds.zMax - bounds.zMin);
        if (!isBlocked(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return state.claw
        ? new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z)
        : new THREE.Vector3(0, 0, 0);
}

// ─── Mini‑actions (each returns a Promise) ─────
// Each action guards against a null dancePhase (i.e. externally stopped) and
// resolves immediately in that case so the async loop can exit cleanly.

function miniJump() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playJumpSFX();
        const base = state.claw.userData.baseY ?? 0;
        const tl = gsap.timeline({ onComplete: resolve, onInterrupt: resolve });
        tl.to(state.claw.scale, { y: 0.8, duration: 0.08, ease: 'power2.in' })
          .to(state.claw.position, { y: base + 0.5, duration: 0.18, ease: 'power2.out' })
          .to(state.claw.scale, { y: 1.1, duration: 0.1 }, '-=0.1')
          .to(state.claw.position, { y: base, duration: 0.18, ease: 'bounce.out' })
          .to(state.claw.scale, { y: 1, duration: 0.12 });
    });
}

function miniSpin() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playSpinSFX();
        const tl = gsap.timeline({ onComplete: resolve, onInterrupt: resolve });
        tl.to(state.claw.rotation, { y: '+=6.2832', duration: 0.8, ease: 'power1.inOut' });
    });
}

function miniAttack() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playAttackSFX();
        const petalCount = 30;
        const petals = [];
        const group = new THREE.Group();
        group.position.copy(state.claw.position);
        state.scene.add(group);
        state.tempGroups.push(group);

        for (let i = 0; i < petalCount; i++) {
            const petal = createPetalSprite('#ff365e', 0.1 + Math.random() * 0.06);
            petal.position.set(
                (Math.random() - 0.5) * 1.2,
                Math.random() * 1,
                (Math.random() - 0.5) * 1.2
            );
            group.add(petal);
            petals.push(petal);
        }

        const cleanup = () => {
            group.traverse(p => { if (p.material) p.material.dispose(); });
            if (group.parent) state.scene.remove(group);
            const idx = state.tempGroups.indexOf(group);
            if (idx > -1) state.tempGroups.splice(idx, 1);
        };

        const tl = gsap.timeline({ onComplete: resolve, onInterrupt: () => { cleanup(); resolve(); } });
        tl.to(petals.map(p => p.position), {
                x: 0, y: 0.2, z: 0, duration: 0.3, ease: 'power2.in'
            }, 0)
          .to({}, { duration: 0.1 })
          .to(petals.map(p => p.position), {
                onStart: function() {
                    const camPos = state.camera.position.clone();
                    const charPos = group.position.clone();
                    const dir = camPos.sub(charPos).normalize();
                    petals.forEach(p => {
                        p.userData.throwTarget = charPos.clone().add(dir.clone().multiplyScalar(2.5 + Math.random() * 1.5));
                    });
                },
                x: (i) => petals[i].userData.throwTarget?.x ?? 0,
                y: (i) => (petals[i].userData.throwTarget?.y ?? 0) + Math.random() * 1.2,
                z: (i) => petals[i].userData.throwTarget?.z ?? 0,
                duration: 0.5,
                ease: 'power2.out'
            }, 0.4)
          .to(petals.map(p => p.material), { opacity: 0, duration: 0.3 }, 0.5)
          .call(cleanup);
    });
}

function danceWobble() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const tl = gsap.timeline({ onComplete: resolve, onInterrupt: resolve });
        const base = state.claw.userData.baseY ?? 0;
        tl.to(state.claw.rotation, { z: 0.1, duration: 0.25, yoyo: true, repeat: 2, ease: 'sine.inOut' }, 0)
          .to(state.claw.position, { y: base + 0.1, duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0)
          .to(state.claw.rotation, { y: '+=0.8', duration: 1.0, ease: 'none' }, 0);
    });
}

const actionPool = [miniJump, miniSpin, miniAttack, danceWobble];

// ─── Walk to target with wobble ────────────────
function walkToPoint(targetPos) {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const startPos = state.claw.position.clone();
        const dx = targetPos.x - startPos.x;
        const dz = targetPos.z - startPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const duration = Math.max(1.0, distance * 0.8);

        const rotY = Math.atan2(dx, dz);
        const rotStart = state.claw.rotation.y;
        let rotDiff = rotY - rotStart;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

        const tl = gsap.timeline({ onComplete: resolve, onInterrupt: resolve });
        tl.to(state.claw.rotation, { y: rotStart + rotDiff, duration: 0.3, ease: 'power2.out' }, 0);
        tl.to(state.claw.position, {
            x: targetPos.x, z: targetPos.z,
            duration: duration,
            ease: 'none',
            onStart: () => {
                if (!state.claw) return;
                gsap.to(state.claw.rotation, { z: 0.06, duration: 0.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
                gsap.to(state.claw.position, { y: (state.claw.userData.baseY ?? 0) + 0.05, duration: 0.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
            }
        }, 0.3);
        tl.call(() => {
            if (!state.claw) return;
            gsap.killTweensOf(state.claw.rotation, 'z');
            gsap.killTweensOf(state.claw.position, 'y');
            state.claw.rotation.z = 0;
            state.claw.position.y = state.claw.userData.baseY ?? 0;
        });
    });
}

// ─── Main AI loop ───────────────────────────────
// Continues during both 'active' AND 'ending' phases.
// Only exits when dancePhase is null (externally stopped).
async function aiLoop() {
    while (state.dancePhase !== null) {
        if (!state.claw) break;

        // During the ending phase just keep doing small wobble moves – no walking
        if (state.dancePhase === 'ending') {
            await danceWobble();
            continue;
        }

        // If stuck inside an obstacle, walk out first
        if (isBlocked(state.claw.position.x, state.claw.position.z)) {
            const safePoint = getRandomWalkablePosition();
            await walkToPoint(safePoint);
            continue;
        }

        const target = getRandomWalkablePosition();
        await walkToPoint(target);

        // Re-check after the walk (phase may have changed)
        if (!state.claw || state.dancePhase === null) break;

        if (isBlocked(state.claw.position.x, state.claw.position.z)) continue;

        // Random dance move
        const action = actionPool[Math.floor(Math.random() * actionPool.length)];
        await action();
    }
    hideSpeechBubble();
}

// ─── Internal stop ──────────────────────────────
function stopAIInternal() {
    if (state.dancePhase !== null) {
        state.dancePhase = null;   // signals the async loop to exit on its next iteration
        if (state.danceAudio) {
            state.danceAudio.pause();
            state.danceAudio = null;
        }
        if (state.danceEndTimer) {
            clearTimeout(state.danceEndTimer);
            state.danceEndTimer = null;
        }
        if (state.claw) {
            gsap.killTweensOf(state.claw.position);
            gsap.killTweensOf(state.claw.rotation);
            gsap.killTweensOf(state.claw.scale);
            groundCharacter();
        }
        state.currentAnim = null;
        state.activeTimeline = null;
        hideSpeechBubble();
    }
}

export function stopAICleanup() {
    stopAIInternal();
}

// ─── Main entry ─────────────────────────────────
export function aiModeClaw(loop = false, sequences = 1) {
    if (!state.claw) return;

    // Kill any prior animations
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    if (state.mainDanceTL) {
        state.mainDanceTL.kill();
        state.mainDanceTL = null;
    }

    // Stop any previous AI session without triggering a new loop
    if (state.dancePhase !== null) {
        state.dancePhase = null;
        if (state.danceAudio) { state.danceAudio.pause(); state.danceAudio = null; }
        if (state.danceEndTimer) { clearTimeout(state.danceEndTimer); state.danceEndTimer = null; }
        if (state.claw) {
            gsap.killTweensOf(state.claw.position);
            gsap.killTweensOf(state.claw.rotation);
            gsap.killTweensOf(state.claw.scale);
        }
        hideSpeechBubble();
    }

    state.currentAnim = 'ai';
    state.currentSequence = 0;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '0';

    const audio = createDanceAudio();
    state.danceAudio = audio;
    audio.play().catch(e => console.warn('AI mode music blocked:', e));

    showSpeechBubble();

    // Schedule the graceful ending ~10 s before song ends
    getAudioDuration(audio).then(duration => {
        if (state.dancePhase === null) return;   // already stopped before metadata arrived
        const endStart = Math.max(0, duration - 10);
        state.danceEndTimer = setTimeout(() => {
            if (!state.claw || state.dancePhase === null) return;
            // Switch to ending phase – the loop keeps running but only does wobbles
            state.dancePhase = 'ending';
            const base = state.claw.userData.baseY ?? 0;
            gsap.to(state.claw.position, { x: 0, y: base, z: 0, duration: 10, ease: 'power2.inOut' });
            gsap.to(state.claw.rotation, { y: '+=6.2832', duration: 10, ease: 'none' });
            setTimeout(() => {
                if (state.claw && state.dancePhase !== null) spawnPetalBurst(state.claw.position, 30);
            }, 9500);
        }, endStart * 1000);
    });

    // Song finished → clean up
    audio.addEventListener('ended', () => {
        stopAIInternal();
    });

    // Start the loop
    state.dancePhase = 'active';
    aiLoop();
}