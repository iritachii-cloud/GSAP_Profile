import * as THREE from 'three';
import { state } from './state.js';

// ========== COLOR PALETTES ==========
const DAY_PYLON = {
    crystal: new THREE.Color('#44aaff'),
    emissive: new THREE.Color('#003366'),
    emissiveI: 0.35,
    metal: new THREE.Color('#8a9aa8'),
    copper: new THREE.Color('#c97e4a'),
    glowLine: new THREE.Color('#88ccff'),
    sparkColor: '#44aaff',
    sparkSize: 0.12,
    sparkOpac: 0.85,
    particleColor: new THREE.Color('#44aaff'),
};

const NIGHT_PYLON = {
    crystal: new THREE.Color('#cc44ff'),
    emissive: new THREE.Color('#220044'),
    emissiveI: 0.9,
    metal: new THREE.Color('#6a5a7a'),
    copper: new THREE.Color('#aa6688'),
    glowLine: new THREE.Color('#ff66ff'),
    sparkColor: '#ff88ff',
    sparkSize: 0.10,
    sparkOpac: 0.95,
    particleColor: new THREE.Color('#cc66ff'),
};

// ========== GLOBAL REFS FOR DAY/NIGHT TRANSITIONS ==========
let allCrystalMats = [];
let allGlowLineMats = [];
let allMetalMats = [];
let allCopperMats = [];
let sparkleTexDay = null;
let sparkleTexNight = null;

