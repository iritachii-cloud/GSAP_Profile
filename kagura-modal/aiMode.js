import * as THREE from 'three';
import { state } from './state.js';
import { spawnPetalBurst, groundCharacter, createPetalSprite } from './utils.js';
import { playJumpSFX, playSpinSFX, playAttackSFX, createDanceAudio, getAudioDuration } from './music.js';
import { showSpeechBubble, hideSpeechBubble, showCustomMessage } from './speechBubble.js';
import { RIVER_Z, RIVER_WIDTH, BRIDGE_HALF } from './waterBridge.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  GRID CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const CELL        = 0.35;  // slightly finer grid for better bridge navigation
const CHAR_RADIUS = 0.32;

// ═══════════════════════════════════════════════════════════════════════════════
//  OBSTACLE CHECK
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
            if ((x - d.x) ** 2 + (z - d.z) ** 2 <= d.radius * d.radius) return true;
        }
    }
    return false;
}

// 8-probe ring — catches diagonal squeezes
function isCellBlocked(cx, cy) {
    const w = cellToWorld(cx, cy);
    if (isBlocked(w.x, w.z)) return true;
    const r = CHAR_RADIUS;
    const probes = [
        [ r, 0],[-r, 0],[0, r],[0,-r],
        [ r, r],[ r,-r],[-r, r],[-r,-r]
    ];
    for (const [dx, dz] of probes) {
        if (isBlocked(w.x + dx, w.z + dz)) return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GRID COORDINATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function worldToCell(v) {
    const b = state.groundBounds;
    return {
        cx: Math.round((v.x - b.xMin) / CELL),
        cy: Math.round((v.z - b.zMin) / CELL)
    };
}

function cellToWorld(cx, cy) {
    const b = state.groundBounds;
    return new THREE.Vector3(b.xMin + cx * CELL, 0, b.zMin + cy * CELL);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BINARY MIN-HEAP
// ═══════════════════════════════════════════════════════════════════════════════
class MinHeap {
    constructor() { this._data = []; }
    push(node) {
        this._data.push(node);
        this._bubbleUp(this._data.length - 1);
    }
    pop() {
        const top = this._data[0];
        const last = this._data.pop();
        if (this._data.length > 0) { this._data[0] = last; this._sinkDown(0); }
        return top;
    }
    get size() { return this._data.length; }
    _bubbleUp(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this._data[p].f <= this._data[i].f) break;
            [this._data[p], this._data[i]] = [this._data[i], this._data[p]];
            i = p;
        }
    }
    _sinkDown(i) {
        const n = this._data.length;
        while (true) {
            let min = i, l = 2*i+1, r = 2*i+2;
            if (l < n && this._data[l].f < this._data[min].f) min = l;
            if (r < n && this._data[r].f < this._data[min].f) min = r;
            if (min === i) break;
            [this._data[min], this._data[i]] = [this._data[i], this._data[min]];
            i = min;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LINE OF SIGHT  — dense step so we never skip thin obstacles (bridge, river)
// ═══════════════════════════════════════════════════════════════════════════════
function lineOfSight(a, b) {
    const dist  = a.distanceTo(b);
    // Step at CELL/2 so every grid cell is visited
    const steps = Math.ceil(dist / (CELL * 0.5)) + 1;
    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        if (isBlocked(x, z)) return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  A* PATHFINDING
// ═══════════════════════════════════════════════════════════════════════════════
const DIRS = [
    [1,0],[-1,0],[0,1],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1]
];
const COST = [1,1,1,1, 1.414,1.414,1.414,1.414];

function heuristic(ax, ay, bx, by) {
    const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

function nearestFreeCell(gc, maxR = 8) {
    if (!isCellBlocked(gc.cx, gc.cy)) return gc;
    for (let r = 1; r <= maxR; r++) {
        let best = null, bestD = Infinity;
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const ncx = gc.cx + dx, ncy = gc.cy + dy;
                if (!isCellBlocked(ncx, ncy)) {
                    const d = Math.abs(dx) + Math.abs(dy);
                    if (d < bestD) { bestD = d; best = { cx: ncx, cy: ncy }; }
                }
            }
        }
        if (best) return best;
    }
    return gc;
}

function aStar(start, goal) {
    let sc = worldToCell(start);
    let gc = worldToCell(goal);

    sc = nearestFreeCell(sc, 4);
    gc = nearestFreeCell(gc, 10);

    if (sc.cx === gc.cx && sc.cy === gc.cy) return [goal];

    const key  = (cx, cy) => (cx << 16) | cy;
    const gMap = new Map();
    const par  = new Map();
    const heap = new MinHeap();

    const sk = key(sc.cx, sc.cy);
    gMap.set(sk, 0);
    heap.push({ cx: sc.cx, cy: sc.cy, f: heuristic(sc.cx, sc.cy, gc.cx, gc.cy), g: 0, k: sk });

    const MAX_ITER = 15000;
    let found = null;

    for (let iter = 0; iter < MAX_ITER; iter++) {
        if (heap.size === 0) break;
        const cur = heap.pop();

        const curG = gMap.get(cur.k);
        if (curG === undefined || cur.g > curG) continue;

        if (cur.cx === gc.cx && cur.cy === gc.cy) { found = cur; break; }

        for (let d = 0; d < 8; d++) {
            const ncx = cur.cx + DIRS[d][0];
            const ncy = cur.cy + DIRS[d][1];

            if (isCellBlocked(ncx, ncy)) continue;

            if (d >= 4) {
                if (isCellBlocked(cur.cx + DIRS[d][0], cur.cy) ||
                    isCellBlocked(cur.cx, cur.cy + DIRS[d][1])) continue;
            }

            const ng  = cur.g + COST[d];
            const nk  = key(ncx, ncy);
            const old = gMap.get(nk);
            if (old !== undefined && ng >= old) continue;

            gMap.set(nk, ng);
            par.set(nk, cur);
            heap.push({
                cx: ncx, cy: ncy, g: ng,
                f: ng + heuristic(ncx, ncy, gc.cx, gc.cy),
                k: nk
            });
        }
    }

    if (!found) return null;

    const raw = [];
    let node = found;
    while (node) {
        raw.push(cellToWorld(node.cx, node.cy));
        node = par.get(node.k);
    }
    raw.reverse();

    return stringPull(raw);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STRING PULL  (rubber-band path smoothing)
// ═══════════════════════════════════════════════════════════════════════════════
function stringPull(path) {
    if (path.length <= 2) return path;
    const out = [path[0]];
    let i = 0;
    while (i < path.length - 1) {
        let j = path.length - 1;
        while (j > i + 1 && !lineOfSight(path[i], path[j])) j--;
        out.push(path[j]);
        i = j;
    }
    return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RANDOM WALKABLE POSITION
// ═══════════════════════════════════════════════════════════════════════════════
export function getRandomWalkablePosition() {
    const b = state.groundBounds;
    for (let attempt = 0; attempt < 120; attempt++) {
        const x = b.xMin + Math.random() * (b.xMax - b.xMin);
        const z = b.zMin + Math.random() * (b.zMax - b.zMin);
        if (!isBlocked(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return state.claw
        ? new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z)
        : new THREE.Vector3(0, 0, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WALK SEGMENT
// ═══════════════════════════════════════════════════════════════════════════════
function walkSegment(targetPos) {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }

        const dx = targetPos.x - state.claw.position.x;
        const dz = targetPos.z - state.claw.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < 0.04) { resolve(); return; }

        const speed    = state.chaseTarget ? 1.6 : 1.1;
        const duration = distance / speed;

        const rotY   = Math.atan2(dx, dz);
        let rotDiff  = rotY - state.claw.rotation.y;
        while (rotDiff >  Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

        const tl = gsap.timeline({
            onComplete:  resolve,
            onInterrupt: resolve,
            onUpdate: () => {
                if (state.chasePause) { tl.kill(); resolve(); }
            }
        });

        tl.to(state.claw.rotation, {
            y: state.claw.rotation.y + rotDiff,
            duration: Math.min(0.2, duration * 0.25),
            ease: 'power2.out'
        }, 0);

        tl.to(state.claw.position, {
            x: targetPos.x, z: targetPos.z,
            duration,
            ease: 'none',
            onStart: () => {
                if (!state.claw) return;
                const bobAmt = state.chaseTarget ? 0.08 : 0.05;
                const bobDur = state.chaseTarget ? 0.16 : 0.22;
                gsap.to(state.claw.rotation, { z: 0.06, duration: bobDur, yoyo: true, repeat: -1, ease: 'sine.inOut' });
                gsap.to(state.claw.position, { y: (state.claw.userData.baseY ?? 0) + bobAmt, duration: bobDur, yoyo: true, repeat: -1, ease: 'sine.inOut' });
            }
        }, 0.12);

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
//  WALK TO TARGET  — A* with direct LOS fast-path
//  KEY FIX: LOS fast-path now also verifies the line doesn't cross water
//  by simply checking isBlocked on the midpoint and quarter-points.
// ═══════════════════════════════════════════════════════════════════════════════
async function walkToTarget(targetPos) {
    if (!state.claw || !state.dancePhase) return 'dead';

    const startPos = new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z);

    // Only take LOS shortcut if both endpoints are clear AND full line is clear
    if (!isBlocked(targetPos.x, targetPos.z) && lineOfSight(startPos, targetPos)) {
        await walkSegment(targetPos);
        return 'arrived';
    }

    const path = aStar(startPos, targetPos);

    if (!path || path.length === 0) {
        return 'unreachable';
    }

    for (const wp of path) {
        if (!state.claw || state.dancePhase === null) return 'dead';
        if (state.chasePause) return 'paused';
        await walkSegment(wp);
    }
    return 'arrived';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MINI-ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function miniJump() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playJumpSFX();
        const base = state.claw.userData.baseY ?? 0;
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(state.claw.scale,    { y: 0.75, duration: 0.08, ease: 'power2.in' })
            .to(state.claw.position, { y: base + 0.6, duration: 0.2,  ease: 'power2.out' })
            .to(state.claw.scale,    { y: 1.15, duration: 0.1 }, '-=0.08')
            .to(state.claw.position, { y: base, duration: 0.22, ease: 'bounce.out' })
            .to(state.claw.scale,    { y: 1,    duration: 0.14 });
    });
}

function miniSpin() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playSpinSFX();
        spawnPetalBurst(
            state.claw.position.clone().add(new THREE.Vector3(0, 0.3, 0)),
            18, '#ff99cc'
        );
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(state.claw.rotation, { y: `+=${Math.PI * 2}`, duration: 0.75, ease: 'power1.inOut' })
            .to(state.claw.rotation, { y: `+=${Math.PI * 2}`, duration: 0.6,  ease: 'power2.in' });
    });
}

function miniAttack() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playAttackSFX();

        const group = new THREE.Group();
        group.position.copy(state.claw.position);
        state.scene.add(group);
        state.tempGroups.push(group);

        const petals = [];
        for (let i = 0; i < 28; i++) {
            const p = createPetalSprite('#ff365e', 0.09 + Math.random() * 0.06);
            p.position.set((Math.random()-.5)*1.2, Math.random()*1, (Math.random()-.5)*1.2);
            group.add(p);
            petals.push(p);
        }

        const cleanup = () => {
            group.traverse(o => { if (o.material) o.material.dispose(); });
            state.scene.remove(group);
            const idx = state.tempGroups.indexOf(group);
            if (idx > -1) state.tempGroups.splice(idx, 1);
        };

        gsap.timeline({ onComplete: resolve, onInterrupt: () => { cleanup(); resolve(); } })
            .to(petals.map(p => p.position), { x:0, y:0.2, z:0, duration: 0.3, ease: 'power2.in' }, 0)
            .to(petals.map(p => p.position), {
                onStart() {
                    const dir = state.camera.position.clone().sub(group.position).normalize();
                    petals.forEach(p => {
                        p.userData.tt = group.position.clone().add(dir.clone().multiplyScalar(2.5 + Math.random() * 1.5));
                    });
                },
                x: i => petals[i].userData.tt?.x ?? 0,
                y: i => (petals[i].userData.tt?.y ?? 0) + Math.random() * 1.2,
                z: i => petals[i].userData.tt?.z ?? 0,
                duration: 0.55, ease: 'power2.out'
            }, 0.35)
            .to(petals.map(p => p.material), { opacity: 0, duration: 0.3 }, 0.5)
            .call(cleanup);
    });
}

