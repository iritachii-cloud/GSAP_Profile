import * as THREE from 'three';
import { state } from './state.js';

// ========== POSITION ==========
export const SHRINE_X = 15.0;
export const SHRINE_Z = 15.0;
export const GATE_OPEN_HALF = 1.2;

// ========== ANIMATION REFS ==========
let labGroup = null;
let gears = [];
let bots = [];
let smokeSystems = [];
let turbine = null;
let fencePillars = [];
let fenceArcs = [];

// ========== SETUP ==========
export function setupEnergyShrine() {
    buildDomeLab();
    buildPlasmaFence();
    registerObstacles();
    startExteriorDetails();
}

// ========== DOME LABORATORY (grounded) ==========
function buildDomeLab() {
    const group = new THREE.Group();
    labGroup = group;

    const panelMat = new THREE.MeshStandardMaterial({
        color: '#3a4a6a', roughness: 0.5, metalness: 0.6
    });
    const glassMat = new THREE.MeshStandardMaterial({
        color: '#88ddff', emissive: '#224466', emissiveIntensity: 0.5,
        roughness: 0.2, metalness: 0.9, transparent: true, opacity: 0.7
    });

    const domeRadius = 5.5;
    const domeHeight = 7.0;

    // Dome (hemisphere, equator at y=0)
    const domeGeo = new THREE.SphereGeometry(domeRadius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, panelMat);
    dome.position.y = 0;
    dome.castShadow = true;
    dome.receiveShadow = true;
    group.add(dome);

    // Rib arches
    const ribCount = 12;
    const ribMat = new THREE.MeshStandardMaterial({ color: '#8a9aa8', roughness: 0.4, metalness: 0.85 });
    for (let i = 0; i < ribCount; i++) {
        const angle = (i / ribCount) * Math.PI * 2;
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(angle) * domeRadius * 0.7, domeHeight * 0.7, Math.sin(angle) * domeRadius * 0.7),
            new THREE.Vector3(Math.cos(angle) * domeRadius, domeHeight, Math.sin(angle) * domeRadius)
        );
        const points = curve.getPoints(12);
        const ribGeo = new THREE.BufferGeometry().setFromPoints(points);
        const ribLine = new THREE.Line(ribGeo, new THREE.LineBasicMaterial({ color: '#88aaff' }));
        group.add(ribLine);
    }

    // Foundation ring (grounded)
    const baseHeight = 1.5;
    const baseGeo = new THREE.CylinderGeometry(domeRadius + 0.2, domeRadius + 0.3, baseHeight, 16);
    const base = new THREE.Mesh(baseGeo, panelMat);
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    group.add(base);

    // Windows
    const winGeo = new THREE.CircleGeometry(0.5, 12);
    for (let i = 0; i < 20; i++) {
        const win = new THREE.Mesh(winGeo, glassMat);
        const phi = Math.random() * Math.PI / 2 - 0.2;
        const theta = Math.random() * Math.PI * 2;
        const r = domeRadius * 0.85;
        win.position.set(
            Math.sin(phi) * Math.cos(theta) * r,
            Math.cos(phi) * r,
            Math.sin(phi) * Math.sin(theta) * r
        );
        win.lookAt(new THREE.Vector3(0, win.position.y, 0));
        group.add(win);
    }

    // Windmill turbine on top
    const turbineGroup = new THREE.Group();
    const mastHeight = 2.0;
    const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.25, mastHeight, 8),
        new THREE.MeshStandardMaterial({ color: '#5a6a7a', roughness: 0.6, metalness: 0.9 })
    );
    mast.position.y = mastHeight / 2;
    turbineGroup.add(mast);

    const bladeMat = new THREE.MeshStandardMaterial({ color: '#ccaa88', roughness: 0.4, metalness: 0.7 });
    for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.2), bladeMat);
        blade.position.y = 1.2;
        blade.rotation.x = Math.PI / 2;
        blade.rotation.z = (i / 4) * Math.PI * 2;
        turbineGroup.add(blade);
    }

    const gearGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 12);
    const gear = new THREE.Mesh(gearGeo, new THREE.MeshStandardMaterial({ color: '#aa8855', roughness: 0.3, metalness: 0.8 }));
    gear.position.y = 1.25;
    turbineGroup.add(gear);

    const spokeMat = new THREE.LineBasicMaterial({ color: '#ffcc88' });
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spokeGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 1.25, 0),
            new THREE.Vector3(Math.cos(angle) * 0.4, 1.25, Math.sin(angle) * 0.4)
        ]);
        turbineGroup.add(new THREE.Line(spokeGeo, spokeMat));
    }

    turbineGroup.position.set(0, domeHeight, 0);
    group.add(turbineGroup);
    turbine = turbineGroup;

    // Central orb
    const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16),
        new THREE.MeshStandardMaterial({ color: '#ff88ff', emissive: '#ff44aa', emissiveIntensity: 0.7 })
    );
    orb.position.set(0, domeHeight - 0.5, 0);
    group.add(orb);

    group.position.set(SHRINE_X, 0, SHRINE_Z);
    state.scene.add(group);
    state.environmentMeshes.push(group);
}