// ========== SPARKLE TEXTURE (electric flash shape) ==========
function createSparkleTexture(color) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);

    // Electric zigzag flash in center
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(10, 14);
    ctx.lineTo(20, 14);
    ctx.lineTo(14, 26);
    ctx.stroke();

    // Glow halo
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(16, 15, 5, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ========== BUILD ONE PYLON ==========
function buildPylon(scale = 1.0) {
    const group = new THREE.Group();

    // ---------- Metals ----------
    const metalMat = new THREE.MeshStandardMaterial({
        color: DAY_PYLON.metal.clone(),
        roughness: 0.5,
        metalness: 0.85
    });
    allMetalMats.push(metalMat);

    const copperMat = new THREE.MeshStandardMaterial({
        color: DAY_PYLON.copper.clone(),
        roughness: 0.4,
        metalness: 0.7
    });
    allCopperMats.push(copperMat);

    // Main pole (central rod with rings)
    const poleH = 4.5 * scale;
    const poleR = 0.1 * scale;
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(poleR, poleR, poleH, 8),
        metalMat
    );
    pole.position.y = poleH / 2;
    pole.castShadow = true;
    group.add(pole);

    // Energy rings along the pole
    const ringCount = 6;
    for (let i = 0; i < ringCount; i++) {
        const ringMat = new THREE.MeshStandardMaterial({
            color: DAY_PYLON.glowLine.clone(),
            emissive: DAY_PYLON.emissive.clone(),
            emissiveIntensity: DAY_PYLON.emissiveI,
            roughness: 0.3,
            metalness: 0.9
        });
        allGlowLineMats.push(ringMat);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(poleR * 2.5, 0.04 * scale, 8, 24),
            ringMat
        );
        ring.position.y = poleH * (0.2 + (i / (ringCount - 1)) * 0.6);
        ring.rotation.x = Math.PI / 2 + Math.sin(i) * 0.1;
        ring.castShadow = true;
        group.add(ring);
    }

    // ---------- Branch arms (energy conduits) ----------
    function addConduitArm(startY, length, angleY, angleZ, depth, thick) {
        if (depth === 0) return;
        const armMat = new THREE.MeshStandardMaterial({
            color: DAY_PYLON.copper.clone(),
            roughness: 0.4,
            metalness: 0.8
        });
        allCopperMats.push(armMat);

        const arm = new THREE.Mesh(
            new THREE.CylinderGeometry(thick * 0.5 * scale, thick * scale, length * scale, 6),
            armMat
        );
        arm.position.y = length * scale / 2;
        const pivot = new THREE.Group();
        pivot.position.set(
            Math.sin(angleY) * 0.5 * scale,
            startY,
            Math.cos(angleY) * 0.5 * scale
        );
        pivot.rotation.set(0, angleY, angleZ);
        pivot.add(arm);
        group.add(pivot);

        // Small energy node at the tip
        const tipNode = new THREE.Mesh(
            new THREE.SphereGeometry(0.12 * scale, 6),
            new THREE.MeshStandardMaterial({
                color: DAY_PYLON.crystal.clone(),
                emissive: DAY_PYLON.emissive.clone(),
                emissiveIntensity: DAY_PYLON.emissiveI,
                roughness: 0.2,
                metalness: 0.9
            })
        );
        tipNode.position.y = length * scale;
        pivot.add(tipNode);
        allCrystalMats.push(tipNode.material);

        // Add sub-branches (wire arcs)
        for (let i = 0; i < 2; i++) {
            addConduitArm(
                startY + Math.cos(angleZ) * length * scale * 0.8,
                length * 0.55,
                angleY + (i - 0.5) * 1.2,
                angleZ + 0.5,
                depth - 1,
                thick * 0.5
            );
        }
    }

    const armCount = 4;
    for (let i = 0; i < armCount; i++) {
        const ay = (i / armCount) * Math.PI * 2 + Math.random() * 0.5;
        addConduitArm(poleH * 0.7, 1.6, ay, 0.7 + Math.random() * 0.3, 2, 0.1);
    }

    // ---------- Central crystal orb at top ----------
    const crystalMat = new THREE.MeshStandardMaterial({
        color: DAY_PYLON.crystal.clone(),
        emissive: DAY_PYLON.emissive.clone(),
        emissiveIntensity: DAY_PYLON.emissiveI,
        roughness: 0.2,
        metalness: 0.9,
        transparent: true,
        opacity: 0.92
    });
    allCrystalMats.push(crystalMat);

    const crystalOrb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.45 * scale, 1),
        crystalMat
    );
    crystalOrb.position.y = poleH + 0.4 * scale;
    crystalOrb.castShadow = true;
    group.add(crystalOrb);

    // ---------- Floating energy motes around the pylon ----------
    const moteCount = Math.floor(40 * scale);
    for (let i = 0; i < moteCount; i++) {
        const moteMat = new THREE.MeshStandardMaterial({
            color: DAY_PYLON.crystal.clone(),
            emissive: DAY_PYLON.emissive.clone(),
            emissiveIntensity: DAY_PYLON.emissiveI * 0.7,
            roughness: 0.3,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8
        });
        allCrystalMats.push(moteMat);

        const size = (0.06 + Math.random() * 0.1) * scale;
        const mote = new THREE.Mesh(new THREE.SphereGeometry(size, 4), moteMat);
        const angle = Math.random() * Math.PI * 2;
        const tilt = Math.random() * Math.PI * 0.6;
        const radius = (1.2 + Math.random() * 2.0) * scale;
        const height = poleH * 0.5 + Math.random() * (poleH * 0.5);
        mote.position.set(
            Math.sin(angle) * Math.sin(tilt) * radius,
            height,
            Math.cos(angle) * Math.sin(tilt) * radius
        );
        group.add(mote);
    }

    return group;
}

// ========== PYLON PLACEMENT CONFIG ==========
const PYLON_CONFIGS = [
    [-14, -15, 1.8, 4.5], [0, -16, 2.0, 5.0], [14, -15, 1.7, 4.2],
    [-12, -8, 1.3, 3.5], [-16, -3, 1.5, 3.8], [-10, 5, 1.2, 3.2],
    [-15, 10, 1.6, 4.0], [11, -7, 1.4, 3.5], [16, 2, 1.5, 3.8],
    [12, 8, 1.1, 3.0], [17, 14, 1.6, 4.0], [-8, 13, 1.0, 2.8],
    [6, 15, 1.2, 3.2], [-14, 16, 1.4, 3.6], [14, -10, 1.0, 2.8],
    [-5, -9, 0.7, 2.0], [7, -6, 0.65, 1.8], [-7, 7, 0.75, 2.0], [5, 11, 0.6, 1.7],
];