function danceWobble() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const base = state.claw.userData.baseY ?? 0;
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(state.claw.rotation, { z: 0.12, duration: 0.22, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0)
            .to(state.claw.position, { y: base + 0.1, duration: 0.18, yoyo: true, repeat: 2, ease: 'power1.inOut' }, 0)
            .to(state.claw.rotation, { y: `+=1.0`, duration: 1.1, ease: 'none' }, 0);
    });
}

function lookAround() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const startY = state.claw.rotation.y;
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(state.claw.rotation, { y: startY - 0.9, duration: 0.55, ease: 'sine.inOut' })
            .to(state.claw.rotation, { y: startY + 0.9, duration: 0.9,  ease: 'sine.inOut' })
            .to(state.claw.rotation, { y: startY,       duration: 0.45, ease: 'sine.out'   });
    });
}

function performBow() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const base = state.claw.userData.baseY ?? 0;
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(state.claw.rotation, { x:  0.55, duration: 0.35, ease: 'power2.out' })
            .to(state.claw.position, { y: base - 0.05, duration: 0.35 }, 0)
            .to({}, { duration: 0.4 })
            .to(state.claw.rotation, { x: 0, duration: 0.3, ease: 'back.out(1.4)' })
            .to(state.claw.position, { y: base, duration: 0.3 }, '-=0.3');
    });
}

