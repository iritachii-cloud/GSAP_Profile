import * as THREE from 'three';
import { state } from './state.js';
import { spawnPetalBurst, groundCharacter, createPetalSprite } from './utils.js';
import { playJumpSFX, playSpinSFX, playAttackSFX, createDanceAudio, getAudioDuration } from './music.js';
import { showSpeechBubble, hideSpeechBubble } from './speechBubble.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  OBSTACLE CHECK  (also checks map boundaries)
// ═══════════════════════════════════════════════════════════════════════════════
function isBlocked(x, z) {
    const bounds = state.groundBounds;
    if (x < bounds.xMin || x > bounds.xMax || z < bounds.zMin || z > bounds.zMax) return true;

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

// ═══════════════════════════════════════════════════════════════════════════════
//  A* PATHFINDING  (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
const CELL   = 0.6;
const MARGIN = 0.28;

function worldToCell(v) {
    const bounds = state.groundBounds;
    return {
        cx: Math.round((v.x - bounds.xMin) / CELL),
        cy: Math.round((v.z - bounds.zMin) / CELL)
    };
}

function cellToWorld(cx, cy) {
    const bounds = state.groundBounds;
    return new THREE.Vector3(
        bounds.xMin + cx * CELL,
        0,
        bounds.zMin + cy * CELL
    );
}

function isCellBlocked(cx, cy) {
    const w = cellToWorld(cx, cy);
    const offsets = [
        [0, 0],
        [MARGIN, 0], [-MARGIN, 0],
        [0, MARGIN], [0, -MARGIN]
    ];
    for (const [dx, dz] of offsets) {
        if (isBlocked(w.x + dx, w.z + dz)) return true;
    }
    return false;
}

function heuristic(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

function aStar(start, goal) {
    const sc = worldToCell(start);
    const gc = worldToCell(goal);

    if (isCellBlocked(gc.cx, gc.cy)) {
        let bestDist = Infinity, bestCx = gc.cx, bestCy = gc.cy;
        for (let r = 1; r <= 6; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    const ncx = gc.cx + dx, ncy = gc.cy + dy;
                    if (!isCellBlocked(ncx, ncy)) {
                        const d = Math.abs(dx) + Math.abs(dy);
                        if (d < bestDist) { bestDist = d; bestCx = ncx; bestCy = ncy; }
                    }
                }
            }
            if (bestDist < Infinity) break;
        }
        gc.cx = bestCx; gc.cy = bestCy;
    }

    if (sc.cx === gc.cx && sc.cy === gc.cy) return [goal];

    const open   = new Map();
    const closed = new Set();
    const key    = (cx, cy) => `${cx},${cy}`;

    const startKey = key(sc.cx, sc.cy);
    open.set(startKey, { cx: sc.cx, cy: sc.cy, g: 0, f: heuristic(sc.cx, sc.cy, gc.cx, gc.cy), pk: null });

    const DIRS = [
        [1,0],[-1,0],[0,1],[0,-1],
        [1,1],[1,-1],[-1,1],[-1,-1]
    ];
    const COST = [1,1,1,1, 1.414,1.414,1.414,1.414];

    let found = null;

    outer:
    for (let iter = 0; iter < 8000; iter++) {
        let bestKey = null, bestF = Infinity;
        for (const [k, v] of open) {
            if (v.f < bestF) { bestF = v.f; bestKey = k; }
        }
        if (!bestKey) break;

        const cur = open.get(bestKey);
        open.delete(bestKey);
        closed.add(bestKey);

        if (cur.cx === gc.cx && cur.cy === gc.cy) { found = cur; break; }

        for (let d = 0; d < DIRS.length; d++) {
            const ncx = cur.cx + DIRS[d][0];
            const ncy = cur.cy + DIRS[d][1];
            const nk  = key(ncx, ncy);
            if (closed.has(nk)) continue;
            if (isCellBlocked(ncx, ncy)) { closed.add(nk); continue; }

            const ng = cur.g + COST[d];
            const existing = open.get(nk);
            if (!existing || ng < existing.g) {
                open.set(nk, {
                    cx: ncx, cy: ncy,
                    g: ng,
                    f: ng + heuristic(ncx, ncy, gc.cx, gc.cy),
                    pk: bestKey,
                    parent: cur
                });
            }
        }
    }

    if (!found) return null;

    const rawPath = [];
    let node = found;
    while (node) {
        rawPath.push(cellToWorld(node.cx, node.cy));
        node = node.parent;
    }
    rawPath.reverse();

    return stringPull(rawPath);
}