// ========== PLASMA FENCE ==========
function buildPlasmaFence() {
    const pillarCount = 20;
    const fenceRadius = 8.5;
    const pillarHeight = 3.0;
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#2a3a4a', roughness: 0.5, metalness: 0.9 });
    const plasmaMat = new THREE.LineBasicMaterial({ color: '#ff44aa', linewidth: 1, transparent: true, opacity: 0.9 });

    fencePillars = [];
    fenceArcs = [];

    for (let i = 0; i < pillarCount; i++) {
        const angle = (i / pillarCount) * Math.PI * 2;
        const x = SHRINE_X + Math.cos(angle) * fenceRadius;
        const z = SHRINE_Z + Math.sin(angle) * fenceRadius;

        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.35, pillarHeight, 8),
            pillarMat
        );
        pillar.position.set(x, pillarHeight / 2, z);
        pillar.castShadow = true;
        state.scene.add(pillar);
        state.environmentMeshes.push(pillar);
        fencePillars.push(pillar);

        if (i < pillarCount - 1) {
            const nextAngle = ((i + 1) / pillarCount) * Math.PI * 2;
            const nx = SHRINE_X + Math.cos(nextAngle) * fenceRadius;
            const nz = SHRINE_Z + Math.sin(nextAngle) * fenceRadius;
            const arcPoints = [];
            const segments = 10;
            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                const mx = x + (nx - x) * t;
                const mz = z + (nz - z) * t;
                const sag = 0.3 * Math.sin(t * Math.PI);
                arcPoints.push(new THREE.Vector3(mx, pillarHeight - 0.3 + sag, mz));
            }
            const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
            const arcLine = new THREE.Line(arcGeo, plasmaMat);
            state.scene.add(arcLine);
            state.environmentMeshes.push(arcLine);
            fenceArcs.push(arcLine);
        }
    }
}

// ========== EXTERIOR DETAILS (bots, smoke, gears) ==========
function startExteriorDetails() {
    // Fast security bots patrolling around the dome
    const botColors = ['#ff88aa', '#aaff88', '#ffcc88', '#88aaff'];
    const botCount = 6;
    const patrolRadius = 7.0;
    const patrolCenter = new THREE.Vector3(SHRINE_X, 0, SHRINE_Z);

    for (let i = 0; i < botCount; i++) {
        const angle = (i / botCount) * Math.PI * 2;
        const x = patrolCenter.x + Math.cos(angle) * patrolRadius;
        const z = patrolCenter.z + Math.sin(angle) * patrolRadius;

        const bot = createBot(botColors[i % botColors.length]);
        bot.position.set(x, 0, z);
        bot.userData = {
            patrolRadius,
            patrolCenter,
            angle,
            speed: 2.5 + Math.random() * 1.0,
            // bodyMat and eyeMat are stored in the bot's own userData inside createBot
        };
        // Merge with createBot's userData
        Object.assign(bot.userData, bot.userData); // lol, but we'll assign properly
        state.scene.add(bot);
        state.environmentMeshes.push(bot);
        bots.push(bot);
    }

    // Smoke systems
    const smokeTex = createSmokeTexture();
    for (let i = 0; i < 6; i++) {
        const x = SHRINE_X + (Math.random() - 0.5) * 10;
        const z = SHRINE_Z + (Math.random() - 0.5) * 8;
        const y = 0.4 + Math.random() * 2;
        const count = 40;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        for (let p = 0; p < count; p++) {
            positions[p * 3] = x + (Math.random() - 0.5) * 1.5;
            positions[p * 3 + 1] = y + Math.random() * 0.5;
            positions[p * 3 + 2] = z + (Math.random() - 0.5) * 1.5;
            speeds[p] = 0.3 + Math.random() * 0.6;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            map: smokeTex,
            color: '#88aacc',
            size: 0.35,
            transparent: true,
            opacity: 0.45,
            blending: THREE.NormalBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        const particles = new THREE.Points(geo, mat);
        state.scene.add(particles);
        state.environmentMeshes.push(particles);
        smokeSystems.push({ particles, geo, speeds, count, baseY: y, x, z });
    }

    // Extra gears on ground
    const gearGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12);
    const gearMat = new THREE.MeshStandardMaterial({ color: '#aa8855', roughness: 0.4, metalness: 0.8 });
    for (let i = 0; i < 4; i++) {
        const x = SHRINE_X + (Math.random() - 0.5) * 7;
        const z = SHRINE_Z + (Math.random() - 0.5) * 5;
        const gear = new THREE.Mesh(gearGeo, gearMat);
        gear.position.set(x, 0.15, z);
        gear.rotation.z = Math.PI / 2;
        state.scene.add(gear);
        state.environmentMeshes.push(gear);
        gears.push({ mesh: gear, axis: 'z', speed: (Math.random() - 0.5) * 0.8 });
    }
}