function excitedHops() {
    return new Promise(async resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const base = state.claw.userData.baseY ?? 0;
        for (let i = 0; i < 2; i++) {
            if (!state.claw || !state.dancePhase) break;
            await new Promise(r => {
                gsap.timeline({ onComplete: r, onInterrupt: r })
                    .to(state.claw.scale,    { y: 0.8,      duration: 0.06, ease: 'power2.in' })
                    .to(state.claw.position, { y: base + 0.35, duration: 0.14, ease: 'power2.out' })
                    .to(state.claw.scale,    { y: 1.1,      duration: 0.08 }, '-=0.06')
                    .to(state.claw.position, { y: base,     duration: 0.14, ease: 'bounce.out' })
                    .to(state.claw.scale,    { y: 1,        duration: 0.1  });
            });
            playJumpSFX();
            if (i < 1) await new Promise(r => setTimeout(r, 80));
        }
        resolve();
    });
}

function spinJumpCombo() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        playSpinSFX();
        const base = state.claw.userData.baseY ?? 0;
        spawnPetalBurst(
            state.claw.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
            24, '#ffaacc'
        );
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(state.claw.scale,    { y: 0.75, duration: 0.07, ease: 'power2.in' })
            .to(state.claw.position, { y: base + 0.75, duration: 0.22, ease: 'power2.out' })
            .to(state.claw.rotation, { y: `+=${Math.PI * 2}`, duration: 0.4,  ease: 'none' }, 0.06)
            .to(state.claw.position, { y: base, duration: 0.24, ease: 'bounce.out' })
            .to(state.claw.scale,    { y: 1,    duration: 0.15 });
    });
}

