import * as THREE from 'three';
import { state } from './state.js';

// ========== CONSTANTS ==========
export const RIVER_Z = 0;
export const RIVER_WIDTH = 3.0;
export const BRIDGE_HALF = 1.2;
export const RIVER_LENGTH = 44;

// ========== RIVER STATE ==========
let riverGroup = null;
let energyNodes = [];    // floating glowing buoys
let steamVents = [];     // particle systems for steam

/**
 * Creates the energy coolant channel (river), metal grating bridge,
 * floating energy nodes, steam vents, and industrial pipes.
 */
export function setupWaterBridge() {
    const riverWidth = RIVER_WIDTH;
    const riverLength = RIVER_LENGTH;
    const bridgeHalf = BRIDGE_HALF;
    const riverZ = RIVER_Z;

    // ----- Energy channel mesh (transparent glowing fluid) -----
    const channelGeo = new THREE.PlaneGeometry(riverLength, riverWidth, 20, 4);
    const channelMat = new THREE.MeshStandardMaterial({
        color: '#1a4a8a',
        roughness: 0.1,
        metalness: 0.75,
        transparent: true,
        opacity: 0.78,
        emissive: new THREE.Color('#002244'),
        emissiveIntensity: 0.35
    });
    const channel = new THREE.Mesh(channelGeo, channelMat);
    channel.rotation.x = -Math.PI / 2;
    channel.position.set(0, 0.02, riverZ);
    channel.receiveShadow = true;
    state.scene.add(channel);
    state.environmentMeshes.push(channel);

    // Animated energy fluid texture (blue/cyan flowing lines)
    const fluidCanvas = document.createElement('canvas');
    fluidCanvas.width = 512;
    fluidCanvas.height = 128;
    const ctx = fluidCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#0a2a6a');
    grad.addColorStop(0.3, '#2a6aff');
    grad.addColorStop(0.6, '#4a8aff');
    grad.addColorStop(1, '#0a2a6a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    // Flowing energy streaks
    for (let i = 0; i < 80; i++) {
        ctx.strokeStyle = `rgba(100,180,255,${0.15 + Math.random() * 0.2})`;
        ctx.lineWidth = 1.5 + Math.random() * 2;
        ctx.beginPath();
        const sx = Math.random() * 512;
        const sy = Math.random() * 128;
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 50, sy + (Math.random() - 0.5) * 30, sx + 100, sy + (Math.random() - 0.5) * 30, sx + 140, sy);
        ctx.stroke();
    }

    // Glowing bubbles
    ctx.fillStyle = 'rgba(200,240,255,0.4)';
    for (let i = 0; i < 60; i++) {
        const bx = Math.random() * 512;
        const by = Math.random() * 128;
        ctx.beginPath();
        ctx.arc(bx, by, 2 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    const fluidTex = new THREE.CanvasTexture(fluidCanvas);
    fluidTex.colorSpace = THREE.SRGBColorSpace;
    fluidTex.wrapS = THREE.RepeatWrapping;
    fluidTex.wrapT = THREE.RepeatWrapping;
    fluidTex.repeat.set(8, 1);
    channelMat.map = fluidTex;
    state.waterMaterial = channelMat;

    // ----- River obstacles (impassable except bridge gap) -----
    const halfZ = riverWidth / 2;
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: -riverLength / 2, xTo: -bridgeHalf, zFrom: riverZ - halfZ, zTo: riverZ + halfZ }
    });
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: bridgeHalf, xTo: riverLength / 2, zFrom: riverZ - halfZ, zTo: riverZ + halfZ }
    });

    // ----- Metal grating bridge -----
    const bridgeGroup = new THREE.Group();
    const gratingMat = new THREE.MeshStandardMaterial({ color: '#5a7a8a', roughness: 0.6, metalness: 0.85 });
    const railMat = new THREE.MeshStandardMaterial({ color: '#4a5a6a', roughness: 0.4, metalness: 0.9 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#c97e4a', roughness: 0.5, metalness: 0.7 });

    // Grating planks
    for (let i = -3; i <= 3; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, riverWidth + 0.2), gratingMat);
        plank.position.set(i * 0.4, 0.08, riverZ);
        plank.castShadow = plank.receiveShadow = true;
        bridgeGroup.add(plank);
    }

    // Side rails (pipes)
    const halfGap = riverWidth / 2 + 0.1;
    [-halfGap, halfGap].forEach(zRail => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(bridgeHalf * 2 + 0.4, 0.1, 0.12), railMat);
        rail.position.set(0, 0.22, riverZ + zRail);
        rail.castShadow = true;
        bridgeGroup.add(rail);
    });

    // Pillars (metal posts)
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: '#2a3a4a', roughness: 0.7, metalness: 0.9 });
    for (const px of [-bridgeHalf + 0.1, 0, bridgeHalf - 0.1]) {
        for (const pz of [riverZ - halfGap + 0.05, riverZ + halfGap - 0.05]) {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(px, 0.12, pz);
            post.castShadow = true;
            bridgeGroup.add(post);
        }
    }

    // Decorative pipes along bridge sides (copper)
    for (const side of [-1, 1]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, bridgeHalf * 2 + 0.6, 8), pipeMat);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(0, 0.16, riverZ + side * (riverWidth / 2 + 0.05));
        bridgeGroup.add(pipe);
    }

    state.scene.add(bridgeGroup);
    state.environmentMeshes.push(bridgeGroup);

    // ----- Create river group for energy nodes and steam vents -----
    riverGroup = new THREE.Group();
    state.scene.add(riverGroup);
    state.environmentMeshes.push(riverGroup);

    // Floating energy nodes (buoys)
    buildEnergyNodes(riverZ, halfZ, bridgeHalf);
    // Steam vents (particle systems)
    buildSteamVents(riverZ, halfZ, bridgeHalf);
}

