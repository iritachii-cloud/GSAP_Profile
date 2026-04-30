import * as THREE from 'three';
import { state } from './state.js';

let cloudGroup = null;
let cloudData = [];

function createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(32, 32, 25, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, 36, 15, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(44, 36, 15, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(32, 20, 12, 0, Math.PI*2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}

export function startClouds() {
    if (cloudGroup) return;
    const count = 40;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const texture = createCloudTexture();
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        map: texture,
        size: 1.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.NormalBlending,
        depthWrite: false
    });

    for (let i = 0; i < count; i++) {
        positions[i*3] = (Math.random() - 0.5) * 20;
        positions[i*3+1] = 6 + Math.random() * 6;
        positions[i*3+2] = (Math.random() - 0.5) * 20;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    cloudGroup = new THREE.Points(geometry, material);
    state.scene.add(cloudGroup);
    state.clouds = cloudGroup;
    // Animate
    function move() {
        if (!cloudGroup) return;
        const pos = cloudGroup.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            pos[i*3] += 0.002; // drift
            if (pos[i*3] > 10) pos[i*3] = -10;
        }
        cloudGroup.geometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(move);
    }
    move();
}

export function stopClouds() {
    if (cloudGroup) {
        state.scene.remove(cloudGroup);
        cloudGroup.geometry.dispose();
        cloudGroup.material.dispose();
        cloudGroup = null;
        state.clouds = null;
    }
}