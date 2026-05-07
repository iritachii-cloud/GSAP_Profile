import * as THREE from 'three';
import { state } from './state.js';

let lanternGroup = null;
let pointLight = null;
let fillLight = null;

// ---------- CREATE THE COMPANION DRONE ----------
function createLanternModel() {
    const group = new THREE.Group();

    // ** Central crystal (warm glowing core) **
    const crystalMat = new THREE.MeshStandardMaterial({
        color: '#ffcc88',
        emissive: '#ff8822',
        emissiveIntensity: 2.0,
        roughness: 0.2,
        metalness: 0.3
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), crystalMat);
    crystal.position.y = 0.05;
    group.add(crystal);

    // ** Floating rings (spinning) **
    const ringMat = new THREE.MeshStandardMaterial({
        color: '#ffaa66',
        emissive: '#ff6622',
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.7
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 24), ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.05;
    group.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 24), ringMat);
    ring2.rotation.z = Math.PI / 3;
    ring2.position.y = 0.05;
    group.add(ring2);

    // ** Tiny wings / fins (like a cute insect drone) **
    const finMat = new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.5, metalness: 0.8 });
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 6), finMat);
        fin.position.set(Math.cos(angle) * 0.15, 0.02, Math.sin(angle) * 0.15);
        fin.rotation.x = -0.3;
        fin.rotation.z = angle;
        group.add(fin);
    }

    // ** Point light (warm, wide) **
    pointLight = new THREE.PointLight('#ffcc88', 2.5, 7);
    pointLight.castShadow = false;
    pointLight.position.y = 0.05;
    group.add(pointLight);

    group.scale.setScalar(0.4);
    return group;
}

// ---------- PUBLIC API ----------
export function createLantern() {
    if (lanternGroup) return;
    lanternGroup = createLanternModel();
    state.scene.add(lanternGroup);
    state.lantern = lanternGroup;

    // Fill light for Layla's face (warm, soft)
    fillLight = new THREE.SpotLight('#ffccaa', 2.5, 6, Math.PI / 5, 0.4, 1.5);
    fillLight.castShadow = false;
    fillLight.visible = false;
    state.scene.add(fillLight);
    state.scene.add(fillLight.target);
}

export function showLantern() {
    if (lanternGroup) lanternGroup.visible = true;
    if (fillLight) fillLight.visible = true;
}

export function hideLantern() {
    if (lanternGroup) lanternGroup.visible = false;
    if (fillLight) fillLight.visible = false;
}

// ---------- UPDATE POSITION (call each frame) ----------
export function updateLanternPosition() {
    if (!state.claw || !lanternGroup) return;

    const charPos = state.claw.position.clone();

    // Lantern drones behind and above Layla
    const offset = new THREE.Vector3(-0.4, 1.0, 1.8);
    offset.applyEuler(new THREE.Euler(0, state.claw.rotation.y, 0));
    lanternGroup.position.copy(charPos).add(offset);

    // ---- Animation: spin rings and gentle bob ----
    const t = performance.now() * 0.001;
    lanternGroup.children.forEach(child => {
        if (child.isMesh && child.geometry.type === 'TorusGeometry') {
            child.rotation.z += 0.5 * 0.016; // rotates slowly each frame
        }
    });
    // soft bobbing
    lanternGroup.position.y += Math.sin(t * 3) * 0.02;

    // ---- Update fill light ----
    if (fillLight) {
        const facePos = charPos.clone();
        facePos.y += 0.2 + Math.sin(t * 2) * 0.05;
        const frontOffset = new THREE.Vector3(0, 0.9, 1.0);
        frontOffset.applyEuler(new THREE.Euler(0, state.claw.rotation.y, 0));
        fillLight.position.copy(charPos).add(frontOffset);
        fillLight.target.position.copy(facePos);
        fillLight.target.updateMatrixWorld();
    }
}