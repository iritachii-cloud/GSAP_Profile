import * as THREE from 'three';
import { state } from './state.js';

let lanternGroup = null;
let lanternLight = null;
let characterFillLight = null;   // dedicated fill light that always faces the character

function createLanternModel() {
    const group = new THREE.Group();
    // body (cylinder)
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.25, 16),
        new THREE.MeshStandardMaterial({ color: '#cc8800', emissive: '#62deee', emissiveIntensity: 1.2, roughness: 0.3 })
    );
    body.position.y = 0.1;
    group.add(body);
    // top
    const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: '#cc8800', roughness: 0.5 })
    );
    top.position.y = 0.28;
    group.add(top);
    // ring on top
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.02, 8, 16),
        new THREE.MeshStandardMaterial({ color: '#aa6600' })
    );
    ring.position.y = 0.38;
    group.add(ring);

    // Main lantern point light – boosted intensity & range
    lanternLight = new THREE.PointLight('#6ccbeb', 3.5, 6);
    lanternLight.castShadow = false;   // no extra shadow cost
    lanternLight.position.y = 0.1;
    group.add(lanternLight);
    group.scale.setScalar(0.3); 
    return group;
}

export function createLantern() {
    if (lanternGroup) return;
    lanternGroup = createLanternModel();
    state.scene.add(lanternGroup);
    state.lantern = lanternGroup;

    // A dedicated SpotLight that always aims at the character's face from slightly above/front.
    // This ensures the face is properly lit regardless of lantern position.
    characterFillLight = new THREE.SpotLight('#ffd580', 2.5, 5, Math.PI / 5, 0.4, 1.5);
    characterFillLight.castShadow = false;
    characterFillLight.visible = false;
    state.scene.add(characterFillLight);
    state.scene.add(characterFillLight.target);
}

export function showLantern() {
    if (lanternGroup) lanternGroup.visible = true;
    if (characterFillLight) characterFillLight.visible = true;
}

export function hideLantern() {
    if (lanternGroup) lanternGroup.visible = false;
    if (characterFillLight) characterFillLight.visible = false;
}

export function updateLanternPosition() {
    if (!state.claw || !lanternGroup) return;

    const charPos = state.claw.position.clone();

    // Lantern hovers just above and beside the character's head
    const offset = new THREE.Vector3(-0.4, 0.7, 1.8);
    offset.applyEuler(new THREE.Euler(0, state.claw.rotation.y, 0));
    lanternGroup.position.copy(charPos).add(offset);

    // Position the fill spotlight slightly in front of & above the character, aimed at face
    if (characterFillLight) {
        const facePos = charPos.clone();
        facePos.y += 0.2;   // roughly face/head height

        // Light source sits ~1 unit in front of character, at eye level + a bit
        const frontOffset = new THREE.Vector3(0, 1.1, 0.8);
        frontOffset.applyEuler(new THREE.Euler(0, state.claw.rotation.y, 0));
        characterFillLight.position.copy(charPos).add(frontOffset);

        // Aim at face
        characterFillLight.target.position.copy(facePos);
        characterFillLight.target.updateMatrixWorld();
    }
}