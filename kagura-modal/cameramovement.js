import * as THREE from 'three';
import { state } from './state.js';
import { createFreeCamera, updateFreeCamera, setFreeCameraEnabled, setFreeCameraTarget, disposeFreeCamera, getFreeControls } from './camera360.js';
import { updateFPV } from './fpvch.js';
import { showFPVHUD, hideFPVHUD } from './fpvHUD.js';

let currentMode = 'free';
let freeControls = null;

let trackDistance = 5;
let trackTheta = 0;
let trackPhi = Math.PI / 4;
let pointerDown = false;
let lastPointerX = 0;
let lastPointerY = 0;
const ROTATE_SPEED = 0.005;

function onPointerDown(e) { pointerDown = true; lastPointerX = e.clientX; lastPointerY = e.clientY; }
function onPointerMove(e) {
    if (!pointerDown) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX; lastPointerY = e.clientY;
    trackTheta -= dx * ROTATE_SPEED;
    trackPhi   -= dy * ROTATE_SPEED;
    trackPhi = Math.max(0.1, Math.min(Math.PI - 0.1, trackPhi));
}
function onPointerUp() { pointerDown = false; }

export function initCameraManager(camera, canvas, config) {
    freeControls = createFreeCamera(camera, canvas, config);
    currentMode = 'free';
    setFreeCameraEnabled(true);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
}

export function setCameraMode(mode) {
    if (!freeControls) return;

    // Deactivate previous FPV HUD if leaving FPV
    if (currentMode === 'fpv' && mode !== 'fpv') {
        hideFPVHUD();
    }

    if (currentMode === 'free') setFreeCameraEnabled(false);

    switch (mode) {
        case 'free':
            setFreeCameraEnabled(true);
            if (state.claw) {
                const pos = state.claw.position;
                setFreeCameraTarget(pos.x, pos.y + 0.5, pos.z);
            }
            break;
        case 'track':
            setFreeCameraEnabled(false);
            if (state.claw) {
                const camPos = state.camera.position.clone();
                const charPos = state.claw.position.clone().add(new THREE.Vector3(0, 0.5, 0));
                const offset = camPos.sub(charPos);
                trackDistance = Math.max(1, offset.length());
                trackTheta = Math.atan2(offset.x, offset.z);
                trackPhi = Math.acos(offset.y / trackDistance);
            }
            break;
        case 'fpv':
            // Activate FPV HUD
            showFPVHUD();
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
            if (claw) {
                const target = claw.position.clone().add(new THREE.Vector3(0, 0.5, 0));
                const offset = new THREE.Vector3(
                    Math.sin(trackPhi) * Math.sin(trackTheta),
                    Math.cos(trackPhi),
                    Math.sin(trackPhi) * Math.cos(trackTheta)
                ).multiplyScalar(trackDistance);
                camera.position.copy(target).add(offset);
                camera.lookAt(target);
            }
            break;
        case 'fpv':
            updateFPV(camera, claw);
            break;
    }
}

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