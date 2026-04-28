import * as THREE from 'three';
import { state } from './state.js';

let lightningFlashTL = null;
let rainSystem = null;
let thunderInterval = null;
let originalLightIntensities = {};

function createRain() {
    if (rainSystem) return;
    const particleCount = state.config?.stormConfig?.rainDropCount || 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i*3] = (Math.random() - 0.5) * 24;
        positions[i*3+1] = Math.random() * 12;
        positions[i*3+2] = (Math.random() - 0.5) * 18 - 4;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0x88aaff,
        size: 0.08,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    rainSystem = new THREE.Points(geometry, material);
    state.scene.add(rainSystem);
    state.tempGroups.push(rainSystem);
    // animate rain falling
    function updateRain() {
        if (!rainSystem) return;
        const positions = rainSystem.geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            positions[i*3+1] -= 0.1;
            if (positions[i*3+1] < -1) {
                positions[i*3+1] = 7;
                positions[i*3] = (Math.random() - 0.5) * 24;
                positions[i*3+2] = (Math.random() - 0.5) * 18 - 4;
            }
        }
        rainSystem.geometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(updateRain);
    }
    requestAnimationFrame(updateRain);
}

function lightningFlash() {
    if (!state.stormActive) return;
    // intense white flash on directional light && ambient
    const keyLight = state.lights.key;
    const ambient = state.lights.ambient;
    if (keyLight && ambient) {
        originalLightIntensities.key = keyLight.intensity;
        originalLightIntensities.ambient = ambient.intensity;
        keyLight.intensity = 2.8;
        ambient.intensity = 1.4;
        gsap.to(keyLight, { intensity: originalLightIntensities.key, duration: 0.2, delay: 0.1 });
        gsap.to(ambient, { intensity: originalLightIntensities.ambient, duration: 0.2, delay: 0.1 });
    }
    // random thunder sound
    try {
        const thunder = new Audio('thunder.mp3');
        thunder.volume = 0.5 + Math.random() * 0.3;
        thunder.play().catch(e=>console.log('thunder audio blocked'));
    } catch(e) {}
    // quick flash on sky sphere if exists
    if (state.skySphere?.material) {
        const originalColor = state.skySphere.material.color.getHex();
        gsap.to(state.skySphere.material.color, { r: 1, g: 1, b: 1, duration: 0.08, yoyo: true, repeat: 1 });
        gsap.to(state.skySphere.material.color, { hex: originalColor, duration: 0.2, delay: 0.1 });
    }
}

export function startStorm() {
    if (state.stormActive) return;
    state.stormActive = true;
    createRain();
    lightningFlashTL = gsap.timeline({ repeat: -1, repeatDelay: 2 });
    const intervalMin = state.config?.stormConfig?.lightningIntervalMin || 1.2;
    const intervalMax = state.config?.stormConfig?.lightningIntervalMax || 4.2;
    function scheduleLightning() {
        if (!state.stormActive) return;
        const delay = intervalMin + Math.random() * (intervalMax - intervalMin);
        lightningFlashTL.call(() => lightningFlash(), null, `+=${delay}`);
        lightningFlashTL.call(scheduleLightning, null, `+=${delay}`);
    }
    scheduleLightning();
    // Add subtle rotating dark clouds / glow
    const cloudGlow = new THREE.PointLight(0x442266, 0.7, 18);
    cloudGlow.position.set(0, 3, 0);
    state.scene.add(cloudGlow);
    state.tempGroups.push(cloudGlow);
    gsap.to(cloudGlow, { intensity: 1.2, duration: 0.8, repeat: -1, yoyo: true });
}

export function stopStorm() {
    state.stormActive = false;
    if (lightningFlashTL) { lightningFlashTL.kill(); lightningFlashTL = null; }
    if (rainSystem) {
        state.scene.remove(rainSystem);
        rainSystem.geometry.dispose();
        rainSystem.material.dispose();
        rainSystem = null;
    }
    if (thunderInterval) clearInterval(thunderInterval);
    // restore original light intensities
    if (state.lights.key && originalLightIntensities.key) state.lights.key.intensity = originalLightIntensities.key;
    if (state.lights.ambient && originalLightIntensities.ambient) state.lights.ambient.intensity = originalLightIntensities.ambient;
    // remove extra storm groups
    state.tempGroups = state.tempGroups.filter(g => {
        if (g && g.type === 'PointLight' && g.intensity && g.parent) state.scene.remove(g);
        return false;
    });
}