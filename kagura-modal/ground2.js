import * as THREE from 'three';
import { state } from './state.js';
import { createPetalSprite } from './utils.js';

function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const length = 4 + Math.random() * 12;
        const shade = 30 + Math.random() * 40;
        ctx.strokeStyle = `rgb(${shade},${shade*1.8},${shade*0.6})`;
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random()-0.5)*2, y - length);
        ctx.stroke();
    }
    for (let i = 0; i < 200; i++) {
        const px = Math.random() * 512;
        const py = Math.random() * 512;
        ctx.fillStyle = `rgba(255,54,94,${0.2 + Math.random()*0.3})`;
        ctx.beginPath();
        ctx.ellipse(px, py, 3 + Math.random()*6, 2 + Math.random()*4, Math.random()*Math.PI, 0, Math.PI*2);
        ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    return texture;
}

export function setupGround() {
    const groundGeo = new THREE.PlaneGeometry(12, 12);
    const groundMat = new THREE.MeshStandardMaterial({
        map: createGrassTexture(),
        roughness: 0.9,
        metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    state.scene.add(ground);
    state.environmentMeshes.push(ground);

    // fallen petals (static)
    const group = new THREE.Group();
    for (let i = 0; i < 150; i++) {
        const petal = createPetalSprite('#ff365e', 0.08 + Math.random() * 0.06);
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 4;
        petal.position.set(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius);
        petal.rotation.z = Math.random() * Math.PI;
        group.add(petal);
    }
    state.scene.add(group);
    state.environmentMeshes.push(group);
}