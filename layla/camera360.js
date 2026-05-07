import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let controls = null;

/**
 * Creates a free (orbit) camera controller.
 * @param {THREE.Camera} camera - The camera to control.
 * @param {HTMLElement} canvas - The canvas element for events.
 * @param {Object} config - Optional { min, max } for zoom limits.
 * @returns {OrbitControls} The controls instance.
 */
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

/**
 * Updates the free camera (must be called every frame if damping is used).
 */
export function updateFreeCamera() {
    if (controls) {
        controls.update();
    }
}

/**
 * Enables or disables the free camera controls.
 * @param {boolean} enabled - Whether the controls should be active.
 */
export function setFreeCameraEnabled(enabled) {
    if (controls) {
        controls.enabled = enabled;
    }
}

/**
 * Sets the target point for the free camera.
 * @param {number} x - X coordinate.
 * @param {number} y - Y coordinate.
 * @param {number} z - Z coordinate.
 */
export function setFreeCameraTarget(x, y, z) {
    if (controls) {
        controls.target.set(x, y, z);
    }
}

/**
 * Disposes the free camera controls.
 */
export function disposeFreeCamera() {
    if (controls) {
        controls.dispose();
        controls = null;
    }
}

/**
 * Returns the current OrbitControls instance (if any).
 */
export function getFreeControls() {
    return controls;
}