function stretchUp() {
    return new Promise(resolve => {
        if (!state.claw || !state.dancePhase) { resolve(); return; }
        const base = state.claw.userData.baseY ?? 0;
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(state.claw.scale,    { y: 1.25, x: 0.82, z: 0.82, duration: 0.45, ease: 'power2.out' })
            .to(state.claw.position, { y: base + 0.08, duration: 0.45 }, 0)
            .to(state.claw.rotation, { z: Math.sin(Date.now()) * 0.08, duration: 0.35, ease: 'sine.inOut' }, 0.1)
            .to({}, { duration: 0.25 })
            .to(state.claw.scale,    { y: 1, x: 1, z: 1, duration: 0.35, ease: 'back.out(1.5)' })
            .to(state.claw.position, { y: base, duration: 0.3 }, '-=0.3')
            .to(state.claw.rotation, { z: 0, duration: 0.2 }, '-=0.2');
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ACTION POOLS
// ═══════════════════════════════════════════════════════════════════════════════
const WANDER_ACTIONS = [
    { fn: danceWobble,   weight: 3 },
    { fn: lookAround,    weight: 3 },
    { fn: performBow,    weight: 2 },
    { fn: stretchUp,     weight: 2 },
    { fn: miniJump,      weight: 2 },
    { fn: miniSpin,      weight: 1 },
    { fn: spinJumpCombo, weight: 1 },
];

const CHASE_ACTIONS = [
    { fn: excitedHops,   weight: 4 },
    { fn: miniJump,      weight: 3 },
    { fn: lookAround,    weight: 2 },
    { fn: miniAttack,    weight: 1 },
    { fn: spinJumpCombo, weight: 1 },
];

function pickWeightedAction(pool) {
    const total = pool.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (const a of pool) {
        r -= a.weight;
        if (r <= 0) return a.fn;
    }
    return pool[0].fn;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WANDER WAYPOINT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
let _lastWanderQuadrant = -1;

function getWanderTarget() {
    const b = state.groundBounds;
    const cx = (state.claw?.position.x ?? 0);
    const cz = (state.claw?.position.z ?? 0);

    let quad;
    do { quad = Math.floor(Math.random() * 4); } while (quad === _lastWanderQuadrant);
    _lastWanderQuadrant = quad;

    const qx = quad < 2 ? [b.xMin, 0] : [0, b.xMax];
    const qz = quad % 2 === 0 ? [b.zMin, 0] : [0, b.zMax];

    for (let attempt = 0; attempt < 80; attempt++) {
        const x = qx[0] + Math.random() * (qx[1] - qx[0]);
        const z = qz[0] + Math.random() * (qz[1] - qz[0]);
        const dist = Math.hypot(x - cx, z - cz);
        if (dist > 3.0 && !isBlocked(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return getRandomWalkablePosition();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RECOVERY
// ═══════════════════════════════════════════════════════════════════════════════
async function recoverFromStuck() {
    if (!state.claw) return;
    const safe = new THREE.Vector3(0, 0, 3);
    const result = await walkToTarget(safe);
    if (result === 'unreachable') {
        state.claw.position.set(0, state.claw.userData.baseY ?? 0, 3);
        groundCharacter();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTEXTUAL QUIPS  — rate-limited, won't fire during or just after custom msg
// ═══════════════════════════════════════════════════════════════════════════════
const WANDER_QUIPS = [
    { text: "I wonder where he went~",       emotion: 'curious'  },
    { text: "Hayabusa… show yourself! 👀",   emotion: 'playful'  },
    { text: "So peaceful here… 🌸",          emotion: 'peaceful' },
    { text: "The petals are dancing!",        emotion: 'happy'    },
    { text: "I'll find you, my love! 💪",    emotion: 'excited'  },
    { text: "Hmm… which way did he go?",     emotion: 'curious'  },
    { text: "I feel so alive today! 🌸",     emotion: 'happy'    },
    { text: "The shrine looks beautiful~",   emotion: 'peaceful' },
];
const CHASE_QUIPS = [
    { text: "I see you!! 😤💕",              emotion: 'excited'  },
    { text: "Come here, Hayabusa!!",          emotion: 'excited'  },
    { text: "You can't run forever~! 💨",    emotion: 'playful'  },
    { text: "Almost…! ALMOST!! 🏃‍♀️",        emotion: 'excited'  },
    { text: "My petals will find you! 🌸",   emotion: 'excited'  },
];

// Minimum gap between quips: 10 s wander, 6 s chase
const QUIP_COOLDOWN_WANDER = 10000;
const QUIP_COOLDOWN_CHASE  = 6000;
let _lastQuipTime = 0;

function maybeShowQuip(isChasing) {
    const now = Date.now();
    const cooldown = isChasing ? QUIP_COOLDOWN_CHASE : QUIP_COOLDOWN_WANDER;
    if (now - _lastQuipTime < cooldown) return;
    // Chase: 55% chance per walk-end; Wander: 40%
    if (Math.random() > (isChasing ? 0.55 : 0.40)) return;

    _lastQuipTime = now;
    const pool = isChasing ? CHASE_QUIPS : WANDER_QUIPS;
    const { text, emotion } = pool[Math.floor(Math.random() * pool.length)];
    // postDelay=0: idle cycle resumes from speechBubble naturally after the quip
    showCustomMessage(text, emotion, 2800, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CATCHING HAYABUSA — final ending sequence
//  Called from hayabusa.js via state.onHayabusaCaught()
// ═══════════════════════════════════════════════════════════════════════════════
export async function playFinalCatchSequence(hayabusaPos) {
    if (!state.claw || state.dancePhase === null) return;

    // Pause AI movement
    state.chasePause = true;
    state.dancePhase = 'ending';

    // Show special catch message
    showCustomMessage("I finally caught you!! 💗🌸", 'excited', 4000, 0);

    // Kagura runs to Hayabusa position
    const target = new THREE.Vector3(hayabusaPos.x, 0, hayabusaPos.z);
    const path   = aStar(
        new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z),
        target
    );

    if (path) {
        state.chasePause = false;
        for (const wp of path) {
            if (!state.claw) return;
            await walkSegment(wp);
        }
        state.chasePause = true;
    }

    if (!state.claw) return;

    // Celebration spin + petal burst
    playSpinSFX();
    spawnPetalBurst(state.claw.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 60, '#ff99cc');
    await new Promise(resolve => {
        gsap.timeline({ onComplete: resolve })
            .to(state.claw.rotation, { y: `+=${Math.PI * 4}`, duration: 1.2, ease: 'power2.inOut' });
    });

    // Walk together to origin (0, 0, 3)
    showCustomMessage("Let's go home together~ 🌸", 'peaceful', 3500, 0);
    await new Promise(r => setTimeout(r, 800));

    state.chasePause = false;
    const homePath = aStar(
        new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z),
        new THREE.Vector3(0, 0, 3)
    );
    if (homePath) {
        for (const wp of homePath) {
            if (!state.claw) return;
            await walkSegment(wp);
        }
    }

    // Final bow at home
    await performBow();
    spawnPetalBurst(state.claw.position.clone(), 80, '#ffaacc');

    // Stop AI mode cleanly
    stopAIInternal();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN AI LOOP
//  FIX: Chase target re-acquisition — when we arrive at chaseTarget we
//  immediately re-read state.chaseTarget (Hayabusa may have teleported and
//  set a new one). We NEVER clear chaseTarget on unreachable; instead we
//  wait briefly and retry so Kagura keeps chasing even across the bridge.
// ═══════════════════════════════════════════════════════════════════════════════
let _consecutiveFailures = 0;
const MAX_FAILURES = 4;

async function aiLoop() {
    _consecutiveFailures = 0;
    _lastQuipTime        = 0;

    while (state.dancePhase !== null) {
        if (!state.claw) break;

        if (state.dancePhase === 'ending') {
            await danceWobble();
            continue;
        }

        if (state.chasePause) {
            await new Promise(r => setTimeout(r, 80));
            continue;
        }

        // Recovery: inside obstacle
        if (isBlocked(state.claw.position.x, state.claw.position.z)) {
            await recoverFromStuck();
            _consecutiveFailures++;
            if (_consecutiveFailures > MAX_FAILURES) {
                state.claw.position.set(0, state.claw.userData.baseY ?? 0, 3);
                groundCharacter();
                _consecutiveFailures = 0;
            }
            continue;
        }

        // Re-read chaseTarget fresh every iteration so Hayabusa teleports
        // are picked up immediately without clearing the target on failure
        const isChasing = !!state.chaseTarget;

        // Pick destination
        let target;
        if (isChasing) {
            // Always chase Hayabusa's CURRENT position, not a stale clone
            target = state.chaseTarget.clone();
        } else {
            target = getWanderTarget();
        }

        const result = await walkToTarget(target);

        if (!state.claw || state.dancePhase === null) break;

        if (result === 'unreachable') {
            _consecutiveFailures++;
            // KEY FIX: don't clear chaseTarget on unreachable.
            // Instead just wait and try again — Hayabusa may have moved
            // to a more accessible cell in the meantime.
            if (_consecutiveFailures >= MAX_FAILURES) {
                await recoverFromStuck();
                _consecutiveFailures = 0;
            } else {
                await new Promise(r => setTimeout(r, 400));
            }
            continue;
        }

        if (result === 'paused' || result === 'dead') continue;

        _consecutiveFailures = 0;

        if (!state.claw || state.dancePhase === null || state.chasePause) continue;
        if (isBlocked(state.claw.position.x, state.claw.position.z)) continue;

        maybeShowQuip(isChasing);

        // When chasing Hayabusa: do a quick action less often so she keeps
        // pursuing; when wandering: richer actions
        const actionChance = isChasing ? 0.30 : 0.82;
        if (Math.random() < actionChance) {
            const pool   = isChasing ? CHASE_ACTIONS : WANDER_ACTIONS;
            const action = pickWeightedAction(pool);
            await action();
        }

        if (!isChasing) {
            const idleMs = 500 + Math.random() * 1000;
            await new Promise(r => setTimeout(r, idleMs));
        } else {
            // Tiny breath so we don't spin too fast between chase steps
            await new Promise(r => setTimeout(r, 100));
        }
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
        state.currentAnim    = null;
        state.activeTimeline = null;
        state.chasePause     = false;
        hideSpeechBubble();
    }
}

export function stopAICleanup() { stopAIInternal(); }

// ═══════════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
export function aiModeClaw(loop = false, sequences = 1) {
    if (!state.claw) return;

    if (state.activeTimeline) { state.activeTimeline.kill(); state.activeTimeline = null; }
    if (state.mainDanceTL)    { state.mainDanceTL.kill();    state.mainDanceTL    = null; }

    if (state.dancePhase !== null) {
        state.dancePhase = null;
        if (state.danceAudio)    { state.danceAudio.pause(); state.danceAudio = null; }
        if (state.danceEndTimer) { clearTimeout(state.danceEndTimer); state.danceEndTimer = null; }
        if (state.claw) {
            gsap.killTweensOf(state.claw.position);
            gsap.killTweensOf(state.claw.rotation);
            gsap.killTweensOf(state.claw.scale);
        }
        hideSpeechBubble();
    }

    state.currentAnim     = 'ai';
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
            gsap.to(state.claw.rotation, { y: `+=${Math.PI * 4}`, duration: 10, ease: 'none' });
            setTimeout(() => {
                if (state.claw && state.dancePhase !== null) spawnPetalBurst(state.claw.position, 40);
            }, 9400);
        }, endStart * 1000);
    });

    audio.addEventListener('ended', () => stopAIInternal());

    state.dancePhase = 'active';
    aiLoop();
}