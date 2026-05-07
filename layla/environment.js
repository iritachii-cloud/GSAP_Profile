import { state } from './state.js';
import { setupSky, updateSkyLightning } from './sky.js';
import { setupGround } from './ground.js';
import { setupWaterBridge, updateWaterLilies } from './waterBridge.js';
import { setupEnergyTree, updateFallingPetals } from './energyTree.js';
import { setupEnergyShrine, updateLabAnimations } from './energyShrine.js';
import { createLantern, updateLanternPosition, showLantern, hideLantern } from './energyLantern.js';
import { initDayNight, applyTimeOfDay, updateDayNight } from './dayNightManager.js';
import { updateSpeechBubble } from './speechBubble.js';      // correct import
import { updateNPCs } from './npcIdle.js';

export function setupEnvironment() {
    setupSky();
    setupGround();
    setupWaterBridge();
    setupEnergyTree();
    setupEnergyShrine();
    createLantern();
    hideLantern();
    initDayNight();
}

export function updateEnvironment(delta) {
    updateFallingPetals(delta);
    updateWaterLilies(delta);
    if (state.timeOfDay === 'night') {
        updateLanternPosition();
    }
    updateLabAnimations(delta);
    updateSkyLightning(delta);
    updateSpeechBubble();   // replaces updateCharBubbles
    updateNPCs(delta);
}

export { applyTimeOfDay };