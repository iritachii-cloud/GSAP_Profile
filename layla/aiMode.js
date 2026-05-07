import * as THREE from 'three';
import { state } from './state.js';
import { RIVER_Z, RIVER_WIDTH, BRIDGE_HALF } from './waterBridge.js';

// ---- GRID & PATHFINDING CONSTANTS ----
const CELL = 0.30;
const CHAR_RADIUS = 0.28;

// ---- OBSTACLE / BOUNDS HELPERS ----
export function isBlocked(x, z) {
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

function isCellBlocked(cx, cy) {
    const w = cellToWorld(cx, cy);
    if (isBlocked(w.x, w.z)) return true;
    const probes = [[CHAR_RADIUS,0],[-CHAR_RADIUS,0],[0,CHAR_RADIUS],[0,-CHAR_RADIUS],
                    [CHAR_RADIUS,CHAR_RADIUS],[CHAR_RADIUS,-CHAR_RADIUS],
                    [-CHAR_RADIUS,CHAR_RADIUS],[-CHAR_RADIUS,-CHAR_RADIUS]];
    for (const [dx,dz] of probes) {
        if (isBlocked(w.x + dx, w.z + dz)) return true;
    }
    return false;
}

function worldToCell(v) {
    const b = state.groundBounds;
    return { cx: Math.round((v.x - b.xMin) / CELL), cy: Math.round((v.z - b.zMin) / CELL) };
}

function cellToWorld(cx, cy) {
    const b = state.groundBounds;
    return new THREE.Vector3(b.xMin + cx * CELL, 0, b.zMin + cy * CELL);
}

// ---- MIN HEAP for A* ----
class MinHeap {
    constructor() { this._data = []; }
    push(node) { this._data.push(node); this._bubbleUp(this._data.length-1); }
    pop() {
        const top = this._data[0];
        const last = this._data.pop();
        if (this._data.length > 0) { this._data[0] = last; this._sinkDown(0); }
        return top;
    }
    get size() { return this._data.length; }
    _bubbleUp(i) {
        while (i > 0) {
            const p = (i-1) >> 1;
            if (this._data[p].f <= this._data[i].f) break;
            [this._data[p], this._data[i]] = [this._data[i], this._data[p]]; i = p;
        }
    }
    _sinkDown(i) {
        const n = this._data.length;
        while (true) {
            let min = i, l = 2*i+1, r = 2*i+2;
            if (l < n && this._data[l].f < this._data[min].f) min = l;
            if (r < n && this._data[r].f < this._data[min].f) min = r;
            if (min === i) break;
            [this._data[min], this._data[i]] = [this._data[i], this._data[min]]; i = min;
        }
    }
}

function lineOfSight(a, b) {
    const dist = a.distanceTo(b);
    const steps = Math.ceil(dist / (CELL*0.4)) + 1;
    for (let s=0; s <= steps; s++) {
        const t = s/steps;
        if (isBlocked(a.x + (b.x - a.x)*t, a.z + (b.z - a.z)*t)) return false;
    }
    return true;
}

const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const COST = [1,1,1,1,1.414,1.414,1.414,1.414];

function heuristic(ax, ay, bx, by) {
    const dx = Math.abs(ax-bx), dy = Math.abs(ay-by);
    return Math.max(dx,dy) + (Math.SQRT2-1)*Math.min(dx,dy);
}

function nearestFreeCell(gc, maxR=12) {
    if (!isCellBlocked(gc.cx, gc.cy)) return gc;
    for (let r=1; r<=maxR; r++) {
        let best=null, bestD=Infinity;
        for (let dx=-r; dx<=r; dx++) {
            for (let dy=-r; dy<=r; dy++) {
                if (Math.abs(dx)!==r && Math.abs(dy)!==r) continue;
                const ncx = gc.cx+dx, ncy = gc.cy+dy;
                if (!isCellBlocked(ncx,ncy)) {
                    const d = Math.abs(dx)+Math.abs(dy);
                    if (d<bestD) { bestD=d; best={ cx:ncx, cy:ncy }; }
                }
            }
        }
        if (best) return best;
    }
    return gc;
}

export function aStar(start, goal) {
    let sc = worldToCell(start);
    let gc = worldToCell(goal);
    sc = nearestFreeCell(sc, 6);
    gc = nearestFreeCell(gc, 12);
    if (sc.cx===gc.cx && sc.cy===gc.cy) return [goal];

    const key = (cx,cy) => (cx << 16) | (cy & 0xFFFF);
    const gMap = new Map();
    const par  = new Map();
    const heap = new MinHeap();
    const sk = key(sc.cx, sc.cy);
    gMap.set(sk,0);
    heap.push({ cx:sc.cx, cy:sc.cy, f: heuristic(sc.cx,sc.cy,gc.cx,gc.cy), g:0, k:sk });

    const MAX_ITER = 20000;
    let found = null;
    for (let iter=0; iter<MAX_ITER; iter++) {
        if (heap.size===0) break;
        const cur = heap.pop();
        const curG = gMap.get(cur.k);
        if (curG===undefined || cur.g > curG) continue;
        if (cur.cx===gc.cx && cur.cy===gc.cy) { found = cur; break; }
        for (let d=0; d<8; d++) {
            const ncx = cur.cx + DIRS[d][0];
            const ncy = cur.cy + DIRS[d][1];
            if (isCellBlocked(ncx,ncy)) continue;
            if (d>=4) {
                if (isCellBlocked(cur.cx + DIRS[d][0], cur.cy) ||
                    isCellBlocked(cur.cx, cur.cy + DIRS[d][1])) continue;
            }
            const ng = cur.g + COST[d];
            const nk = key(ncx,ncy);
            const old = gMap.get(nk);
            if (old !== undefined && ng >= old) continue;
            gMap.set(nk, ng);
            par.set(nk, cur);
            heap.push({ cx:ncx, cy:ncy, g:ng, f: ng+heuristic(ncx,ncy,gc.cx,gc.cy), k:nk });
        }
    }
    if (!found) return null;

    const raw = [];
    let node = found;
    while (node) { raw.push(cellToWorld(node.cx, node.cy)); node = par.get(node.k); }
    raw.reverse();
    return stringPull(raw);
}

function stringPull(path) {
    if (path.length <= 2) return path;
    const out = [path[0]];
    let i = 0;
    while (i < path.length-1) {
        let j = path.length-1;
        while (j > i+1 && !lineOfSight(path[i], path[j])) j--;
        out.push(path[j]);
        i = j;
    }
    return out;
}

// ---- PUBLIC API ----
export function getRandomWalkablePosition() {
    const b = state.groundBounds;
    for (let attempt=0; attempt<200; attempt++) {
        const x = b.xMin + Math.random() * (b.xMax - b.xMin);
        const z = b.zMin + Math.random() * (b.zMax - b.zMin);
        if (!isBlocked(x,z)) return new THREE.Vector3(x, 0, z);
    }
    return state.claw ? new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z)
                      : new THREE.Vector3(0, 0, 0);
}

// Legacy stub (no longer used, but kept to avoid undefined import errors)
export function aiModeClaw() {
    console.warn('aiModeClaw() is deprecated. Use startFamilyChase() instead.');
}

export function stopAICleanup() {
    // No active AI to clean up
}