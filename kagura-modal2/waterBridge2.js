import * as THREE from 'three';
import { state } from './state.js';

export function setupWaterBridge() {
    // River
    const riverWidth = 2.0;
    const riverLength = 40;
    const riverGeo = new THREE.PlaneGeometry(riverLength, riverWidth);
    const riverMat = new THREE.MeshStandardMaterial({
        color: '#1a8cff',
        roughness: 0.15,
        metalness: 0.5,
        transparent: true,
        opacity: 0.75,
        emissive: new THREE.Color('#001122'),
        emissiveIntensity: 0.15
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.03, 0);
    river.receiveShadow = true;
    state.scene.add(river);
    state.environmentMeshes.push(river);

    // Animated water texture stored in state.waterMaterial for animation loop
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 64);
    gradient.addColorStop(0, '#4da6ff');
    gradient.addColorStop(0.5, '#80ccff');
    gradient.addColorStop(1, '#1a8cff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${Math.random()*0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.random()*256, Math.random()*64);
        ctx.lineTo(Math.random()*256, Math.random()*64);
        ctx.stroke();
    }
    const riverTexture = new THREE.CanvasTexture(canvas);
    riverTexture.wrapS = THREE.RepeatWrapping;
    riverTexture.wrapT = THREE.RepeatWrapping;
    riverTexture.repeat.set(3, 1);
    riverMat.map = riverTexture;
    state.waterMaterial = riverMat;

    // River obstacles (except bridge area)
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: -6, xTo: -1.2, zFrom: -riverWidth/2, zTo: riverWidth/2 }
    });
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: 1.2, xTo: 6, zFrom: -riverWidth/2, zTo: riverWidth/2 }
    });

    // Bridge
    const bridgeGroup = new THREE.Group();
    const plankMat = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.7 });
    for (let i = -3; i <= 3; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.3), plankMat);
        plank.position.set(i * 0.4, 0.08, 0);
        plank.castShadow = true;
        plank.receiveShadow = true;
        bridgeGroup.add(plank);
    }
    const railMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.8 });
    const railGeo = new THREE.BoxGeometry(3.2, 0.08, 0.1);
    const railLeft = new THREE.Mesh(railGeo, railMat);
    railLeft.position.set(0, 0.2, -0.5);
    railLeft.castShadow = true;
    bridgeGroup.add(railLeft);
    const railRight = new THREE.Mesh(railGeo, railMat);
    railRight.position.set(0, 0.2, 0.5);
    railRight.castShadow = true;
    bridgeGroup.add(railRight);

    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: '#4a2f1a', roughness: 0.9 });
    for (let x of [-1.4, 0, 1.4]) {
        const postL = new THREE.Mesh(postGeo, postMat);
        postL.position.set(x, -0.12, -0.55);
        postL.castShadow = true;
        bridgeGroup.add(postL);
        const postR = new THREE.Mesh(postGeo, postMat);
        postR.position.set(x, -0.12, 0.55);
        postR.castShadow = true;
        bridgeGroup.add(postR);
    }

    bridgeGroup.position.set(0, 0, 0);
    state.scene.add(bridgeGroup);
    state.environmentMeshes.push(bridgeGroup);
}