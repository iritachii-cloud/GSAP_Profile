import * as THREE from 'three';
import { state } from './state.js';

// ─── Petal texture (shared) ────────────────────────────────────────────────
function createPetalTexture() {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    // Soft rounded petal shape
    ctx.fillStyle = '#ffaac8';
    ctx.beginPath();
    ctx.ellipse(16, 10, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(22, 18, 6, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, 18, 6, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16, 24, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Soft centre highlight
    ctx.fillStyle = 'rgba(255,220,235,0.5)';
    ctx.beginPath();
    ctx.ellipse(16, 16, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    return new THREE.CanvasTexture(c);
}

// ─── Build one cherry tree ─────────────────────────────────────────────────
function buildTree(scale = 1.0) {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a3828', roughness: 0.85 });

    // Main trunk — taller and tapered
    const trunkH = 3.2 * scale;
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * scale, 0.32 * scale, trunkH, 8),
        trunkMat
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Recursive branch builder
    function addBranch(startY, length, angleY, angleZ, depth, thick) {
        if (depth === 0) return;
        const branchGeo = new THREE.CylinderGeometry(
            thick * 0.6 * scale, thick * scale, length * scale, 6
        );
        const branch = new THREE.Mesh(branchGeo, trunkMat);
        // Pivot around start point
        branch.position.y = length * scale / 2;
        const pivot = new THREE.Group();
        pivot.position.set(
            Math.sin(angleY) * 0.3 * scale,
            startY,
            Math.cos(angleY) * 0.3 * scale
        );
        pivot.rotation.set(0, angleY, angleZ);
        pivot.add(branch);
        pivot.castShadow = true;
        group.add(pivot);

        // Sub-branches
        const childY = startY + Math.cos(angleZ) * length * scale;
        const spread = 0.35;
        for (let i = 0; i < 3; i++) {
            addBranch(
                childY,
                length * 0.68,
                angleY + (i - 1) * 1.1 + Math.random() * 0.4,
                angleZ + 0.3 + Math.random() * 0.2,
                depth - 1,
                thick * 0.55
            );
        }
    }

    // 5 primary branches from trunk top
    const branchCount = 5;
    for (let i = 0; i < branchCount; i++) {
        const ay = (i / branchCount) * Math.PI * 2 + Math.random() * 0.3;
        addBranch(trunkH * 0.75, 1.4, ay, 0.55 + Math.random() * 0.2, 2, 0.12);
    }

    // Blossom canopy — layered clusters
    const blossomMat = new THREE.MeshStandardMaterial({
        color: '#ffaac8',
        emissive: '#440022',
        emissiveIntensity: 0.3,
        roughness: 0.55,
        transparent: true,
        opacity: 0.92
    });

    const canopyCount = Math.floor(320 * scale);
    for (let i = 0; i < canopyCount; i++) {
        const size = (0.12 + Math.random() * 0.18) * scale;
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(size, 5, 4),
            blossomMat
        );
        const angle  = Math.random() * Math.PI * 2;
        const tilt   = Math.random() * Math.PI * 0.6;
        const radius = (1.2 + Math.random() * 1.8) * scale;
        const height = trunkH * 0.7 + (1.5 + Math.random() * 2.2) * scale;
        sphere.position.set(
            Math.sin(angle) * Math.sin(tilt) * radius,
            height,
            Math.cos(angle) * Math.sin(tilt) * radius
        );
        sphere.castShadow = true;
        group.add(sphere);
    }

    // Inner denser core
    for (let i = 0; i < Math.floor(120 * scale); i++) {
        const size = (0.08 + Math.random() * 0.1) * scale;
        const blob = new THREE.Mesh(
            new THREE.SphereGeometry(size, 4, 3),
            blossomMat
        );
        const angle  = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.0 * scale;
        const height = trunkH * 0.8 + Math.random() * 1.4 * scale;
        blob.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        group.add(blob);
    }

    return group;
}

// ─── Tree placement config ─────────────────────────────────────────────────
// Each entry: [x, z, scale, obstacleRadius]
// Avoids centre (character spawn), bridge area (X near 0, Z near 0), river (Z near 0)
const TREE_CONFIGS = [
    // Background row — large trees far north
    [ -14,  -15,  1.8,  4.5 ],
    [   0,  -16,  2.0,  5.0 ],
    [  14,  -15,  1.7,  4.2 ],

    // Mid left cluster
    [ -12,   -8,  1.3,  3.5 ],
    [ -16,   -3,  1.5,  3.8 ],
    [ -10,    5,  1.2,  3.2 ],
    [ -15,   10,  1.6,  4.0 ],

    // Mid right cluster
    [  11,   -7,  1.4,  3.5 ],
    [  16,    2,  1.5,  3.8 ],
    [  12,    8,  1.1,  3.0 ],
    [  17,   14,  1.6,  4.0 ],

    // South scatter
    [  -8,   13,  1.0,  2.8 ],
    [   6,   15,  1.2,  3.2 ],
    [ -14,   16,  1.4,  3.6 ],
    [  14,  -10,  1.0,  2.8 ],

    // Small foreground accent trees
    [  -5,   -9,  0.7,  2.0 ],
    [   7,   -6,  0.65, 1.8 ],
    [  -7,    7,  0.75, 2.0 ],
    [   5,   11,  0.6,  1.7 ],
];

// ─── Setup all trees ───────────────────────────────────────────────────────
export function setupCherryTree() {
    const petalTex = createPetalTexture();
    state.cherryTrees = [];   // store tree positions for petal spawning

    TREE_CONFIGS.forEach(([x, z, scale, obsRadius]) => {
        const tree = buildTree(scale);
        tree.position.set(x, 0, z);
        state.scene.add(tree);
        state.environmentMeshes.push(tree);

        // Register obstacle so character walks around trunks
        state.obstacles.push({
            type: 'circle',
            data: { x, z, radius: obsRadius }
        });

        state.cherryTrees.push({ x, z, scale });
    });

    // Start the global petal system covering all trees
    startFallingPetals(petalTex);
}

// ─── Global petal particle system ─────────────────────────────────────────
// Petals per tree proportional to scale. In AI mode count doubles.
const BASE_PETALS_PER_TREE = 60;

export function startFallingPetals(petalTex) {
    if (state.petalSystem) return;

    const trees  = state.cherryTrees || [];
    const count  = trees.reduce((s, t) => s + Math.floor(BASE_PETALS_PER_TREE * t.scale), 0);

    const geometry  = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const petalData = [];

    let idx = 0;
    trees.forEach(tree => {
        const n = Math.floor(BASE_PETALS_PER_TREE * tree.scale);
        for (let i = 0; i < n; i++) {
            const angle  = Math.random() * Math.PI * 2;
            const r      = Math.random() * 2.5 * tree.scale;
            const startY = 3.5 * tree.scale + Math.random() * 3.0 * tree.scale;
            positions[idx * 3]     = tree.x + Math.cos(angle) * r;
            positions[idx * 3 + 1] = startY;
            positions[idx * 3 + 2] = tree.z + Math.sin(angle) * r;
            petalData.push({
                treeX:   tree.x,
                treeZ:   tree.z,
                scale:   tree.scale,
                speed:   0.25 + Math.random() * 0.6,
                sway:    0.4  + Math.random() * 0.9,
                swayAmp: 0.15 + Math.random() * 0.25,
                phase:   Math.random() * Math.PI * 2,
                spin:    (Math.random() - 0.5) * 2.0,
                maxY:    3.5 * tree.scale + Math.random() * 3.0 * tree.scale
            });
            idx++;
        }
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        map:         petalTex || createPetalTexture(),
        size:        0.18,
        transparent: true,
        opacity:     0.85,
        blending:    THREE.NormalBlending,
        depthWrite:  false,
        sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    state.scene.add(particles);
    state.environmentMeshes.push(particles);

    state.petalSystem = {
        particles, geometry, petalData,
        material, count, groundY: 0,
        baseOpacity: 0.85
    };
    state.petalActive = true;
}

// ─── Update every frame ────────────────────────────────────────────────────
export function updateFallingPetals(delta) {
    if (!state.petalSystem || !state.petalActive) return;
    const { geometry, petalData, count, material } = state.petalSystem;
    const positions = geometry.attributes.position.array;
    const time = performance.now() * 0.001;

    // AI mode: petals fall faster and more opaque
    const isAI       = state.currentAnim === 'ai';
    const speedMult  = isAI ? 1.8 : 1.0;
    const targetOpac = isAI ? 1.0 : 0.85;
    material.opacity += (targetOpac - material.opacity) * delta * 2;
    material.size    = isAI ? 0.22 : 0.18;

    for (let i = 0; i < count; i++) {
        const d   = petalData[i];
        const i3  = i * 3;
        const swayX = Math.sin(time * d.sway + d.phase) * d.swayAmp;
        const swayZ = Math.cos(time * d.sway * 0.7 + d.phase) * d.swayAmp * 0.6;
        const spinX = Math.sin(time * d.spin + d.phase) * 0.008;

        positions[i3]     += swayX * delta + spinX;
        positions[i3 + 1] -= d.speed * speedMult * delta;
        positions[i3 + 2] += swayZ * delta;

        // Reset petal back to top of its tree when it hits the ground
        if (positions[i3 + 1] < 0) {
            const angle = Math.random() * Math.PI * 2;
            const r     = Math.random() * 2.5 * d.scale;
            positions[i3]     = d.treeX + Math.cos(angle) * r;
            positions[i3 + 1] = d.maxY;
            positions[i3 + 2] = d.treeZ + Math.sin(angle) * r;
        }
    }
    geometry.attributes.position.needsUpdate = true;
}

// ─── Stop / cleanup ────────────────────────────────────────────────────────
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