// ========== SETUP ==========
export function setupEnergyTree() {
    allCrystalMats = [];
    allGlowLineMats = [];
    allMetalMats = [];
    allCopperMats = [];
    state.energyTrees = [];

    sparkleTexDay = createSparkleTexture(DAY_PYLON.sparkColor);
    sparkleTexNight = createSparkleTexture(NIGHT_PYLON.sparkColor);

    PYLON_CONFIGS.forEach(([x, z, scale, obsRadius]) => {
        const pylon = buildPylon(scale);
        pylon.position.set(x, 0, z);
        state.scene.add(pylon);
        state.environmentMeshes.push(pylon);
        state.obstacles.push({ type: 'circle', data: { x, z, radius: obsRadius } });
        state.energyTrees.push({ x, z, scale });
    });

    startFallingSparkles(sparkleTexDay);
}

// ========== DAY / NIGHT TRANSITION ==========
let transitionProgress = 0;
let transitionTarget = 0;
let transitionActive = false;

export function setTreeTimeOfDay(time) {
    transitionTarget = time === 'night' ? 1 : 0;
    transitionActive = true;
}

function lerpColor(a, b, t, out) {
    out.r = a.r + (b.r - a.r) * t;
    out.g = a.g + (b.g - a.g) * t;
    out.b = a.b + (b.b - a.b) * t;
}

function updatePylonTransition(delta) {
    if (!transitionActive) return;
    const speed = delta * 0.5;
    const diff = transitionTarget - transitionProgress;
    if (Math.abs(diff) < 0.002) {
        transitionProgress = transitionTarget;
        transitionActive = false;
    } else {
        transitionProgress += diff * Math.min(1, speed * 8);
    }
    const t = transitionProgress;
    const tmpColor = new THREE.Color();

    // Crystals
    allCrystalMats.forEach(mat => {
        lerpColor(DAY_PYLON.crystal, NIGHT_PYLON.crystal, t, tmpColor);
        mat.color.copy(tmpColor);
        lerpColor(DAY_PYLON.emissive, NIGHT_PYLON.emissive, t, tmpColor);
        mat.emissive.copy(tmpColor);
        mat.emissiveIntensity = DAY_PYLON.emissiveI + (NIGHT_PYLON.emissiveI - DAY_PYLON.emissiveI) * t;
    });

    // Glow lines
    allGlowLineMats.forEach(mat => {
        lerpColor(DAY_PYLON.glowLine, NIGHT_PYLON.glowLine, t, tmpColor);
        mat.color.copy(tmpColor);
        mat.emissive.copy(tmpColor);
        mat.emissiveIntensity = DAY_PYLON.emissiveI + (NIGHT_PYLON.emissiveI - DAY_PYLON.emissiveI) * t;
    });

    // Metals
    allMetalMats.forEach(mat => {
        lerpColor(DAY_PYLON.metal, NIGHT_PYLON.metal, t, tmpColor);
        mat.color.copy(tmpColor);
    });

    allCopperMats.forEach(mat => {
        lerpColor(DAY_PYLON.copper, NIGHT_PYLON.copper, t, tmpColor);
        mat.color.copy(tmpColor);
    });

    // Particle system
    if (state.petalSystem) {
        const { material } = state.petalSystem;
        lerpColor(DAY_PYLON.particleColor, NIGHT_PYLON.particleColor, t, tmpColor);
        material.color.copy(tmpColor);
        material.size = DAY_PYLON.sparkSize + (NIGHT_PYLON.sparkSize - DAY_PYLON.sparkSize) * t;
        material.opacity = DAY_PYLON.sparkOpac + (NIGHT_PYLON.sparkOpac - DAY_PYLON.sparkOpac) * t;
        if (t > 0.5 && material.map === sparkleTexDay) {
            material.map = sparkleTexNight;
            material.needsUpdate = true;
        } else if (t <= 0.5 && material.map === sparkleTexNight) {
            material.map = sparkleTexDay;
            material.needsUpdate = true;
        }
    }
}

