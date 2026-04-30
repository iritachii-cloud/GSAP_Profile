import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let controls = null;

export function createFreeCamera(camera, canvas, config = {}) {
    if (controls) {
        controls.dispose();
    }
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = config.min || 1;
    controls.maxDistance = config.max || 12;
    controls.target.set(0, 1, 0);
    controls.update();
    return controls;
}

export function updateFreeCamera() {
    if (controls) {
        controls.update();
    }
}

export function setFreeCameraEnabled(enabled) {
    if (controls) {
        controls.enabled = enabled;
    }
}

export function setFreeCameraTarget(x, y, z) {
    if (controls) {
        controls.target.set(x, y, z);
    }
}

export function disposeFreeCamera() {
    if (controls) {
        controls.dispose();
        controls = null;
    }
}

export function getFreeControls() {
    return controls;
}