/**
 * Creates glowing energy buoys floating on the coolant river.
 */
function buildEnergyNodes(riverZ, halfZ, bridgeHalf) {
    energyNodes = [];
    const positions = [
        [-5.5, riverZ - 0.5], [-3.5, riverZ + 0.6], [-7.0, riverZ - 0.2],
        [-9.0, riverZ + 0.4], [-4.0, riverZ - 0.3], [-8.5, riverZ + 0.7],
        [3.5, riverZ + 0.5], [5.5, riverZ - 0.5], [7.5, riverZ + 0.3],
        [9.5, riverZ - 0.4], [6.0, riverZ + 0.7], [10.5, riverZ - 0.3],
    ];

    const nodeBaseMat = new THREE.MeshStandardMaterial({
        color: '#1a3a6a',
        roughness: 0.4,
        metalness: 0.8,
        emissive: new THREE.Color('#002244'),
        emissiveIntensity: 0.5
    });
    const nodeLightMat = new THREE.MeshStandardMaterial({
        color: '#88ccff',
        emissive: new THREE.Color('#3366cc'),
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.9
    });

    positions.forEach(([lx, lz]) => {
        const group = new THREE.Group();
        group.position.set(lx, 0.08, lz);

        // Buoy body (cylinder ring)
        const body = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 16), nodeBaseMat);
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.05;
        group.add(body);

        // Inner light core
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16), nodeLightMat);
        core.position.y = 0.05;
        group.add(core);

        // Small antennas
        const antennaMat = new THREE.MeshStandardMaterial({ color: '#c97e4a', roughness: 0.3, metalness: 0.7 });
        for (let a = 0; a < 4; a++) {
            const angle = (a / 4) * Math.PI * 2;
            const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), antennaMat);
            antenna.position.set(Math.cos(angle) * 0.32, 0.15, Math.sin(angle) * 0.32);
            group.add(antenna);
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4), nodeLightMat);
            tip.position.set(Math.cos(angle) * 0.32, 0.25, Math.sin(angle) * 0.32);
            group.add(tip);
        }

        // Point light (night only, controlled by setRiverTimeOfDay)
        const nodeLight = new THREE.PointLight('#88ccff', 0, 2.5);
        nodeLight.position.set(0, 0.15, 0);
        group.add(nodeLight);
        group._nodeLight = nodeLight; // store for toggling

        riverGroup.add(group);
        energyNodes.push(group);
    });
}