// ========== FALLING SPARKLES (electric flashes) ==========
const BASE_SPARKLES_PER_PYLON = 80;

export function startFallingSparkles(sparkleTex) {
    if (state.petalSystem) return;
    const pylons = state.energyTrees || [];
    const count = pylons.reduce((s, t) => s + Math.floor(BASE_SPARKLES_PER_PYLON * t.scale), 0);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sparkleData = [];

    let idx = 0;
    pylons.forEach(pylon => {
        const n = Math.floor(BASE_SPARKLES_PER_PYLON * pylon.scale);
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 2.5 * pylon.scale;
            const startY = 4.0 * pylon.scale + Math.random() * 3.0 * pylon.scale;
            positions[idx * 3] = pylon.x + Math.cos(angle) * r;
            positions[idx * 3 + 1] = startY;
            positions[idx * 3 + 2] = pylon.z + Math.sin(angle) * r;
            sparkleData.push({
                pylonX: pylon.x,
                pylonZ: pylon.z,
                scale: pylon.scale,
                speed: 0.3 + Math.random() * 1.0,
                sway: 0.5 + Math.random() * 1.2,
                swayAmp: 0.2 + Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 3.0,
                maxY: 4.0 * pylon.scale + Math.random() * 3.0 * pylon.scale
            });
            idx++;
        }
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        map: sparkleTex || sparkleTexDay,
        color: DAY_PYLON.particleColor.clone(),
        size: DAY_PYLON.sparkSize,
        transparent: true,
        opacity: DAY_PYLON.sparkOpac,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    state.scene.add(particles);
    state.environmentMeshes.push(particles);

    state.petalSystem = {
        particles, geometry, sparkleData,
        material, count, groundY: 0,
        baseOpacity: DAY_PYLON.sparkOpac
    };
    state.petalActive = true;
}

// ========== UPDATE EVERY FRAME ==========
export function updateFallingPetals(delta) {
    if (!state.petalSystem || !state.petalActive) return;
    updatePylonTransition(delta);

    const { geometry, sparkleData, count, material } = state.petalSystem;
    const positions = geometry.attributes.position.array;
    const time = performance.now() * 0.001;

    const isAI = state.currentAnim === 'ai';
    const speedMult = isAI ? 2.0 : 1.0;
    if (isAI) {
        material.size = (state.timeOfDay === 'night' ? NIGHT_PYLON.sparkSize : DAY_PYLON.sparkSize) * 1.4;
    }

    for (let i = 0; i < count; i++) {
        const d = sparkleData[i];
        const i3 = i * 3;
        const swayX = Math.sin(time * d.sway + d.phase) * d.swayAmp;
        const swayZ = Math.cos(time * d.sway * 0.7 + d.phase) * d.swayAmp * 0.6;

        // Slight random drift
        positions[i3] += swayX * delta;
        positions[i3 + 1] -= d.speed * speedMult * delta;
        positions[i3 + 2] += swayZ * delta;

        // If fallen below ground, reset to top
        if (positions[i3 + 1] < 0) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 2.5 * d.scale;
            positions[i3] = d.pylonX + Math.cos(angle) * r;
            positions[i3 + 1] = d.maxY;
            positions[i3 + 2] = d.pylonZ + Math.sin(angle) * r;

            // Flash effect at reset (quick burst of light)
            d.flash = 1.0;
        }

        // Flash fading
        if (d.flash && d.flash > 0) {
            d.flash -= delta * 4;
            material.opacity = d.flash > 0 ? 1.0 : material.opacity;
        }
    }
    geometry.attributes.position.needsUpdate = true;
}

// ========== STOP / CLEANUP ==========
export function stopFallingSparkles() {
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