import * as THREE from 'three';
import { state } from './state.js';
import { createPetalSprite } from './utils.js';

// We'll keep the falling petals system accessible from `environment.js` via exports.
export function setupCherryTree() {
    const treeGroup = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4c3b', roughness: 0.7 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    function addBranch(radius, length, pos, rotY, rotZ) {
        const branchGeo = new THREE.CylinderGeometry(radius*0.8, radius, length, 6);
        const branch = new THREE.Mesh(branchGeo, trunkMat);
        branch.position.copy(pos);
        branch.rotation.set(0, rotY, rotZ);
        branch.castShadow = true;
        branch.receiveShadow = true;
        treeGroup.add(branch);
    }

    addBranch(0.15, 1.5, new THREE.Vector3(0.6, 2.4, 0.3), 0.3, 0.6);
    addBranch(0.15, 1.4, new THREE.Vector3(-0.5, 2.3, -0.4), -0.5, 0.8);
    addBranch(0.12, 1.2, new THREE.Vector3(0.2, 2.7, 0.7), 0.8, 0.4);
    addBranch(0.12, 1.3, new THREE.Vector3(-0.7, 2.6, -0.1), -0.2, 0.5);

    const blossomMat = new THREE.MeshStandardMaterial({
        color: '#ff99bb',
        emissive: '#331122',
        roughness: 0.6
    });
    for (let i = 0; i < 700; i++) {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random()*0.12, 4, 4), blossomMat);
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.5 + Math.random() * 2;
        const height = 2.8 + Math.random() * 2.5;
        sphere.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        treeGroup.add(sphere);
    }

    treeGroup.position.set(0, 0, -4);
    state.scene.add(treeGroup);
    state.environmentMeshes.push(treeGroup);

    // Obstacle
    state.obstacles.push({
        type: 'circle',
        data: { x: 0, z: -4, radius: 5.5 }
    });

    // Start petal system
    startFallingPetals(treeGroup);
}

// ────────────────────────────────────────────
// Petal system (continuous, always on)
// ────────────────────────────────────────────
export function startFallingPetals(treeGroup) {
    if (state.petalSystem) return;
    const count = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const petalData = [];

    const treePos = treeGroup.position;
    const spawnRadius = 2.5;
    const spawnHeight = 2.5;
    const groundY = 0;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * spawnRadius;
        const x = treePos.x + Math.cos(angle) * r;
        const z = treePos.z + Math.sin(angle) * r;
        const y = treePos.y + spawnHeight + Math.random() * 3;
        positions[i*3] = x;
        positions[i*3+1] = y;
        positions[i*3+2] = z;
        petalData.push({
            speed: 0.3 + Math.random() * 0.7,
            sway: 0.5 + Math.random() * 1.0,
            phase: Math.random() * Math.PI * 2
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: '#ff99bb',
        size: 0.08,
        map: (() => {
            const c = document.createElement('canvas');
            c.width = 16; c.height = 16;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#ff99bb';
            ctx.beginPath(); ctx.ellipse(8,8,6,3,0,0,Math.PI*2); ctx.fill();
            return new THREE.CanvasTexture(c);
        })(),
        transparent: true,
        opacity: 0.8,
        blending: THREE.NormalBlending,
        depthWrite: false
    });
    const particles = new THREE.Points(geometry, material);
    state.scene.add(particles);
    state.environmentMeshes.push(particles);

    state.petalSystem = { particles, geometry, petalData, material, count, groundY, treePos, spawnRadius, spawnHeight };
    state.petalActive = true;
}

export function updateFallingPetals(delta) {
    if (!state.petalSystem || !state.petalActive) return;
    const { geometry, petalData, count, groundY, treePos, spawnRadius, spawnHeight } = state.petalSystem;
    const positions = geometry.attributes.position.array;
    const time = performance.now() * 0.001;

    for (let i = 0; i < count; i++) {
        const data = petalData[i];
        let idx = i * 3;
        let y = positions[idx+1] - data.speed * delta;
        let x = positions[idx] + Math.sin(time * data.sway + data.phase) * delta * 0.2;
        let z = positions[idx+2] + Math.cos(time * data.sway + data.phase) * delta * 0.2;

        if (y < groundY) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * spawnRadius;
            x = treePos.x + Math.cos(angle) * r;
            z = treePos.z + Math.sin(angle) * r;
            y = treePos.y + spawnHeight + Math.random() * 3;
        }

        positions[idx] = x;
        positions[idx+1] = y;
        positions[idx+2] = z;
    }
    geometry.attributes.position.needsUpdate = true;
}

export function stopFallingPetals() {
    state.petalActive = false;
    if (state.petalSystem) {
        const { geometry, material, particles } = state.petalSystem;
        if (particles.parent) state.scene.remove(particles);
        geometry.dispose();
        if (material.map) material.map.dispose();
        material.dispose();
        state.petalSystem = null;
    }
}