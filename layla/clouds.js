import * as THREE from 'three';
import { state } from './state.js';

let clouds = [];
let animHandle = null;
let running = false;

const CLOUD_COUNT = 12;
const BOX_X = 35;

// ---------- TEXTURE ----------
let sharedTexDay = null;
let sharedTexNight = null;

function makeCloudTexture(alpha = 0.4, tint = '#ffffff') {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    // Soft radial blobs
    const blobs = [
        { cx: 0.50, cy: 0.50, r: 0.38 },
        { cx: 0.30, cy: 0.58, r: 0.26 },
        { cx: 0.70, cy: 0.56, r: 0.28 },
        { cx: 0.50, cy: 0.38, r: 0.22 },
        { cx: 0.38, cy: 0.42, r: 0.18 },
        { cx: 0.64, cy: 0.40, r: 0.20 },
    ];
    blobs.forEach(b => {
        const grd = ctx.createRadialGradient(b.cx * size, b.cy * size, 0, b.cx * size, b.cy * size, b.r * size);
        grd.addColorStop(0, `rgba(200,220,255,${alpha * 1.2})`);
        grd.addColorStop(0.5, `rgba(180,200,240,${alpha * 0.6})`);
        grd.addColorStop(1, 'rgba(160,180,220,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);
    });

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ---------- CLOUD OBJECT ----------
function spawnCloud() {
    if (!sharedTexDay) sharedTexDay = makeCloudTexture(0.5, '#ffffff');
    if (!sharedTexNight) sharedTexNight = makeCloudTexture(0.35, '#aaccff');

    const group = new THREE.Group();
    const puffCount = 3 + Math.floor(Math.random() * 4);
    const puffs = [];
    const tex = state.timeOfDay === 'night' ? sharedTexNight : sharedTexDay;

    for (let p = 0; p < puffCount; p++) {
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: new THREE.Color(0.85, 0.9, 1.0) });
        const sprite = new THREE.Sprite(mat);
        const sw = 3.5 + Math.random() * 4.5;
        const sh = sw * (0.45 + Math.random() * 0.25);
        sprite.scale.set(sw, sh, 1);
        sprite.position.set((Math.random() - 0.5) * sw * 0.7, (Math.random() - 0.5) * sh * 0.5, (Math.random() - 0.5) * 1.5);
        group.add(sprite);
        puffs.push({ sprite, baseOpacity: 0.35 + Math.random() * 0.3 });
    }

    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -(BOX_X + 8) : (BOX_X + 8);
    const endX = fromLeft ? (BOX_X + 8) : -(BOX_X + 8);
    const z = (Math.random() - 0.5) * 50;
    const y = 5 + Math.random() * 12;       // keep them mid‑high
    const speed = 0.4 + Math.random() * 0.9;  // slow drift

    group.position.set(startX, y, z);
    state.scene.add(group);

    const bobFreq = 0.05 + Math.random() * 0.1;
    const bobAmp = 0.2 + Math.random() * 0.4;
    const bobPhase = Math.random() * Math.PI * 2;

    return { group, puffs, x: startX, y, z, endX, speed, fromLeft, bobFreq, bobAmp, bobPhase, opacity: 0, dead: false };
}

// ---------- ANIMATION ----------
let lastTime = performance.now();
function tick() {
    if (!running) return;
    animHandle = requestAnimationFrame(tick);
    const now = performance.now();
    const delta = Math.min(0.05, (now - lastTime) * 0.001);
    lastTime = now;
    const t = now * 0.001;

    // Maintain cloud count
    while (clouds.length < CLOUD_COUNT) {
        const c = spawnCloud();
        // For existing clouds, spread them out so they don't all pop at once
        if (clouds.length < CLOUD_COUNT * 0.5) {
            const fraction = Math.random();
            c.x = c.fromLeft ? -(BOX_X + 8) + fraction * (BOX_X * 2 + 16) : (BOX_X + 8) - fraction * (BOX_X * 2 + 16);
            c.group.position.x = c.x;
        }
        clouds.push(c);
    }

    // Update positions and opacity
    for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        const dir = c.fromLeft ? 1 : -1;
        c.x += dir * c.speed * delta;
        const bobY = Math.sin(t * c.bobFreq * Math.PI * 2 + c.bobPhase) * c.bobAmp;
        c.group.position.set(c.x, c.y + bobY, c.z);

        const absX = Math.abs(c.x);
        const fadeZone = 10;
        let targetOpacity;
        if (absX > BOX_X) targetOpacity = Math.max(0, 1 - (absX - BOX_X) / fadeZone);
        else targetOpacity = 1.0;
        c.opacity += (targetOpacity - c.opacity) * Math.min(1, delta * 1.5);

        c.puffs.forEach(p => { p.sprite.material.opacity = c.opacity * p.baseOpacity; });

        const gone = c.fromLeft ? c.x > BOX_X + 20 : c.x < -(BOX_X + 20);
        if (gone) {
            state.scene.remove(c.group);
            c.puffs.forEach(p => p.sprite.material.dispose());
            clouds.splice(i, 1);
        }
    }
}

// ---------- PUBLIC API ----------
export function startClouds() {
    if (running) return;
    running = true;
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
    if (sharedTexDay) { sharedTexDay.dispose(); sharedTexDay = null; }
    if (sharedTexNight) { sharedTexNight.dispose(); sharedTexNight = null; }
    state.clouds = null;
}