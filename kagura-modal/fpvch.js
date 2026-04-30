import * as THREE from 'three';
import { state } from './state.js';

const eyeHeight = 0.75;   // relative to character's base (adjust based on model)

export function updateFPV(camera, target) {
    if (!target) return;

    // Position camera at character's eye position
    const pos = target.position.clone();
    pos.y += eyeHeight;
    camera.position.copy(pos);

    // Copy character's rotation – so the view turns with the character
    camera.rotation.copy(target.rotation);
}