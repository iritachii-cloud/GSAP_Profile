import * as THREE from 'three';
import { state } from './state.js';

function createDayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0,   '#87CEEB');   // light blue top
    gradient.addColorStop(0.6, '#FFF0F5');   // soft pinkish white
    gradient.addColorStop(1,   '#F0FFF0');   // pale green horizon
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Tiny cloud dots
    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random()*0.3})`;
        ctx.beginPath();
        ctx.arc(Math.random()*512, Math.random()*350, 3+Math.random()*8, 0, Math.PI*2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    // Canvas draws in sRGB; tag it so Three.js won't double-convert on mobile.
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createNightTexture() {
    const canvas = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0,   '#0a0a2e');
    gradient.addColorStop(0.5, '#1a1a4e');
    gradient.addColorStop(1,   '#2a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Stars
    for (let i = 0; i < 300; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random()*0.5})`;
        ctx.fillRect(Math.random()*512, Math.random()*350, 1.5, 1.5);
    }
    // Moon
    ctx.fillStyle = '#FFFFF0';
    ctx.beginPath();
    ctx.arc(400, 100, 30, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#FFFFE0';
    ctx.beginPath();
    ctx.arc(400, 100, 25, 0, Math.PI*2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export function setupSky() {
    const geometry = new THREE.SphereGeometry(30, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        map:       createDayTexture(),
        side:      THREE.BackSide,
        depthWrite: false
    });
    const sky  = new THREE.Mesh(geometry, material);
    sky.name   = 'skySphere';
    state.scene.add(sky);
    state.skyMesh = sky;
    state.environmentMeshes.push(sky);
    return sky;
}

export function setDaySky() {
    if (state.skyMesh?.material) {
        state.skyMesh.material.map = createDayTexture();
        state.skyMesh.material.needsUpdate = true;
    }
}

export function setNightSky() {
    if (state.skyMesh?.material) {
        state.skyMesh.material.map = createNightTexture();
        state.skyMesh.material.needsUpdate = true;
    }
}