import * as THREE from 'three';
import { state } from './state.js';

const eyeHeight = 0.4;  // raise/lower if camera clips into head

export function updateFPV(camera, target) {
    if (!target) return;

    // ── Eye position ──────────────────────────────────────────────────────
    const pos = target.position.clone();
    pos.y += eyeHeight;
    camera.position.copy(pos);

    // ── Forward direction ─────────────────────────────────────────────────
    // The walk code uses Math.atan2(dx, dz) to face toward a target,
    // meaning rotation.y = 0 → character faces +Z.
    // Forward vector from that convention:
    //   X = sin(rotY)
    //   Z = cos(rotY)
    const ry = target.rotation.y;
    const forward = new THREE.Vector3(
        Math.sin(ry),
        0,
        Math.cos(ry)
    );

    camera.lookAt(pos.clone().add(forward));
}