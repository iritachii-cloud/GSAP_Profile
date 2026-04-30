import * as THREE from 'three';
import { state } from './state.js';

let birdGroup = null;

function createBird() {
    const group = new THREE.Group();
    // body
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), new THREE.MeshStandardMaterial({ color: '#333333' }));
    body.rotation.x = Math.PI/2;
    group.add(body);
    // wings
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.25), new THREE.MeshStandardMaterial({ color: '#444444' }));
    wingL.position.set(-0.1, -0.1, 0);
    wingL.rotation.z = -0.4;
    group.add(wingL);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.25), new THREE.MeshStandardMaterial({ color: '#444444' }));
    wingR.position.set(0.1, -0.1, 0);
    wingR.rotation.z = 0.4;
    group.add(wingR);
    group.castShadow = true;
    return group;
}

export function startBirds() {
    if (birdGroup) return;
    birdGroup = new THREE.Group();
    const count = 12;
    for (let i = 0; i < count; i++) {
        const bird = createBird();
        const angle = (i / count) * Math.PI * 2;
        const radius = 4 + Math.random() * 3;
        bird.position.set(Math.cos(angle)*radius, 4 + Math.random()*2, Math.sin(angle)*radius);
        bird.rotation.y = angle + Math.PI/2;
        birdGroup.add(bird);
    }
    state.scene.add(birdGroup);
    state.birds = birdGroup;
    // animate circling
    let speed = 0.2;
    function move() {
        if (!birdGroup) return;
        birdGroup.rotation.y += 0.005;
        requestAnimationFrame(move);
    }
    move();
}

export function stopBirds() {
    if (birdGroup) {
        state.scene.remove(birdGroup);
        birdGroup = null;
        state.birds = null;
    }
}