function createBot(color) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.2,
        metalness: 0.85,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.0
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 0.35, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.8 })
    );
    head.position.y = 0.7;
    head.castShadow = true;
    group.add(head);

    const eyeMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 0.0,
        roughness: 0.1,
        metalness: 0.1
    });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8), eyeMat);
    eye.position.set(0.18, 0.75, 0.22);
    group.add(eye);

    const wheelMat = new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 6);
    [-0.18, 0.18].forEach(x => {
        [-0.2, 0.2].forEach(z => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(x, 0.1, z);
            group.add(wheel);
        });
    });

    // Store materials for day/night toggle
    group.userData = {
        bodyMat,
        eyeMat,
        bodyBaseColor: new THREE.Color(color),
    };

    return group;
}

function createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,0.7)');
    grad.addColorStop(0.5, 'rgba(200,200,255,0.3)');
    grad.addColorStop(1, 'rgba(150,150,200,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ========== DAY/NIGHT TOGGLE ==========
export function setBotTimeOfDay(time) {
    bots.forEach(bot => {
        const { bodyMat, eyeMat, bodyBaseColor } = bot.userData;
        if (!bodyMat || !eyeMat) return;

        if (time === 'night') {
            eyeMat.emissiveIntensity = 8.0;
            eyeMat.emissive.set('#ffffff');
            eyeMat.color.set('#e0f0ff');

            bodyMat.emissiveIntensity = 1.2;
            bodyMat.emissive.copy(bodyBaseColor);
            bodyMat.roughness = 0.05;
            bodyMat.metalness = 1.0;
        } else {
            eyeMat.emissiveIntensity = 0.0;
            eyeMat.emissive.set('#ffffff');
            eyeMat.color.set('#ffffff');

            bodyMat.emissiveIntensity = 0.0;
            bodyMat.emissive.copy(bodyBaseColor);
            bodyMat.roughness = 0.2;
            bodyMat.metalness = 0.85;
        }
    });
}

// ========== OBSTACLES ==========
function registerObstacles() {
    state.obstacles.push({
        type: 'rect',
        data: {
            xFrom: SHRINE_X - 5.5,
            xTo: SHRINE_X + 5.5,
            zFrom: SHRINE_Z - 5.5,
            zTo: SHRINE_Z + 5.5
        }
    });
}

// ========== UPDATE LOOP ==========
export function updateLabAnimations(delta) {
    // Turbine spin
    if (turbine) {
        turbine.rotation.y += delta * 1.2;
    }

    // Gears rotate
    gears.forEach(g => {
        if (g.axis === 'z') g.mesh.rotation.z += delta * g.speed;
        else g.mesh.rotation.y += delta * g.speed;
    });

    // Security bots orbit
    bots.forEach(bot => {
        const ud = bot.userData;
        if (!ud) return;
        ud.angle += ud.speed * delta;
        if (ud.angle > Math.PI * 2) ud.angle -= Math.PI * 2;

        bot.position.x = ud.patrolCenter.x + Math.cos(ud.angle) * ud.patrolRadius;
        bot.position.z = ud.patrolCenter.z + Math.sin(ud.angle) * ud.patrolRadius;

        const tangent = new THREE.Vector3(-Math.sin(ud.angle), 0, Math.cos(ud.angle));
        bot.rotation.y = Math.atan2(tangent.x, tangent.z);
    });

    // Smoke rises
    smokeSystems.forEach(s => {
        const positions = s.geo.attributes.position.array;
        for (let p = 0; p < s.count; p++) {
            const idx = p * 3 + 1;
            positions[idx] += s.speeds[p] * delta;
            if (positions[idx] > s.baseY + 4) {
                positions[idx] = s.baseY;
                positions[p * 3] = s.x + (Math.random() - 0.5) * 1.5;
                positions[p * 3 + 2] = s.z + (Math.random() - 0.5) * 1.5;
            }
        }
        s.geo.attributes.position.needsUpdate = true;
    });

    // Plasma arcs pulse
    const t = performance.now() * 0.001;
    fenceArcs.forEach((arc, i) => {
        if (arc.material) {
            arc.material.opacity = 0.6 + Math.sin(t * 4 + i) * 0.3;
        }
    });
}