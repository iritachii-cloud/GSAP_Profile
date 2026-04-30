import * as THREE from 'three';
import { state } from './state.js';
import { setDaySky, setNightSky } from './sky.js';
import { startClouds, stopClouds } from './clouds.js';
import { startBirds, stopBirds } from './birds.js';
import { startFireflies, stopFireflies } from './fireflies.js';
import { showLantern, hideLantern } from './lantern.js';
import { setLilyTimeOfDay } from './waterBridge.js';
import { setTreeTimeOfDay } from './cherryTree.js';

let dayAmbient, daySun, nightAmbient, nightMoon;

export function initDayNight() {
    // Day lights
    dayAmbient = new THREE.AmbientLight('#ffccdd', 0.8);
    daySun = new THREE.DirectionalLight('#ffeedd', 1.8);
    daySun.position.set(3, 5, 2);
    daySun.castShadow = true;
    daySun.shadow.mapSize.set(2048, 2048);
    daySun.shadow.radius = 2;

    // Night lights
    nightAmbient = new THREE.AmbientLight('#223366', 0.4);
    nightMoon = new THREE.DirectionalLight('#5566aa', 0.6);
    nightMoon.position.set(-2, 4, -1);
    nightMoon.castShadow = true;
    nightMoon.shadow.mapSize.set(2048, 2048);

    state.dayLight   = { ambient: dayAmbient,  sun:  daySun  };
    state.nightLight = { ambient: nightAmbient, moon: nightMoon };

    applyTimeOfDay('day');
}

export function applyTimeOfDay(time) {
    state.timeOfDay = time;
    const scene = state.scene;

    if (state.dayLight.ambient.parent)  scene.remove(state.dayLight.ambient);
    if (state.dayLight.sun.parent)      scene.remove(state.dayLight.sun);
    if (state.nightLight.ambient.parent)scene.remove(state.nightLight.ambient);
    if (state.nightLight.moon.parent)   scene.remove(state.nightLight.moon);

    if (time === 'day') {
        scene.add(state.dayLight.ambient);
        scene.add(state.dayLight.sun);
        setDaySky();
        startClouds();
        startBirds();
        stopFireflies();
        hideLantern();
        setLilyTimeOfDay('day');
        setTreeTimeOfDay('day');
    } else {
        scene.add(state.nightLight.ambient);
        scene.add(state.nightLight.moon);
        setNightSky();
        stopClouds();
        stopBirds();
        startFireflies();
        showLantern();
        setLilyTimeOfDay('night');
        setTreeTimeOfDay('night');
    }

    scene.fog = time === 'day'
        ? new THREE.FogExp2('#1a0010', 0.008)
        : new THREE.FogExp2('#0a0010', 0.012);
}

export function updateDayNight() {
    // lantern update handled in environment.js animate loop
}