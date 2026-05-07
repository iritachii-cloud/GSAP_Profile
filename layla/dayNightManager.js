import * as THREE from 'three';
import { state } from './state.js';
import { setDaySky, setNightSky } from './sky.js';
import { startClouds, stopClouds } from './clouds.js';
import { startBirds, stopBirds } from './birds.js';
import { startFireflies, stopFireflies } from './fireflies.js';
import { showLantern, hideLantern } from './energyLantern.js';
import { setLilyTimeOfDay } from './waterBridge.js';
import { setTreeTimeOfDay } from './energyTree.js';
import { setBotTimeOfDay } from './energyShrine.js';
import { setDroneTimeOfDay } from './birds.js';

let dayAmbient, daySun, nightAmbient, nightMoon;

export function initDayNight() {
    dayAmbient = new THREE.AmbientLight('#aaccff', 0.8);
    daySun = new THREE.DirectionalLight('#ffeedd', 1.8);
    daySun.position.set(3, 5, 2);
    daySun.castShadow = true;
    daySun.shadow.mapSize.set(2048, 2048);
    daySun.shadow.radius = 2;

    nightAmbient = new THREE.AmbientLight('#223366', 0.4);
    nightMoon = new THREE.DirectionalLight('#88aaff', 0.6);
    nightMoon.position.set(-2, 4, -1);
    nightMoon.castShadow = true;
    nightMoon.shadow.mapSize.set(2048, 2048);

    state.dayLight = { ambient: dayAmbient, sun: daySun };
    state.nightLight = { ambient: nightAmbient, moon: nightMoon };

    applyTimeOfDay('day');
}

export function applyTimeOfDay(time) {
    state.timeOfDay = time;
    const scene = state.scene;

    if (state.dayLight.ambient.parent) scene.remove(state.dayLight.ambient);
    if (state.dayLight.sun.parent) scene.remove(state.dayLight.sun);
    if (state.nightLight.ambient.parent) scene.remove(state.nightLight.ambient);
    if (state.nightLight.moon.parent) scene.remove(state.nightLight.moon);

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
        setBotTimeOfDay('day');
        setDroneTimeOfDay('day');
        scene.fog = new THREE.FogExp2('#aaccff', 0.008);
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
        setBotTimeOfDay('night');
        setDroneTimeOfDay('night');
        scene.fog = new THREE.FogExp2('#0a001a', 0.012);
    }
}

export function updateDayNight() {
    // Lantern update handled in environment.js
}