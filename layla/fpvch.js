import * as THREE from 'three';
import { state } from './state.js';

const eyeHeight = 0.6; // camera height relative to character's feet

/**
 * Updates camera for first‑person mode.
 * Places camera at the character's eye level and looks forward.
 * @param {THREE.Camera} camera - The camera to update.
 * @param {THREE.Object3D} target - The character (Layla) to follow.
 */
export function updateFPV(camera, target) {
    if (!target) return;

    // Eye position (character position + eye height)
    const pos = target.position.clone();
    pos.y += eyeHeight;
    camera.position.copy(pos);

    // Forward direction based on character's rotation
    // Assumes rotation.y = 0 means facing +Z
    const ry = target.rotation.y;
    const forward = new THREE.Vector3(
        Math.sin(ry),
        0,
        Math.cos(ry)
    );

    camera.lookAt(pos.clone().add(forward));
}