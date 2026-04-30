import * as THREE from 'three';
import { state } from './state.js';

// ─── Module state ──────────────────────────────────────────────────────────
let birds      = [];      // array of bird objects
let animHandle = null;
let running    = false;

// ─── Scene "box" birds fly through ────────────────────────────────────────
const BOX = { x: 30, y: 25, z: 30 };   // half-extents of visible volume
const BIRD_COUNT = 30;

// ─── Build one bird mesh ───────────────────────────────────────────────────
// Uses a sprite-style "M" silhouette drawn on canvas — looks like a real
// bird in flight when small and far away, which is exactly how we see them.
function createBirdSprite() {
    const size = 30;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');

    // Draw bird as simple "M" wing silhouette
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    // Left wing arc
    ctx.moveTo(size * 0.5, size * 0.52);
    ctx.quadraticCurveTo(size * 0.25, size * 0.30, size * 0.02, size * 0.42);
    ctx.quadraticCurveTo(size * 0.25, size * 0.58, size * 0.5, size * 0.52);
    // Right wing arc
    ctx.moveTo(size * 0.5, size * 0.52);
    ctx.quadraticCurveTo(size * 0.75, size * 0.30, size * 0.98, size * 0.42);
    ctx.quadraticCurveTo(size * 0.75, size * 0.58, size * 0.5, size * 0.52);
    ctx.fill();

    // Tiny body teardrop
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.52, size * 0.06, size * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        color: 0x222222
    });
    const sprite = new THREE.Sprite(mat);
    const s = 0.55 + Math.random() * 0.45;   // size variation
    sprite.scale.set(s, s * 0.5, 1);
    return sprite;
}

// ─── Spawn one bird with randomised flight parameters ─────────────────────
function spawnBird() {
    const sprite = createBirdSprite();

    // Pick a random entry edge (left/right/front/back of box)
    const edge   = Math.floor(Math.random() * 4);
    let sx, sz, tx, tz;
    const margin = BOX.x * 1.1;

    if (edge === 0) { sx = -margin; sz = (Math.random()-0.5)*BOX.z; tx =  margin; tz = (Math.random()-0.5)*BOX.z; }
    else if (edge === 1) { sx =  margin; sz = (Math.random()-0.5)*BOX.z; tx = -margin; tz = (Math.random()-0.5)*BOX.z; }
    else if (edge === 2) { sx = (Math.random()-0.5)*BOX.x; sz = -margin; tx = (Math.random()-0.5)*BOX.x; tz =  margin; }
    else                  { sx = (Math.random()-0.5)*BOX.x; sz =  margin; tx = (Math.random()-0.5)*BOX.x; tz = -margin; }

    const y      = 5 + Math.random() * BOX.y;
    const speed  = 3.5 + Math.random() * 4.0;          // world units / second
    const dx     = tx - sx, dz = tz - sz;
    const dist   = Math.sqrt(dx*dx + dz*dz);
    const vx     = (dx / dist) * speed;
    const vz     = (dz / dist) * speed;
    // Slight vertical drift
    const vy     = (Math.random() - 0.5) * 0.6;

    // Wing flap parameters
    const flapSpeed = 2.5 + Math.random() * 3.0;       // flaps per second
    const flapAmp   = 0.18 + Math.random() * 0.12;     // vertical flap amplitude

    // Heading yaw (face direction of travel)
    const yaw = Math.atan2(vx, vz);

    // Fade zone: fade in first 15% of path, fade out last 15%
    const totalDist = dist;

    state.scene.add(sprite);

    return {
        sprite,
        x: sx, y, z: sz,
        vx, vy, vz,
        flapSpeed, flapAmp,
        yaw,
        phase: Math.random() * Math.PI * 2,   // flap phase offset
        travelled: 0,
        totalDist,
        opacity: 0,
        dead: false
    };
}

// ─── Per-frame update ──────────────────────────────────────────────────────
let lastTime = performance.now();

function tick() {
    if (!running) return;
    animHandle = requestAnimationFrame(tick);

    const now   = performance.now();
    const delta = Math.min(0.05, (now - lastTime) * 0.001);
    lastTime    = now;
    const t     = now * 0.001;

    // Spawn new birds to keep count
    while (birds.length < BIRD_COUNT) {
        birds.push(spawnBird());
    }

    for (let i = birds.length - 1; i >= 0; i--) {
        const b = birds[i];

        // Move
        b.x += b.vx * delta;
        b.y += b.vy * delta;
        b.z += b.vz * delta;
        b.travelled += Math.sqrt((b.vx*b.vx + b.vz*b.vz)) * delta;

        // Wing flap — oscillate sprite Y scale to simulate flapping
        const flap  = Math.sin(t * b.flapSpeed * Math.PI * 2 + b.phase);
        const scaleX = b.sprite.scale.x;
        b.sprite.scale.set(scaleX, scaleX * (0.38 + Math.abs(flap) * 0.28), 1);

        // Gentle banking (roll-like) via scale.x
        const bank = Math.sin(t * 0.7 + b.phase) * 0.08;
        b.sprite.scale.x = b.sprite.scale.x * (1 + bank);

        // Subtle sine vertical drift for soaring feel
        b.sprite.position.set(b.x, b.y + Math.sin(t * 0.9 + b.phase) * 0.25, b.z);

        // Fade in / out based on travel progress
        const progress = b.travelled / b.totalDist;
        let targetOpacity;
        if (progress < 0.12)       targetOpacity = progress / 0.12;
        else if (progress > 0.85)  targetOpacity = (1 - progress) / 0.15;
        else                        targetOpacity = 1.0;

        b.opacity += (targetOpacity - b.opacity) * Math.min(1, delta * 4);
        b.sprite.material.opacity = Math.max(0, Math.min(0.88, b.opacity));

        // Remove when past the box
        if (b.travelled >= b.totalDist * 1.05) {
            state.scene.remove(b.sprite);
            b.sprite.material.map.dispose();
            b.sprite.material.dispose();
            birds.splice(i, 1);
        }
    }
}

// ─── Public API ────────────────────────────────────────────────────────────
export function startBirds() {
    if (running) return;
    running  = true;
    lastTime = performance.now();
    tick();
}

export function stopBirds() {
    running = false;
    if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
    birds.forEach(b => {
        state.scene.remove(b.sprite);
        b.sprite.material.map?.dispose();
        b.sprite.material.dispose();
    });
    birds = [];
    state.birds = null;
}