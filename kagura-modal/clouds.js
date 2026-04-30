import * as THREE from 'three';
import { state } from './state.js';

// ─── Module state ──────────────────────────────────────────────────────────
let clouds     = [];
let animHandle = null;
let running    = false;

const CLOUD_COUNT = 10;
const BOX_X = 35;    // half-extent of drift corridor

// ─── Soft cloud puff texture ───────────────────────────────────────────────
function makeCloudTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');

    // Layered radial gradients for a soft, fluffy look
    const blobs = [
        { cx: 0.50, cy: 0.50, r: 0.38 },
        { cx: 0.30, cy: 0.58, r: 0.26 },
        { cx: 0.70, cy: 0.56, r: 0.28 },
        { cx: 0.50, cy: 0.38, r: 0.22 },
        { cx: 0.38, cy: 0.42, r: 0.18 },
        { cx: 0.64, cy: 0.40, r: 0.20 },
    ];

    blobs.forEach(b => {
        const grd = ctx.createRadialGradient(
            b.cx*size, b.cy*size, 0,
            b.cx*size, b.cy*size, b.r*size
        );
        grd.addColorStop(0,   'rgba(255,255,255,0.55)');
        grd.addColorStop(0.5, 'rgba(250,248,255,0.30)');
        grd.addColorStop(1,   'rgba(240,245,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);
    });

    return new THREE.CanvasTexture(c);
}

// Shared texture (created once)
let sharedTex = null;

// ─── Build one cloud from 4-6 overlapping sprites ─────────────────────────
function spawnCloud() {
    if (!sharedTex) sharedTex = makeCloudTexture();

    // Each cloud is a group of puff sprites
    const group = new THREE.Group();

    const puffCount = 3 + Math.floor(Math.random() * 4);
    const puffs = [];
    for (let p = 0; p < puffCount; p++) {
        const mat = new THREE.SpriteMaterial({
            map: sharedTex,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            color: new THREE.Color(
                0.96 + Math.random() * 0.04,
                0.97 + Math.random() * 0.03,
                1.0
            )
        });
        const sprite = new THREE.Sprite(mat);
        const sw = 4.0 + Math.random() * 5.0;
        const sh = sw * (0.45 + Math.random() * 0.25);
        sprite.scale.set(sw, sh, 1);
        sprite.position.set(
            (Math.random() - 0.5) * sw * 0.7,
            (Math.random() - 0.5) * sh * 0.5,
            (Math.random() - 0.5) * 1.5
        );
        group.add(sprite);
        puffs.push({ sprite, baseOpacity: 0.45 + Math.random() * 0.3 });
    }

    // Entry from left or right
    const fromLeft = Math.random() < 0.5;
    const startX   = fromLeft ? -(BOX_X + 8) : (BOX_X + 8);
    const endX     = fromLeft ?  (BOX_X + 8) : -(BOX_X + 8);
    const z        = (Math.random() - 0.5) * 50;
    const y        = 7 + Math.random() * 10;
    const speed    = 0.8 + Math.random() * 1.4;   // units / second — slow, majestic

    group.position.set(startX, y, z);
    state.scene.add(group);

    // Gentle vertical bob parameters
    const bobFreq = 0.08 + Math.random() * 0.12;
    const bobAmp  = 0.3  + Math.random() * 0.5;
    const bobPhase= Math.random() * Math.PI * 2;

    return {
        group, puffs,
        x: startX, y, z,
        endX, speed, fromLeft,
        bobFreq, bobAmp, bobPhase,
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

    // Keep cloud count
    while (clouds.length < CLOUD_COUNT) {
        // Stagger initial spawns across the corridor so it doesn't look empty
        const c = spawnCloud();
        if (clouds.length < CLOUD_COUNT * 0.5) {
            // Pre-place some already mid-journey
            const fraction = Math.random();
            c.x = c.fromLeft
                ? -(BOX_X + 8) + fraction * (BOX_X * 2 + 16)
                : (BOX_X + 8) - fraction * (BOX_X * 2 + 16);
            c.group.position.x = c.x;
        }
        clouds.push(c);
    }

    for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];

        // Drift
        const dir = c.fromLeft ? 1 : -1;
        c.x += dir * c.speed * delta;

        // Gentle bob
        const bobY = Math.sin(t * c.bobFreq * Math.PI * 2 + c.bobPhase) * c.bobAmp;
        c.group.position.set(c.x, c.y + bobY, c.z);

        // Fade corridor: fade in when entering BOX, fade out when leaving
        const absX      = Math.abs(c.x);
        const fadeZone  = 10;
        let targetOpacity;
        if (absX > BOX_X)              targetOpacity = Math.max(0, 1 - (absX - BOX_X) / fadeZone);
        else                            targetOpacity = 1.0;

        c.opacity += (targetOpacity - c.opacity) * Math.min(1, delta * 1.5);

        // Apply to all puff sprites
        c.puffs.forEach(p => {
            p.sprite.material.opacity = c.opacity * p.baseOpacity;
        });

        // Remove when past far edge
        const gone = c.fromLeft ? c.x > BOX_X + 20 : c.x < -(BOX_X + 20);
        if (gone) {
            state.scene.remove(c.group);
            c.puffs.forEach(p => p.sprite.material.dispose());
            clouds.splice(i, 1);
        }
    }
}

// ─── Public API ────────────────────────────────────────────────────────────
export function startClouds() {
    if (running) return;
    running  = true;
    lastTime = performance.now();
    tick();
}

export function stopClouds() {
    running = false;
    if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
    clouds.forEach(c => {
        state.scene.remove(c.group);
        c.puffs.forEach(p => p.sprite.material.dispose());
    });
    clouds = [];
    if (sharedTex) { sharedTex.dispose(); sharedTex = null; }
    state.clouds = null;
}