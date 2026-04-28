import * as THREE from 'three';
import { state } from './state.js';

// ── Strong, saturated disco palette ─────────────
function vividColor() {
    const h = Math.random();
    const s = 0.9 + Math.random() * 0.1;
    const l = 0.45 + Math.random() * 0.25;
    return new THREE.Color().setHSL(h, s, l);
}

let timeline = null;
let originalColours = null;
let rotatingLights = null;    // group of point lights that spin

// ── Rotating disco‑ball effect ──────────────────
function createRotatingDiscoLights() {
    if (rotatingLights) return;
    rotatingLights = new THREE.Group();
    // two coloured point lights orbiting around the centre
    const light1 = new THREE.PointLight(0xff0044, 20, 12);
    const light2 = new THREE.PointLight(0x00ff88, 20, 12);
    light1.position.set(2.5, 2.5, 2.5);
    light2.position.set(-2.5, 2.5, -2.5);
    rotatingLights.add(light1, light2);
    // add a few small spot lights that will move in a circle
    for (let i = 0; i < 4; i++) {
        const spot = new THREE.PointLight(0xffffff, 5, 8);
        const angle = (i / 4) * Math.PI * 2;
        spot.position.set(Math.cos(angle) * 3, 1.5, Math.sin(angle) * 3);
        rotatingLights.add(spot);
    }
    state.scene.add(rotatingLights);
    // animate rotation
    gsap.to(rotatingLights.rotation, {
        y: Math.PI * 2,
        duration: 2.5,
        repeat: -1,
        ease: 'none'
    });
}

function removeRotatingDiscoLights() {
    if (rotatingLights) {
        gsap.killTweensOf(rotatingLights.rotation);
        state.scene.remove(rotatingLights);
        rotatingLights.traverse(c => {
            if (c.isLight) {
                c.dispose();
            }
        });
        rotatingLights = null;
    }
}

// ── Public API ──────────────────────────────────
export function startDisco() {
    if (timeline) stopDisco();

    // Store original colours once
    if (!originalColours) {
        originalColours = {
            ambient:  state.lights.ambient?.color.getHex(),
            key:      state.lights.key?.color.getHex(),
            fill:     state.lights.fill?.color.getHex(),
            rim:      state.lights.rim?.color.getHex(),
            hemiSky:  state.lights.hemi?.color?.getHex(),
            hemiGround: state.lights.hemi?.groundColor?.getHex(),
            sky:      state.skySphere?.material.color.getHex()
        };
    }

    // Fast, intense colour cycling
    timeline = gsap.timeline({ repeat: -1 });

    function addPulse() {
        const c = Array.from({ length: 7 }, () => vividColor());
        const dur = 0.12 + Math.random() * 0.15;   // very fast, strobe‑like

        if (state.lights.ambient)   timeline.to(state.lights.ambient.color,   { r: c[0].r, g: c[0].g, b: c[0].b, duration: dur, ease: 'none' }, '>');
        if (state.lights.key)       timeline.to(state.lights.key.color,       { r: c[1].r, g: c[1].g, b: c[1].b, duration: dur, ease: 'none' }, '<');
        if (state.lights.fill)      timeline.to(state.lights.fill.color,      { r: c[2].r, g: c[2].g, b: c[2].b, duration: dur, ease: 'none' }, '<');
        if (state.lights.rim)       timeline.to(state.lights.rim.color,       { r: c[3].r, g: c[3].g, b: c[3].b, duration: dur, ease: 'none' }, '<');
        if (state.lights.hemi) {
            timeline.to(state.lights.hemi.color,        { r: c[4].r, g: c[4].g, b: c[4].b, duration: dur, ease: 'none' }, '<');
            timeline.to(state.lights.hemi.groundColor,  { r: c[5].r, g: c[5].g, b: c[5].b, duration: dur, ease: 'none' }, '<');
        }
        if (state.skySphere?.material) {
            timeline.to(state.skySphere.material.color, { r: c[6].r, g: c[6].g, b: c[6].b, duration: dur, ease: 'none' }, '<');
        }
    }

    addPulse();
    timeline.eventCallback('onRepeat', addPulse);

    // Add moving disco lights
    createRotatingDiscoLights();
}

export function stopDisco() {
    if (timeline) {
        timeline.kill();
        timeline = null;
    }
    removeRotatingDiscoLights();

    if (!originalColours) return;

    // Smoothly restore original colours
    if (state.lights.ambient)   gsap.to(state.lights.ambient.color,   { hex: originalColours.ambient,   duration: 0.5 });
    if (state.lights.key)       gsap.to(state.lights.key.color,       { hex: originalColours.key,       duration: 0.5 });
    if (state.lights.fill)      gsap.to(state.lights.fill.color,      { hex: originalColours.fill,      duration: 0.5 });
    if (state.lights.rim)       gsap.to(state.lights.rim.color,       { hex: originalColours.rim,       duration: 0.5 });
    if (state.lights.hemi) {
        gsap.to(state.lights.hemi.color,        { hex: originalColours.hemiSky,    duration: 0.5 });
        gsap.to(state.lights.hemi.groundColor,  { hex: originalColours.hemiGround, duration: 0.5 });
    }
    if (state.skySphere?.material) {
        gsap.to(state.skySphere.material.color, { hex: originalColours.sky, duration: 0.5 });
    }
}