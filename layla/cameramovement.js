import * as THREE from 'three';
import { state } from './state.js';
import {
    createFreeCamera,
    updateFreeCamera,
    setFreeCameraEnabled,
    setFreeCameraTarget,
    disposeFreeCamera,
    getFreeControls,
} from './camera360.js';
import { updateFPV } from './fpvch.js';
import { showFPVHUD, hideFPVHUD, setFPVCharacter } from './fpvHUD.js';

// ----- Internal state -----
let currentMode = 'free';
let freeControls = null;

// Track mode variables
let trackDistance = 5;
let trackHeight = 2.5;          // fixed height above the ground
let trackTheta = 0;            // horizontal angle around the target
let trackTarget = new THREE.Vector3(0, 0.5, 0);
let pointerDown = false;
let lastPointerX = 0;
let lastPointerY = 0;
const ROTATE_SPEED = 0.005;
const ZOOM_SPEED = 0.01;

// FPV target model (who we are currently looking through)
let fpvTargetModel = null;      // THREE.Object3D

// ----- Pointer events for track mode -----
function onPointerDown(e) {
    pointerDown = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
}

function onPointerMove(e) {
    if (!pointerDown) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    if (currentMode === 'track') {
        // Rotate around the target
        trackTheta -= dx * ROTATE_SPEED;
        // Zoom in/out with vertical drag
        trackDistance = Math.max(2, Math.min(15, trackDistance + dy * ZOOM_SPEED));
    }
}

function onPointerUp() {
    pointerDown = false;
}

// ----- Initialise -----
export function initCameraManager(camera, canvas, config) {
    freeControls = createFreeCamera(camera, canvas, config);
    currentMode = 'free';
    setFreeCameraEnabled(true);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // Default FPV target is Layla
    fpvTargetModel = state.claw;
}

// ----- Mode switching -----
export function setCameraMode(mode) {
    if (!freeControls) return;

    // Deactivate previous
    if (currentMode === 'fpv' && mode !== 'fpv') {
        hideFPVHUD();
    }
    if (currentMode === 'free') setFreeCameraEnabled(false);

    switch (mode) {
        case 'free':
            setFreeCameraEnabled(true);
            if (state.claw) {
                const pos = state.claw.position.clone();
                setFreeCameraTarget(pos.x, pos.y + 0.5, pos.z);
            }
            break;

        case 'track':
            setFreeCameraEnabled(false);
            if (state.claw) {
                trackTarget.copy(state.claw.position).add(new THREE.Vector3(0, 0.5, 0));
                const camPos = state.camera.position.clone();
                const offset = camPos.clone().sub(trackTarget);
                trackDistance = Math.max(2, offset.length());
                trackTheta = Math.atan2(offset.x, offset.z);
                // Fixed height is maintained in update
            }
            break;

        case 'fpv':
            // Activate FPV HUD
            showFPVHUD();
            // Ensure we have a target
            if (!fpvTargetModel) fpvTargetModel = state.claw;
            setFPVCharacter(fpvTargetModel === state.claw ? 'layla' : 'nolan'); // rough
            break;
    }

    currentMode = mode;
    state.cameraMode = mode;
}

// ----- Per‑frame update -----
export function updateCamera() {
    const camera = state.camera;
    if (!camera) return;

    switch (currentMode) {
        case 'free':
            updateFreeCamera();
            // Free mode already supports panning (right‑click or middle‑mouse by default in OrbitControls)
            // We just ensure the controls allow panning
            if (freeControls) {
                freeControls.enablePan = true;
            }
            break;

        case 'track': {
            // Fixed height above target
            const target = trackTarget; // can be updated if we switch target
            const offset = new THREE.Vector3(
                Math.sin(trackTheta) * trackDistance,
                trackHeight,
                Math.cos(trackTheta) * trackDistance
            );
            camera.position.copy(target).add(offset);
            camera.lookAt(target);
            break;
        }

        case 'fpv':
            if (fpvTargetModel) {
                updateFPV(camera, fpvTargetModel);
            }
            break;
    }
}

// ----- Target switching for track / FPV -----
/**
 * Sets the track target to a specific model (by character name).
 * In free mode, it will move the orbit target.
 * In track mode, it changes the focus point.
 */
export function setTrackingTarget(charName) {
    const model = getModelByName(charName);
    if (!model) return;
    if (currentMode === 'track') {
        trackTarget.copy(model.position).add(new THREE.Vector3(0, 0.5, 0));
    } else if (currentMode === 'free') {
        setFreeCameraTarget(model.position.x, model.position.y + 0.5, model.position.z);
    }
}

/**
 * Sets which character we are viewing in FPV mode.
 * @param {string} charName - 'layla', 'nolan', 'lillian', 'clint'
 */
export function setFPVTarget(charName) {
    const model = getModelByName(charName);
    if (!model) return;
    fpvTargetModel = model;
    setFPVCharacter(charName);
}

// Helper to get model by name (depends on how they are stored)
function getModelByName(name) {
    // This uses state.claw and the family models stored in familyChase context
    // For simplicity, we'll assume they're stored in a global map.
    // familyChase already stores activeNolan etc., we can reference them.
    // We'll access via window or state – but for now we hardcode:
    switch (name) {
        case 'layla':   return state.claw;
        case 'nolan':   return state.familyModels?.nolanActive || null;
        case 'lillian': return state.familyModels?.lillianActive || null;
        case 'clint':   return state.familyModels?.clintActive || null;
        default:        return state.claw;
    }
}

// Update the track target to follow a moving character (if needed)
export function updateTrackTarget() {
    if (currentMode === 'track' && state.claw) {
        // By default, track follows Layla (can be changed via setTrackingTarget)
        if (!trackTarget) return;
        // We don't auto‑follow here; we keep the last set target.
        // If you want it to follow Layla continuously, you'd call setTrackingTarget('layla') each frame
    }
}

// ----- Cleanup -----
export function disposeCameraManager() {
    disposeFreeCamera();
    const canvas = state.renderer?.domElement;
    if (canvas) {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerUp);
    }
}

export function getCurrentMode() { return currentMode; }