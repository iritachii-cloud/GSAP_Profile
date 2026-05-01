import * as THREE from 'three';
import { state } from './state.js';

// ─── Constants (exported so toriiShrine / aiMode can read them) ───────────
export const RIVER_Z      = 0;       // centre-Z of river
export const RIVER_WIDTH  = 3.0;     // north-south extent
export const BRIDGE_HALF  = 1.2;     // half-width of bridge opening (bridge spans X ±1.2)
export const RIVER_LENGTH = 44;      // east-west extent

// ─── Lily state ───────────────────────────────────────────────────────────
let lilyGroup  = null;
let lilyLights = [];   // PointLight refs for night glow
let lilyPads   = [];   // mesh refs for opacity toggling

export function setupWaterBridge() {
    const riverWidth  = RIVER_WIDTH;
    const riverLength = RIVER_LENGTH;
    const bridgeHalf  = BRIDGE_HALF;
    const riverZ      = RIVER_Z;

    // ── River mesh ─────────────────────────────────────────────────────────
    const riverGeo = new THREE.PlaneGeometry(riverLength, riverWidth, 20, 4);
    const riverMat = new THREE.MeshStandardMaterial({
        color:             '#1a7acc',
        roughness:         0.1,
        metalness:         0.55,
        transparent:       true,
        opacity:           0.82,
        emissive:          new THREE.Color('#001833'),
        emissiveIntensity: 0.25
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x   = -Math.PI / 2;
    river.position.set(0, 0.03, riverZ);
    river.receiveShadow = true;
    state.scene.add(river);
    state.environmentMeshes.push(river);

    // Animated water texture
    const wCanvas = document.createElement('canvas');
    wCanvas.width  = 512;
    wCanvas.height = 128;
    const wCtx  = wCanvas.getContext('2d');
    const wGrad = wCtx.createLinearGradient(0, 0, 512, 0);
    wGrad.addColorStop(0,    '#2a80e6');
    wGrad.addColorStop(0.35, '#5ab4ff');
    wGrad.addColorStop(0.7,  '#1a6acc');
    wGrad.addColorStop(1,    '#2a80e6');
    wCtx.fillStyle = wGrad;
    wCtx.fillRect(0, 0, 512, 128);
    // Ripple lines
    for (let i = 0; i < 120; i++) {
        wCtx.strokeStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.12})`;
        wCtx.lineWidth   = 0.8 + Math.random() * 1.2;
        wCtx.beginPath();
        const sy = Math.random() * 128;
        wCtx.moveTo(Math.random() * 512, sy);
        wCtx.bezierCurveTo(
            Math.random()*512, sy + (Math.random()-0.5)*20,
            Math.random()*512, sy + (Math.random()-0.5)*20,
            Math.random()*512, sy
        );
        wCtx.stroke();
    }

    const riverTex = new THREE.CanvasTexture(wCanvas);
    // Tag as sRGB so the renderer doesn't apply a second gamma conversion
    // (which would make the water look greenish on mobile).
    riverTex.colorSpace = THREE.SRGBColorSpace;
    riverTex.wrapS = THREE.RepeatWrapping;
    riverTex.wrapT = THREE.RepeatWrapping;
    riverTex.repeat.set(8, 1);
    riverMat.map = riverTex;
    state.waterMaterial = riverMat;

    // ── River obstacles (water = impassable; bridge gap at X ∈ [−1.2, +1.2] is open) ──
    const halfZ = riverWidth / 2;

    // West block
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: -riverLength/2, xTo: -bridgeHalf, zFrom: riverZ - halfZ, zTo: riverZ + halfZ }
    });
    // East block
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: bridgeHalf, xTo: riverLength/2, zFrom: riverZ - halfZ, zTo: riverZ + halfZ }
    });

    // ── Bridge ─────────────────────────────────────────────────────────────
    const bridgeGroup = new THREE.Group();
    const plankMat = new THREE.MeshStandardMaterial({ color: '#7a4f28', roughness: 0.75 });

    for (let i = -3; i <= 3; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, riverWidth + 0.15), plankMat);
        plank.position.set(i * 0.37, 0.09, riverZ);
        plank.castShadow = plank.receiveShadow = true;
        bridgeGroup.add(plank);
    }

    const railMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.8 });
    [-halfZ + 0.1, halfZ - 0.1].forEach(zRail => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(bridgeHalf * 2 + 0.2, 0.09, 0.1), railMat);
        rail.position.set(0, 0.22, riverZ + zRail);
        rail.castShadow = true;
        bridgeGroup.add(rail);
    });

    const postGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: '#4a2f1a', roughness: 0.9 });
    for (const px of [-bridgeHalf + 0.1, 0, bridgeHalf - 0.1]) {
        for (const pz of [riverZ - halfZ + 0.05, riverZ + halfZ - 0.05]) {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(px, 0.1, pz);
            post.castShadow = true;
            bridgeGroup.add(post);
        }
    }

    state.scene.add(bridgeGroup);
    state.environmentMeshes.push(bridgeGroup);

    // ── Water Lilies ───────────────────────────────────────────────────────
    buildWaterLilies(riverZ, halfZ, bridgeHalf);
}

// ─── Build water lily decorations ─────────────────────────────────────────
function buildWaterLilies(riverZ, halfZ, bridgeHalf) {
    if (lilyGroup) return;
    lilyGroup  = new THREE.Group();
    lilyLights = [];
    lilyPads   = [];

    const positions = [
        [-4.5, riverZ - 0.4], [-3.0, riverZ + 0.5], [-5.8, riverZ + 0.3],
        [-7.0, riverZ - 0.5], [-2.0, riverZ - 0.3], [-6.5, riverZ + 0.7],
        [-8.5, riverZ - 0.2],
        [ 3.2, riverZ + 0.4], [ 4.8, riverZ - 0.5], [ 6.5, riverZ + 0.3],
        [ 8.0, riverZ - 0.4], [ 5.5, riverZ + 0.7], [ 9.5, riverZ - 0.3],
    ];

    const lilyPadMat = new THREE.MeshStandardMaterial({
        color:             '#2d7a2d',
        roughness:         0.7,
        emissive:          new THREE.Color('#0a2a0a'),
        emissiveIntensity: 0.15
    });
    const flowerMat = new THREE.MeshStandardMaterial({
        color:             '#ffe8f0',
        emissive:          new THREE.Color('#ff6090'),
        emissiveIntensity: 0.15,
        roughness:         0.4
    });

    positions.forEach(([lx, lz]) => {
        const group = new THREE.Group();
        group.position.set(lx, 0.055, lz);

        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.3, 0.03, 12),
            lilyPadMat.clone()
        );
        pad.receiveShadow = true;
        group.add(pad);
        lilyPads.push(pad);

        const notch = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.04, 0.34),
            new THREE.MeshStandardMaterial({ color: '#1a5c1a' })
        );
        notch.position.set(0.16, 0, 0);
        group.add(notch);

        const petalCount = 6;
        for (let p = 0; p < petalCount; p++) {
            const angle = (p / petalCount) * Math.PI * 2;
            const petal = new THREE.Mesh(
                new THREE.SphereGeometry(0.07, 6, 4),
                flowerMat.clone()
            );
            petal.scale.set(1, 0.5, 1.6);
            petal.position.set(
                Math.cos(angle) * 0.09,
                0.04 + Math.random() * 0.02,
                Math.sin(angle) * 0.09
            );
            petal.rotation.y = angle;
            group.add(petal);
            lilyPads.push(petal);
        }

        const stamen = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 6, 4),
            new THREE.MeshStandardMaterial({
                color:             '#ffdd33',
                emissive:          new THREE.Color('#aa6600'),
                emissiveIntensity: 0.4
            })
        );
        stamen.position.y = 0.08;
        group.add(stamen);
        lilyPads.push(stamen);

        const glow = new THREE.PointLight('#88ffcc', 0, 1.8);
        glow.position.set(0, 0.15, 0);
        group.add(glow);
        lilyLights.push(glow);

        lilyGroup.add(group);
    });

    state.scene.add(lilyGroup);
    state.environmentMeshes.push(lilyGroup);
}

// ─── Called by dayNightManager when time changes ───────────────────────────
export function setLilyTimeOfDay(time) {
    if (!lilyGroup) return;

    if (time === 'day') {
        lilyPads.forEach(m => {
            if (m.material) {
                if (m.material.color.getHexString().startsWith('2d7a') ||
                    m.material.color.getHexString().startsWith('1a5c')) {
                    m.material.emissiveIntensity = 0.1;
                } else {
                    m.material.emissiveIntensity = 0.15;
                }
            }
        });
        lilyLights.forEach(l => { l.intensity = 0; });
    } else {
        lilyPads.forEach(m => {
            if (m.material) {
                m.material.emissive          = new THREE.Color('#66ffcc');
                m.material.emissiveIntensity = 0.6;
            }
        });
        lilyLights.forEach(l => { l.intensity = 1.2 + Math.random() * 0.4; });
    }
}

// ─── Gentle lily bob & night twinkle, call every frame ────────────────────
export function updateWaterLilies(delta) {
    if (!lilyGroup || !lilyLights.length) return;
    if (state.timeOfDay !== 'night') return;

    const t = performance.now() * 0.001;
    lilyLights.forEach((l, i) => {
        l.intensity = 1.0 + Math.sin(t * 1.8 + i * 1.3) * 0.35;
    });
}