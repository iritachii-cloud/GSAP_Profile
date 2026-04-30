import * as THREE from 'three';
import { state } from './state.js';
import { createFreeCamera, updateFreeCamera, setFreeCameraEnabled, setFreeCameraTarget, disposeFreeCamera, getFreeControls } from './camera360.js';
import { updateTracking, handleTrackWheel, getTrackDistance } from './chtrack.js';
import { updateFPV } from './fpvch.js';

let currentMode = 'free';
let freeControls = null;
let wheelHandler = null;

export function initCameraManager(camera, canvas, config) {
    freeControls = createFreeCamera(camera, canvas, config);
    currentMode = 'free';
    setFreeCameraEnabled(true);

    // Global wheel listener (only active when mode is 'track')
    wheelHandler = (e) => {
        if (state.cameraMode === 'track') {
            e.preventDefault();
            handleTrackWheel(e);
        }
    };
    canvas.addEventListener('wheel', wheelHandler, { passive: false });
}

export function setCameraMode(mode) {
    if (!freeControls) return;

    // Disable current mode
    if (currentMode === 'free') {
        setFreeCameraEnabled(false);
    }

    // Enable new mode
    switch (mode) {
        case 'free':
            setFreeCameraEnabled(true);
            // reset target to character position (or keep last)
            if (state.claw) {
                const pos = state.claw.position;
                setFreeCameraTarget(pos.x, pos.y + 0.5, pos.z);
            }
            break;
        case 'track':
            // nothing extra to enable; updateTracking will handle
            break;
        case 'fpv':
            // nothing extra
            break;
    }

    currentMode = mode;
    state.cameraMode = mode;
}

export function updateCamera() {
    const claw = state.claw;
    const camera = state.camera;
    if (!camera) return;

    switch (currentMode) {
        case 'free':
            updateFreeCamera();
            break;
        case 'track':
            updateTracking(camera, claw);
            break;
        case 'fpv':
            updateFPV(camera, claw);
            break;
    }
}

export function disposeCameraManager() {
    disposeFreeCamera();
    if (wheelHandler) {
        state.renderer?.domElement?.removeEventListener('wheel', wheelHandler);
        wheelHandler = null;
    }
}

export function getCurrentMode() {
    return currentMode;
}