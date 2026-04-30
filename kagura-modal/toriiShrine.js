import * as THREE from 'three';
import { state } from './state.js';

export function setupToriiShrine() {
    // --- Torii Gate (placed slightly in front of shrine) ---
    const toriiGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: '#b33e2c', roughness: 0.6 });

    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.18, 3.5, 8);
    const leftPillar = new THREE.Mesh(pillarGeo, woodMat);
    leftPillar.position.set(-1.2, 1.75, 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    toriiGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, woodMat);
    rightPillar.position.set(1.2, 1.75, 0);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    toriiGroup.add(rightPillar);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.3), woodMat);
    topBeam.position.set(0, 3.3, 0);
    topBeam.castShadow = true;
    toriiGroup.add(topBeam);

    const secondBeam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 0.25), woodMat);
    secondBeam.position.set(0, 2.8, 0);
    secondBeam.castShadow = true;
    toriiGroup.add(secondBeam);

    toriiGroup.position.set(4.5, 0, 4.5);   // near shrine
    state.scene.add(toriiGroup);
    state.environmentMeshes.push(toriiGroup);

    // Obstacle for gate area (so character walks around)
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: 4.0, xTo: 5.0, zFrom: 3.8, zTo: 5.2 }
    });

    // --- Shrine ---
    const shrineGroup = new THREE.Group();

    // Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.25, 2.2),
        new THREE.MeshStandardMaterial({ color: '#d9c5a0', roughness: 0.5 })
    );
    base.position.y = 0.125;
    base.castShadow = true;
    base.receiveShadow = true;
    shrineGroup.add(base);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: '#f5e6d3', roughness: 0.6 });
    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.4, 1.8),
        wallMat
    );
    walls.position.y = 1.05;
    walls.castShadow = true;
    walls.receiveShadow = true;
    shrineGroup.add(walls);

    // Roof – curved shape (cone)
    const roofMat = new THREE.MeshStandardMaterial({ color: '#4a2e1b', roughness: 0.7 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.8, 4), roofMat);
    roof.position.y = 2.0;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    shrineGroup.add(roof);

    // Shrine lights – glowing lanterns on sides
    const lanternLight1 = new THREE.PointLight('#FFAA00', 0.6, 3);
    lanternLight1.position.set(1.2, 0.8, 0.8);
    shrineGroup.add(lanternLight1);
    const lanternLight2 = new THREE.PointLight('#FFAA00', 0.6, 3);
    lanternLight2.position.set(-1.2, 0.8, -0.8);
    shrineGroup.add(lanternLight2);

    const miniLantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#ffaa00', emissive: '#331100' })
    );
    miniLantern.position.copy(lanternLight1.position);
    shrineGroup.add(miniLantern);

    shrineGroup.position.set(5.5, 0, 4.5);
    state.scene.add(shrineGroup);
    state.environmentMeshes.push(shrineGroup);

    // Shrine obstacle
    state.obstacles.push({
        type: 'rect',
        data: { xFrom: 4.8, xTo: 6.2, zFrom: 3.8, zTo: 5.2 }
    });
}