import * as THREE from 'three';
import { state } from './state.js';

let sparkGroup = null;

// -------- TEXTURE (soft glowing dot) --------
function createGlowTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, 'rgba(255,255,200,0.9)');
    grad.addColorStop(0.7, 'rgba(255,150,50,0.3)');
    grad.addColorStop(1, 'rgba(255,100,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// -------- START SPARKS --------
export function startFireflies() {
    if (sparkGroup) return;

    const count = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        // Random positions in a large box around the world
        positions[i * 3] = (Math.random() - 0.5) * 22;
        positions[i * 3 + 1] = Math.random() * 4 + 0.2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 22;

        // Warm colors: reddish, orange, gold
        const r = 1.0;
        const g = 0.35 + Math.random() * 0.4;   // 0.35 - 0.75
        const b = 0.1 + Math.random() * 0.2;    // 0.1 - 0.3
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const texture = createGlowTexture('#ffaa44');
    const material = new THREE.PointsMaterial({
        size: 0.18,
        map: texture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
    });

    sparkGroup = new THREE.Points(geometry, material);
    state.scene.add(sparkGroup);
    state.fireflies = sparkGroup;   // keep reference for compatibility

    // Animation loop
    function move() {
        if (!sparkGroup) return;
        const pos = sparkGroup.geometry.attributes.position.array;
        const time = Date.now() * 0.001;

        for (let i = 0; i < count; i++) {
            // Gentle floating upward and sideways
            pos[i * 3 + 1] += 0.002 + Math.sin(time + i) * 0.001;
            pos[i * 3] += Math.cos(time * 0.7 + i) * 0.003;
            pos[i * 3 + 2] += Math.sin(time * 0.5 + i) * 0.003;

            // Reset if they float too high or go out of bounds
            if (pos[i * 3 + 1] > 4.5) {
                pos[i * 3 + 1] = 0.2;
                pos[i * 3] = (Math.random() - 0.5) * 22;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
            }
        }
        sparkGroup.geometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(move);
    }
    move();
}

// -------- STOP SPARKS --------
export function stopFireflies() {
    if (sparkGroup) {
        state.scene.remove(sparkGroup);
        sparkGroup.geometry.dispose();
        sparkGroup.material.dispose();
        sparkGroup = null;
        state.fireflies = null;
    }
}