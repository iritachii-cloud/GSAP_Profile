import * as THREE from 'three';
import { state } from './state.js';

let skyMesh = null;
let lightningGroup = null;
let lightningFlashLight = null;
let lightningTimer = null;
let nextStrike = 0;

// ---------- TEXTURES ----------
function createDayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Sky gradient (soft blue to pale white)
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5599ff');
    grad.addColorStop(0.4, '#99ccff');
    grad.addColorStop(0.7, '#ddeeff');
    grad.addColorStop(1, '#f0f8ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Fluffy white clouds
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 60; i++) {
        const cx = Math.random() * 512;
        const cy = Math.random() * 350;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18 + Math.random() * 20, 12 + Math.random() * 16, 0, 0, Math.PI * 2);
        ctx.fill();
        // smaller puffs nearby
        for (let j = 0; j < 3; j++) {
            ctx.beginPath();
            ctx.ellipse(cx + (Math.random() - 0.5) * 40, cy + (Math.random() - 0.5) * 20, 8 + Math.random() * 10, 6 + Math.random() * 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createNightTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep night gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(0.4, '#15153e');
    grad.addColorStop(0.8, '#2a1a3e');
    grad.addColorStop(1, '#3a2a4e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Stars (tiny bright dots)
    ctx.fillStyle = '#ffffff';
    const starCount = 800;                          // lots of stars
    for (let i = 0; i < starCount; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 400;              // keep them in the upper part
        const size = 0.3 + Math.random() * 1.0;     // tiny dots
        ctx.fillRect(x, y, size, size);             // 1‑pixel dots essentially
    }

    // Glowing crescent moon
    ctx.fillStyle = '#ffffe0';
    ctx.beginPath();
    ctx.arc(380, 120, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a2e';
    ctx.beginPath();
    ctx.arc(370, 108, 32, 0, Math.PI * 2);
    ctx.fill();

    // Soft magical glow around moon
    const glowGrad = ctx.createRadialGradient(380, 120, 30, 380, 120, 80);
    glowGrad.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
    glowGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(380, 120, 80, 0, Math.PI * 2);
    ctx.fill();

    // Subtle clouds (magical purple / blue)
    ctx.fillStyle = 'rgba(80, 80, 180, 0.15)';
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, Math.random() * 400, 15 + Math.random() * 20, 8 + Math.random() * 12, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ---------- LIGHTNING ----------
function createLightningBolt(start, end, branches = 3) {
    const points = [start];
    const segments = 8 + Math.floor(Math.random() * 6);
    let cx = start.x, cy = start.y, cz = start.z;
    const dx = (end.x - cx) / segments;
    const dy = (end.y - cy) / segments;
    const dz = (end.z - cz) / segments;

    for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * 0.8;
        const jitterY = (Math.random() - 0.5) * 0.8;
        const jitterZ = (Math.random() - 0.5) * 0.8;
        points.push(new THREE.Vector3(cx + dx * i + jitterX, cy + dy * i + jitterY, cz + dz * i + jitterZ));
    }
    points.push(end);

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: '#ffccff', transparent: true, opacity: 0 });
    const line = new THREE.Line(geo, mat);

    const branchLines = [];
    if (branches > 0) {
        for (let b = 0; b < branches; b++) {
            const startIdx = 1 + Math.floor(Math.random() * (segments - 2));
            const branchStart = points[startIdx].clone();
            const branchEnd = branchStart.clone().add(
                new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5)
            );
            const branchGeo = new THREE.BufferGeometry().setFromPoints([branchStart, branchEnd]);
            const branchLine = new THREE.Line(branchGeo, new THREE.LineBasicMaterial({ color: '#dd88ff', transparent: true, opacity: 0 }));
            branchLines.push(branchLine);
            line.add(branchLine);
        }
    }

    return line;
}

function flashLightning() {
    if (!skyMesh) return;
    if (lightningFlashLight) {
        lightningFlashLight.intensity = 3;
    } else {
        lightningFlashLight = new THREE.PointLight('#ffddff', 3, 25);
        lightningFlashLight.position.set(0, 10, 0);
        state.scene.add(lightningFlashLight);
    }

    if (lightningGroup) {
        lightningGroup.children.forEach(l => {
            l.material.opacity = 0;
        });
        lightningGroup.remove(...lightningGroup.children);
    }

    const boltCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < boltCount; i++) {
        const start = new THREE.Vector3((Math.random() - 0.5) * 8, 12 + Math.random() * 4, (Math.random() - 0.5) * 8);
        const end = new THREE.Vector3((Math.random() - 0.5) * 10, 2 + Math.random() * 6, (Math.random() - 0.5) * 10);
        const bolt = createLightningBolt(start, end, 2);
        lightningGroup.add(bolt);
    }

    const t = performance.now();
    const update = () => {
        const elapsed = (performance.now() - t) / 1000;
        const opacity = Math.max(0, 1 - elapsed * 3);
        lightningGroup.children.forEach(l => {
            l.material.opacity = opacity;
        });
        if (lightningFlashLight) lightningFlashLight.intensity = 3 * opacity;
        if (opacity > 0) {
            requestAnimationFrame(update);
        } else {
            if (lightningFlashLight) lightningFlashLight.intensity = 0;
        }
    };
    requestAnimationFrame(update);
}

function scheduleNextLightning() {
    if (!state.skyMesh) return;
    clearTimeout(lightningTimer);
    nextStrike = performance.now() + 5000 + Math.random() * 15000; // 5-20 sec
    const delay = nextStrike - performance.now();
    lightningTimer = setTimeout(() => {
        flashLightning();
        scheduleNextLightning();
    }, delay);
}

// ---------- PUBLIC API ----------
export function setupSky() {
    const geometry = new THREE.SphereGeometry(30, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        map: createDayTexture(),
        side: THREE.BackSide,
        depthWrite: false
    });
    skyMesh = new THREE.Mesh(geometry, material);
    skyMesh.name = 'skySphere';
    state.scene.add(skyMesh);
    state.skyMesh = skyMesh;
    state.environmentMeshes.push(skyMesh);

    lightningGroup = new THREE.Group();
    state.scene.add(lightningGroup);
    state.environmentMeshes.push(lightningGroup);

    scheduleNextLightning();
    return skyMesh;
}

export function setDaySky() {
    if (state.skyMesh && state.skyMesh.material) {
        state.skyMesh.material.map = createDayTexture();
        state.skyMesh.material.needsUpdate = true;
    }
}

export function setNightSky() {
    if (state.skyMesh && state.skyMesh.material) {
        state.skyMesh.material.map = createNightTexture();
        state.skyMesh.material.needsUpdate = true;
    }
}

export function triggerLightning() {
    flashLightning();
}

export function updateSkyLightning(delta) {
    // Lightning scheduling is timer-based; nothing needed here.
}