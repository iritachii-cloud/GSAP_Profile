import * as THREE from 'three';
import { state } from './state.js';

export function setupWaterBridge() {
    // ── Dimensions ────────────────────────────────────────────────────────
    const riverWidth  = 3.0;    // how wide the river is (north-south, Z axis)
    const riverLength = 44;     // how long it runs east-west (X axis) — covers full ground
    const bridgeHalf  = 1.2;    // half-width of bridge opening on X axis (bridge = 2.4 units wide)
    const riverZ      = 0;      // centre Z position of the river

    // ── River mesh (runs east-west along X) ───────────────────────────────
    const riverGeo = new THREE.PlaneGeometry(riverLength, riverWidth);
    const riverMat = new THREE.MeshStandardMaterial({
        color: '#1a8cff',
        roughness: 0.15,
        metalness: 0.5,
        transparent: true,
        opacity: 0.75,
        emissive: new THREE.Color('#001122'),
        emissiveIntensity: 0.15
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.03, riverZ);
    river.receiveShadow = true;
    state.scene.add(river);
    state.environmentMeshes.push(river);

    // ── Animated water texture (flows east-west) ──────────────────────────
    const canvas = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0,   '#4da6ff');
    gradient.addColorStop(0.5, '#80ccff');
    gradient.addColorStop(1,   '#1a8cff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.random() * 256, Math.random() * 64);
        ctx.lineTo(Math.random() * 256, Math.random() * 64);
        ctx.stroke();
    }
    const riverTexture = new THREE.CanvasTexture(canvas);
    riverTexture.wrapS = THREE.RepeatWrapping;
    riverTexture.wrapT = THREE.RepeatWrapping;
    riverTexture.repeat.set(6, 1);
    riverMat.map = riverTexture;
    state.waterMaterial = riverMat;

    // ── River obstacles ────────────────────────────────────────────────────
    // River runs along X. Bridge sits at X=0 centre, opening from -bridgeHalf to +bridgeHalf.
    // Block everything west of bridge gap and everything east of bridge gap.
    const halfZ = riverWidth / 2;

    // West side — no crossing
    state.obstacles.push({
        type: 'rect',
        data: {
            xFrom: -riverLength / 2,
            xTo:   -bridgeHalf,
            zFrom: riverZ - halfZ,
            zTo:   riverZ + halfZ
        }
    });
    // East side — no crossing
    state.obstacles.push({
        type: 'rect',
        data: {
            xFrom:  bridgeHalf,
            xTo:    riverLength / 2,
            zFrom:  riverZ - halfZ,
            zTo:    riverZ + halfZ
        }
    });
    // The gap between -bridgeHalf and +bridgeHalf on X is intentionally open
    // — that is where the bridge sits and the only legal crossing point.

    // ── Bridge (crosses the river north-south at X=0) ──────────────────────
    const bridgeGroup = new THREE.Group();
    const plankMat = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.7 });

    // Planks laid across Z (each plank spans the river width north-south)
    for (let i = -3; i <= 3; i++) {
        const plank = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.05, riverWidth + 0.1),
            plankMat
        );
        plank.position.set(i * 0.38, 0.08, riverZ);
        plank.castShadow    = true;
        plank.receiveShadow = true;
        bridgeGroup.add(plank);
    }

    // Side rails running north-south (along Z) on each edge of the bridge
    const railMat    = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.8 });
    const railGeo    = new THREE.BoxGeometry(bridgeHalf * 2 + 0.2, 0.08, 0.1);

    // North rail
    const railNorth = new THREE.Mesh(railGeo, railMat);
    railNorth.position.set(0, 0.2, riverZ - halfZ + 0.1);
    railNorth.castShadow = true;
    bridgeGroup.add(railNorth);

    // South rail
    const railSouth = new THREE.Mesh(railGeo, railMat);
    railSouth.position.set(0, 0.2, riverZ + halfZ - 0.1);
    railSouth.castShadow = true;
    bridgeGroup.add(railSouth);

    // Posts at corners and centre
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: '#4a2f1a', roughness: 0.9 });
    for (const x of [-bridgeHalf + 0.1, 0, bridgeHalf - 0.1]) {
        const postN = new THREE.Mesh(postGeo, postMat);
        postN.position.set(x, 0.08, riverZ - halfZ + 0.05);
        postN.castShadow = true;
        bridgeGroup.add(postN);

        const postS = new THREE.Mesh(postGeo, postMat);
        postS.position.set(x, 0.08, riverZ + halfZ - 0.05);
        postS.castShadow = true;
        bridgeGroup.add(postS);
    }

    state.scene.add(bridgeGroup);
    state.environmentMeshes.push(bridgeGroup);
}