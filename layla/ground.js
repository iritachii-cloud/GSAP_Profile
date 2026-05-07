import * as THREE from 'three';
import { state } from './state.js';

/**
 * Creates a laboratory floor texture: dark metallic plates with glowing grid lines
 * and occasional energy nodes.
 */
function createLabFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dark metal
    ctx.fillStyle = '#0a0f16';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle plate lines (grid)
    ctx.strokeStyle = '#1e2a38';
    ctx.lineWidth = 1;
    const plateSize = 32;
    for (let x = 0; x <= 512; x += plateSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
    }
    for (let y = 0; y <= 512; y += plateSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }

    // Glowing energy grid lines (brighter, slightly offset)
    ctx.strokeStyle = '#2a7acc';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    const majorGrid = 128;
    for (let x = 0; x <= 512; x += majorGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
    }
    for (let y = 0; y <= 512; y += majorGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }

    // Energy nodes at grid intersections (tiny glowing circles)
    ctx.fillStyle = '#88aaff';
    ctx.globalAlpha = 0.6;
    for (let x = 0; x <= 512; x += majorGrid) {
        for (let y = 0; y <= 512; y += majorGrid) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Smaller sparkles scattered
    ctx.fillStyle = '#ccddff';
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 300; i++) {
        const px = Math.random() * 512;
        const py = Math.random() * 512;
        ctx.fillRect(px, py, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8); // repeats the pattern across the whole floor
    return texture;
}

/**
 * Creates the lab floor plane and scatters small energy spark nodes.
 */
export function setupGround() {
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
        map: createLabFloorTexture(),
        roughness: 0.7,
        metalness: 0.5,
        color: new THREE.Color('#c0d0e0') // slightly tinted metal
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    state.scene.add(ground);
    state.environmentMeshes.push(ground);

    // Decorative energy nodes (tiny glowing bolts / icons on the floor)
    const nodeGroup = new THREE.Group();
    const nodeCount = 180;
    for (let i = 0; i < nodeCount; i++) {
        const node = createEnergyNode();
        const angle = Math.random() * Math.PI * 2;
        const radius = 4 + Math.random() * 14;
        node.position.set(
            Math.cos(angle) * radius,
            0.02, // just above ground
            Math.sin(angle) * radius
        );
        node.rotation.z = Math.random() * Math.PI;
        nodeGroup.add(node);
    }
    state.scene.add(nodeGroup);
    state.environmentMeshes.push(nodeGroup);
}

/**
 * Creates a small glowing energy node sprite (like a tiny hex nut or spark).
 */
function createEnergyNode() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Drawing a cute gear-like shape or bolt
    ctx.fillStyle = '#88aaff';
    ctx.beginPath();
    // A small hexagon
    const cx = 16, cy = 16, r = 10;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Inner glow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.25, 0.25, 1);
    return sprite;
}