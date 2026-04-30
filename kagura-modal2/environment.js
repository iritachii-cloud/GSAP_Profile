import { state } from './state.js';
import { setupSky } from './sky.js';
import { setupGround } from './ground.js';
import { setupWaterBridge } from './waterBridge.js';
import { setupCherryTree, updateFallingPetals } from './cherryTree.js';
import { setupToriiShrine } from './toriiShrine.js';
import { createLantern, updateLanternPosition, showLantern, hideLantern } from './lantern.js';
import { initDayNight, applyTimeOfDay, updateDayNight } from './dayNightManager.js';

export function setupEnvironment() {
    setupSky();
    setupGround();
    setupWaterBridge();
    setupCherryTree();
    setupToriiShrine();

    // Lantern (hidden at day start)
    createLantern();
    hideLantern();

    // Initialize day/night lights
    initDayNight();
}

// Called every frame from kagura.js
export function updateEnvironment(delta) {
    updateFallingPetals(delta);
    if (state.timeOfDay === 'night') {
        updateLanternPosition();
    }
}

export { applyTimeOfDay };   // export the toggle function