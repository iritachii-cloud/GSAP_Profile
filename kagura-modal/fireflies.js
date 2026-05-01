import * as THREE from 'three';
import { state } from './state.js';

let fireflyGroup = null;

function createFireflyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFF88';
    ctx.beginPath();
    ctx.arc(8,8,5,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#FFAA00';
    ctx.beginPath();
    ctx.arc(8,8,2.5,0,Math.PI*2);
    ctx.fill();
    const _ffTex = new THREE.CanvasTexture(canvas);
    _ffTex.colorSpace = THREE.SRGBColorSpace;
    return _ffTex;
}

export function startFireflies() {
    if (fireflyGroup) return;
    const count = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i*3] = (Math.random() - 0.5) * 10;
        positions[i*3+1] = Math.random() * 3;
        positions[i*3+2] = (Math.random() - 0.5) * 10;
        colors[i*3] = 1; colors[i*3+1] = 0.9; colors[i*3+2] = 0.3;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
        size: 0.15,
        map: createFireflyTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
    });
    fireflyGroup = new THREE.Points(geometry, material);
    state.scene.add(fireflyGroup);
    state.fireflies = fireflyGroup;
    // animate random floating
    function move() {
        if (!fireflyGroup) return;
        const pos = fireflyGroup.geometry.attributes.position.array;
        const time = Date.now() * 0.001;
        for (let i = 0; i < count; i++) {
            pos[i*3] += Math.sin(time + i) * 0.003;
            pos[i*3+1] += Math.cos(time + i) * 0.002;
            pos[i*3+2] += Math.cos(time + i*0.7) * 0.003;
            if (pos[i*3+1] > 3) pos[i*3+1] = 0;
            if (pos[i*3+1] < 0) pos[i*3+1] = 3;
        }
        fireflyGroup.geometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(move);
    }
    move();
}

export function stopFireflies() {
    if (fireflyGroup) {
        state.scene.remove(fireflyGroup);
        fireflyGroup.geometry.dispose();
        fireflyGroup.material.dispose();
        fireflyGroup = null;
        state.fireflies = null;
    }
}