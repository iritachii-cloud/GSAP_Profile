import * as THREE from 'three';
import { state } from './state.js';

let trackDistance = 4.0;
const minDistance = 1.5;
const maxDistance = 10.0;
const heightOffset = 1.2;

export function setTrackDistance(delta) {
    trackDistance = Math.min(maxDistance, Math.max(minDistance, trackDistance + delta));
}

export function getTrackDistance() {
    return trackDistance;
}

export function updateTracking(camera, target) {
    if (!target) return;

    const charPos = target.position.clone();
    const rotY = target.rotation.y;
    const offset = new THREE.Vector3(
        Math.sin(rotY) * trackDistance,
        heightOffset,
        Math.cos(rotY) * trackDistance
    );
    camera.position.copy(charPos).add(offset);
    camera.lookAt(charPos.x, charPos.y + 0.4, charPos.z);
}

export function handleTrackWheel(event) {
    const delta = event.deltaY > 0 ? 0.5 : -0.5;
    setTrackDistance(delta);
}