/**
 * Creates steam vent particles over the river.
 */
function buildSteamVents(riverZ, halfZ, bridgeHalf) {
    const ventCount = 14;
    steamVents = [];
    const steamTex = createSteamTexture();

    for (let i = 0; i < ventCount; i++) {
        const x = (Math.random() * 0.8 + 0.1) * RIVER_LENGTH - RIVER_LENGTH / 2;
        const riverWidth2 = halfZ * 2; // because halfZ = riverWidth/2
        const z = riverZ + (Math.random() - 0.5) * riverWidth2 * 0.8;
        // Avoid bridge area
        if (Math.abs(x) < bridgeHalf + 0.4 && Math.abs(z - riverZ) < halfZ - 0.1) {
            i--; // retry
            continue;
        }

        const particleCount = 30;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        for (let p = 0; p < particleCount; p++) {
            positions[p * 3] = (Math.random() - 0.5) * 0.4;
            positions[p * 3 + 1] = Math.random() * 0.8;
            positions[p * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            map: steamTex,
            color: '#88ccff',
            size: 0.15,
            transparent: true,
            opacity: 0.35,
            blending: THREE.NormalBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(geo, mat);
        particles.position.set(x, 0.05, z);
        riverGroup.add(particles);
        steamVents.push({ particles, geo, mat, baseY: 0.05, speed: 0.3 + Math.random() * 0.5, offset: Math.random() * Math.PI * 2 });
    }
}

function createSteamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(200,230,255,0.6)');
    grad.addColorStop(0.7, 'rgba(150,200,255,0.2)');
    grad.addColorStop(1, 'rgba(100,150,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/**
 * Toggles energy node lights and material emissions for day/night.
 * @param {string} time - 'day' or 'night'
 */
export function setLilyTimeOfDay(time) {
    if (!riverGroup) return;
    energyNodes.forEach(group => {
        const light = group._nodeLight;
        if (light) light.intensity = time === 'night' ? 1.5 : 0;
        group.traverse(obj => {
            if (obj.isMesh && obj.material.emissive) {
                obj.material.emissiveIntensity = time === 'night' ? 0.9 : 0.2;
            }
        });
    });

    steamVents.forEach(vent => {
        vent.mat.opacity = time === 'night' ? 0.55 : 0.25;
    });
}

/**
 * Updates energy node bobbing and steam particles every frame.
 * @param {number} delta - Time delta in seconds
 */
export function updateWaterLilies(delta) {
    if (!riverGroup) return;

    // Bob energy nodes
    const t = performance.now() * 0.001;
    energyNodes.forEach((group, i) => {
        group.position.y = 0.08 + Math.sin(t * 2.5 + i) * 0.03;
        // rotate floating rings
        group.children.forEach(child => {
            if (child.isMesh && child.geometry.type === 'TorusGeometry') {
                child.rotation.z += delta * 0.8;
            }
        });
    });

    // Animate steam vents
    steamVents.forEach(vent => {
        const positions = vent.geo.attributes.position.array;
        for (let p = 0; p < positions.length; p += 3) {
            positions[p + 1] += vent.speed * delta;
            if (positions[p + 1] > 1.2) {
                positions[p + 1] = 0;
            }
        }
        vent.geo.attributes.position.needsUpdate = true;
        vent.particles.position.y = vent.baseY + Math.sin(t * 2 + vent.offset) * 0.02;
    });
}