function stringPull(path) {
    if (path.length <= 2) return path;
    const result = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
        let j = path.length - 1;
        while (j > i + 1) {
            if (lineOfSight(path[i], path[j])) break;
            j--;
        }
        result.push(path[j]);
        i = j;
    }
    return result;
}

function lineOfSight(a, b) {
    const steps = Math.ceil(a.distanceTo(b) / (CELL * 0.5));
    for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        if (isBlocked(x, z)) return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PICK A RANDOM WALKABLE WORLD POSITION  (exported for hayabusa)
// ═══════════════════════════════════════════════════════════════════════════════
export function getRandomWalkablePosition() {
    const bounds = state.groundBounds;
    for (let attempt = 0; attempt < 80; attempt++) {
        const x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
        const z = bounds.zMin + Math.random() * (bounds.zMax - bounds.zMin);
        if (!isBlocked(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return state.claw
        ? new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z)
        : new THREE.Vector3(0, 0, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MINI-ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════
function miniJump() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playJumpSFX();
        const base = state.claw.userData.baseY ?? 0;
        const tl = gsap.timeline({ onComplete: resolve, onInterrupt: resolve });
        tl.to(state.claw.scale,    { y: 0.8,      duration: 0.08, ease: 'power2.in' })
          .to(state.claw.position, { y: base + 0.5, duration: 0.18, ease: 'power2.out' })
          .to(state.claw.scale,    { y: 1.1,      duration: 0.1 }, '-=0.1')
          .to(state.claw.position, { y: base,     duration: 0.18, ease: 'bounce.out' })
          .to(state.claw.scale,    { y: 1,        duration: 0.12 });
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
        tl.to(petals.map(p => p.position), { x: 0, y: 0.2, z: 0, duration: 0.3, ease: 'power2.in' }, 0)
          .to({}, { duration: 0.1 })
          .to(petals.map(p => p.position), {
                onStart() {
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
                duration: 0.5, ease: 'power2.out'
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

// ═══════════════════════════════════════════════════════════════════════════════
//  WALK SEGMENT
// ═══════════════════════════════════════════════════════════════════════════════
function walkSegment(targetPos) {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const startPos = state.claw.position.clone();
        const dx = targetPos.x - startPos.x;
        const dz = targetPos.z - startPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < 0.05) { resolve(); return; }

        const duration = Math.max(0.5, distance * 0.75);
        const rotY    = Math.atan2(dx, dz);
        let rotDiff   = rotY - state.claw.rotation.y;
        while (rotDiff >  Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

        const tl = gsap.timeline({
            onComplete: resolve,
            onInterrupt: resolve,
            onUpdate: () => {
                // Abort immediately if chase should be paused
                if (state.chasePause) {
                    tl.kill();
                    resolve();
                }
            }
        });
        tl.to(state.claw.rotation, { y: state.claw.rotation.y + rotDiff, duration: Math.min(0.25, duration * 0.3), ease: 'power2.out' }, 0);
        tl.to(state.claw.position, {
            x: targetPos.x, z: targetPos.z,
            duration,
            ease: 'none',
            onStart: () => {
                if (!state.claw) return;
                gsap.to(state.claw.rotation, { z: 0.06, duration: 0.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
                gsap.to(state.claw.position, { y: (state.claw.userData.baseY ?? 0) + 0.05, duration: 0.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
            }
        }, 0.15);
        tl.call(() => {
            if (!state.claw) return;
            gsap.killTweensOf(state.claw.rotation, 'z');
            gsap.killTweensOf(state.claw.position, 'y');
            state.claw.rotation.z = 0;
            state.claw.position.y = state.claw.userData.baseY ?? 0;
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WALK TO TARGET
// ═══════════════════════════════════════════════════════════════════════════════
async function walkToPoint(targetPos) {
    if (!state.claw || !state.dancePhase) return;

    const startPos = new THREE.Vector3(
        state.claw.position.x,
        0,
        state.claw.position.z
    );

    if (lineOfSight(startPos, targetPos) && !isBlocked(targetPos.x, targetPos.z)) {
        await walkSegment(targetPos);
        return;
    }

    const path = aStar(startPos, targetPos);
    if (!path || path.length === 0) {
        await danceWobble();
        return;
    }

    for (const waypoint of path) {
        if (!state.claw || state.dancePhase === null) return;
        await walkSegment(waypoint);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN AI LOOP  (respects chasePause)
// ═══════════════════════════════════════════════════════════════════════════════
async function aiLoop() {
    while (state.dancePhase !== null) {
        if (!state.claw) break;

        if (state.dancePhase === 'ending') {
            await danceWobble();
            continue;
        }

        // ── Pause logic for chase drama ─────────────────────────────────
        if (state.chasePause) {
            // Stay frozen (no movement) but keep the loop alive
            await new Promise(r => setTimeout(r, 100));
            continue;
        }

        // ── Normal navigation ───────────────────────────────────────────
        if (isBlocked(state.claw.position.x, state.claw.position.z)) {
            const safePoint = getRandomWalkablePosition();
            await walkToPoint(safePoint);
            continue;
        }

        const target = state.chaseTarget ? state.chaseTarget : getRandomWalkablePosition();
        await walkToPoint(target);

        if (!state.claw || state.dancePhase === null) break;
        if (isBlocked(state.claw.position.x, state.claw.position.z)) continue;

        const action = actionPool[Math.floor(Math.random() * actionPool.length)];
        await action();
    }
    hideSpeechBubble();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTERNAL STOP
// ═══════════════════════════════════════════════════════════════════════════════
function stopAIInternal() {
    if (state.dancePhase !== null) {
        state.dancePhase = null;
        if (state.danceAudio) { state.danceAudio.pause(); state.danceAudio = null; }
        if (state.danceEndTimer) { clearTimeout(state.danceEndTimer); state.danceEndTimer = null; }
        if (state.claw) {
            gsap.killTweensOf(state.claw.position);
            gsap.killTweensOf(state.claw.rotation);
            gsap.killTweensOf(state.claw.scale);
            groundCharacter();
        }
        state.currentAnim  = null;
        state.activeTimeline = null;
        state.chasePause = false;
        hideSpeechBubble();
    }
}

export function stopAICleanup() { stopAIInternal(); }

// ═══════════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
export function aiModeClaw(loop = false, sequences = 1) {
    if (!state.claw) return;

    if (state.activeTimeline)  { state.activeTimeline.kill();  state.activeTimeline  = null; }
    if (state.mainDanceTL)     { state.mainDanceTL.kill();     state.mainDanceTL     = null; }

    if (state.dancePhase !== null) {
        state.dancePhase = null;
        if (state.danceAudio)   { state.danceAudio.pause(); state.danceAudio = null; }
        if (state.danceEndTimer){ clearTimeout(state.danceEndTimer); state.danceEndTimer = null; }
        if (state.claw) {
            gsap.killTweensOf(state.claw.position);
            gsap.killTweensOf(state.claw.rotation);
            gsap.killTweensOf(state.claw.scale);
        }
        hideSpeechBubble();
    }

    state.currentAnim    = 'ai';
    state.currentSequence = 0;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '0';

    const audio = createDanceAudio();
    state.danceAudio = audio;
    audio.play().catch(e => console.warn('AI mode music blocked:', e));

    showSpeechBubble();

    getAudioDuration(audio).then(duration => {
        if (state.dancePhase === null) return;
        const endStart = Math.max(0, duration - 10);
        state.danceEndTimer = setTimeout(() => {
            if (!state.claw || state.dancePhase === null) return;
            state.dancePhase = 'ending';
            const base = state.claw.userData.baseY ?? 0;
            gsap.to(state.claw.position, { x: 0, y: base, z: 0, duration: 10, ease: 'power2.inOut' });
            gsap.to(state.claw.rotation, { y: '+=6.2832', duration: 10, ease: 'none' });
            setTimeout(() => {
                if (state.claw && state.dancePhase !== null) spawnPetalBurst(state.claw.position, 30);
            }, 9500);
        }, endStart * 1000);
    });

    audio.addEventListener('ended', () => stopAIInternal());

    state.dancePhase = 'active';
    aiLoop();
}