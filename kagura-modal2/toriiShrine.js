import * as THREE from 'three';
import { state } from './state.js';

// ─── Shrine position constants (exported for pathfinding) ─────────────────
export const SHRINE_X        =  8.0;
export const SHRINE_Z        = -6.0;
export const TORII_X         =  8.0;
export const TORII_Z         = -1.5;   // gate is south of shrine
export const GATE_OPEN_HALF  =  1.0;   // half-width of walkable opening

export function setupToriiShrine() {
    buildToriiGate();
    buildShrine();
    registerObstacles();
}

// ─────────────────────────────────────────────────────────────────────────────
// TORII GATE  — classic vermilion Myojin-style gate
// ─────────────────────────────────────────────────────────────────────────────
function buildToriiGate() {
    const g = new THREE.Group();

    const redMat  = new THREE.MeshStandardMaterial({ color: '#c0321c', roughness: 0.55, metalness: 0.05 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#8c1f10', roughness: 0.65 });
    const blackMat= new THREE.MeshStandardMaterial({ color: '#1a1008', roughness: 0.7 });

    const H     = 4.4;   // pillar height
    const SPAN  = 5.0;   // outer span
    const PR    = 0.19;  // pillar radius

    // ── Pillars ────────────────────────────────────────────────────────────
    const pillarGeo = new THREE.CylinderGeometry(PR * 0.85, PR, H, 12);
    [-SPAN/2, SPAN/2].forEach(px => {
        const p = new THREE.Mesh(pillarGeo, redMat);
        p.position.set(px, H / 2, 0);
        p.castShadow = p.receiveShadow = true;
        g.add(p);

        // Foot stone
        const stone = new THREE.Mesh(
            new THREE.CylinderGeometry(PR * 1.5, PR * 1.7, 0.18, 10),
            blackMat
        );
        stone.position.set(px, 0.09, 0);
        g.add(stone);
    });

    // ── Kasagi — top curved beam ───────────────────────────────────────────
    // Simulated with a tapered box + slight curve via ScaleY on ends
    const kasagiGeo = new THREE.BoxGeometry(SPAN + 1.0, 0.26, 0.42);
    const kasagi = new THREE.Mesh(kasagiGeo, redMat);
    kasagi.position.set(0, H + 0.13, 0);
    kasagi.castShadow = true;
    g.add(kasagi);

    // Upward-curving ends (two wedge extensions)
    [-1, 1].forEach(side => {
        const curl = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.18, 0.38),
            redMat
        );
        curl.position.set(side * (SPAN / 2 + 0.55), H + 0.13 + 0.08, 0);
        curl.rotation.z = side * 0.18;
        curl.castShadow = true;
        g.add(curl);
    });

    // ── Shimagi — second beam just below kasagi ────────────────────────────
    const shimagi = new THREE.Mesh(
        new THREE.BoxGeometry(SPAN + 0.2, 0.18, 0.34),
        darkMat
    );
    shimagi.position.set(0, H - 0.45, 0);
    shimagi.castShadow = true;
    g.add(shimagi);

    // ── Nuki — horizontal tie-bar connecting pillars ───────────────────────
    const nuki = new THREE.Mesh(
        new THREE.BoxGeometry(SPAN - 0.22, 0.15, 0.28),
        redMat
    );
    nuki.position.set(0, H * 0.55, 0);
    g.add(nuki);

    // ── Gakuzuka — central name-plaque tablet ─────────────────────────────
    const plaque = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.45, 0.06),
        new THREE.MeshStandardMaterial({ color: '#f5e8c0', roughness: 0.5 })
    );
    plaque.position.set(0, H * 0.55 - 0.01, 0.16);
    g.add(plaque);

    // ── Lamp pendants (bronze rings with glow) ────────────────────────────
    const lampMat = new THREE.MeshStandardMaterial({
        color: '#8b6914',
        emissive: new THREE.Color('#6e4a00'),
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.6
    });
    [-1.2, 1.2].forEach(lx => {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.28, 8), lampMat);
        lamp.position.set(lx, H * 0.55 + 0.25, 0);
        g.add(lamp);
        // Chain
        const chain = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.55, 5),
            blackMat
        );
        chain.position.set(lx, H * 0.55 + 0.62, 0);
        g.add(chain);
    });

    // ── Approach path — flat stone tiles ──────────────────────────────────
    const tileMat = new THREE.MeshStandardMaterial({ color: '#b8a88a', roughness: 0.85 });
    for (let i = 0; i < 7; i++) {
        const tile = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.04, 0.45),
            tileMat
        );
        tile.position.set(0, 0.02, 1.0 + i * 0.55);
        tile.receiveShadow = true;
        g.add(tile);
    }
    // Approach before gate
    for (let i = 0; i < 4; i++) {
        const tile = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.04, 0.45),
            tileMat
        );
        tile.position.set(0, 0.02, -0.8 - i * 0.55);
        tile.receiveShadow = true;
        g.add(tile);
    }

    g.position.set(TORII_X, 0, TORII_Z);
    state.scene.add(g);
    state.environmentMeshes.push(g);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHRINE  — proper Shinto honden with haiden, steps, lanterns
// ─────────────────────────────────────────────────────────────────────────────
function buildShrine() {
    const g = new THREE.Group();

    // ── Materials ──────────────────────────────────────────────────────────
    const woodMat    = new THREE.MeshStandardMaterial({ color: '#8c5c30', roughness: 0.7 });
    const plasterMat = new THREE.MeshStandardMaterial({ color: '#f0ead6', roughness: 0.65 });
    const roofMat    = new THREE.MeshStandardMaterial({ color: '#3d2010', roughness: 0.75 });
    const tileMat    = new THREE.MeshStandardMaterial({ color: '#b8a88a', roughness: 0.85 });
    const redMat     = new THREE.MeshStandardMaterial({ color: '#c0321c', roughness: 0.55 });
    const goldMat    = new THREE.MeshStandardMaterial({
        color: '#c8a440', emissive: new THREE.Color('#7a5a00'), emissiveIntensity: 0.2,
        roughness: 0.3, metalness: 0.7
    });

    // ── Stone platform (plinth) ────────────────────────────────────────────
    const plinthW = 4.4, plinthD = 3.8, plinthH = 0.35;
    const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(plinthW, plinthH, plinthD),
        new THREE.MeshStandardMaterial({ color: '#9a9080', roughness: 0.9 })
    );
    plinth.position.y = plinthH / 2;
    plinth.receiveShadow = plinth.castShadow = true;
    g.add(plinth);

    // Steps at south face
    for (let s = 0; s < 3; s++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.12, 0.32),
            tileMat
        );
        step.position.set(0, 0.06 + s * 0.12, plinthD / 2 + 0.32 * (s + 1) - 0.16);
        step.receiveShadow = step.castShadow = true;
        g.add(step);
    }

    // ── Haiden (oratory) — front hall ─────────────────────────────────────
    const haidenW = 3.4, haidenD = 1.6, haidenH = 1.6;
    const haiden = new THREE.Mesh(
        new THREE.BoxGeometry(haidenW, haidenH, haidenD),
        plasterMat
    );
    haiden.position.set(0, plinthH + haidenH / 2, plinthD / 2 - haidenD / 2 - 0.05);
    haiden.castShadow = haiden.receiveShadow = true;
    g.add(haiden);

    // Haiden columns (front 4)
    const colGeo = new THREE.CylinderGeometry(0.1, 0.12, haidenH + 0.1, 8);
    [-1.4, -0.46, 0.46, 1.4].forEach(cx => {
        const col = new THREE.Mesh(colGeo, redMat);
        col.position.set(cx, plinthH + (haidenH + 0.1) / 2, plinthD / 2 - 0.08);
        col.castShadow = true;
        g.add(col);
    });

    // Haiden roof — irimoya (hip-and-gable)
    // Main hip roof
    const haidenRoof = new THREE.Mesh(
        new THREE.BoxGeometry(haidenW + 0.7, 0.12, haidenD + 0.6),
        roofMat
    );
    haidenRoof.position.set(0, plinthH + haidenH + 0.06, plinthD / 2 - haidenD / 2 - 0.05);
    haidenRoof.castShadow = true;
    g.add(haidenRoof);

    // Sloped ridge (pyramid-like cone segment)
    const haidenRidge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, haidenW / 2 + 0.3, 0.8, 4),
        roofMat
    );
    haidenRidge.position.set(0, plinthH + haidenH + 0.45, plinthD / 2 - haidenD / 2 - 0.05);
    haidenRidge.rotation.y = Math.PI / 4;
    haidenRidge.castShadow = true;
    g.add(haidenRidge);

    // Gable (chidori-hafu) — decorative front triangle
    const gable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.8, 0.6, 3),
        new THREE.MeshStandardMaterial({ color: '#f0ead6', roughness: 0.6 })
    );
    gable.position.set(0, plinthH + haidenH + 0.22, plinthD / 2 + 0.05);
    gable.rotation.y = Math.PI / 6;
    gable.castShadow = true;
    g.add(gable);

    // ── Honden (main hall) — behind haiden ────────────────────────────────
    const hondenW = 2.6, hondenD = 2.2, hondenH = 2.0;
    const honden = new THREE.Mesh(
        new THREE.BoxGeometry(hondenW, hondenH, hondenD),
        plasterMat
    );
    honden.position.set(0, plinthH + hondenH / 2, plinthD / 2 - haidenD - hondenD / 2 - 0.1);
    honden.castShadow = honden.receiveShadow = true;
    g.add(honden);

    // Honden roof — steeper hip-gable
    const hondenBase = plinthH + hondenH;
    const hondenZ    = plinthD / 2 - haidenD - hondenD / 2 - 0.1;
    const hRoof = new THREE.Mesh(
        new THREE.BoxGeometry(hondenW + 0.6, 0.14, hondenD + 0.5),
        roofMat
    );
    hRoof.position.set(0, hondenBase + 0.07, hondenZ);
    hRoof.castShadow = true;
    g.add(hRoof);

    const hPeak = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, hondenW / 2 + 0.25, 1.1, 4),
        roofMat
    );
    hPeak.position.set(0, hondenBase + 0.62, hondenZ);
    hPeak.rotation.y = Math.PI / 4;
    hPeak.castShadow = true;
    g.add(hPeak);

    // Shibi (finials) on roof ridge
    [-hondenW / 2 - 0.05, hondenW / 2 + 0.05].forEach(fx => {
        const finial = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.03, 6, 10),
            goldMat
        );
        finial.position.set(fx, hondenBase + 1.1, hondenZ);
        finial.rotation.x = Math.PI / 2;
        finial.castShadow = true;
        g.add(finial);
    });

    // ── Ornamentation: offering box (saisen-bako) ──────────────────────────
    const offeringBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.35, 0.45),
        new THREE.MeshStandardMaterial({ color: '#5c3010', roughness: 0.8 })
    );
    offeringBox.position.set(0, plinthH + 0.18, plinthD / 2 - haidenD * 0.3);
    g.add(offeringBox);
    // Gold lattice top
    const lattice = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.04, 0.47),
        goldMat
    );
    lattice.position.copy(offeringBox.position);
    lattice.position.y += 0.18;
    g.add(lattice);

    // ── Stone lanterns (tōrō) — flanking path ─────────────────────────────
    buildStoneLantern(g, -1.6, plinthH + 0.05, plinthD / 2 + 0.8);
    buildStoneLantern(g,  1.6, plinthH + 0.05, plinthD / 2 + 0.8);
    buildStoneLantern(g, -1.6, plinthH + 0.05, plinthD / 2 + 2.4);
    buildStoneLantern(g,  1.6, plinthH + 0.05, plinthD / 2 + 2.4);

    // ── Rope (shimenawa) across shrine front ──────────────────────────────
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#e8d498', roughness: 0.9 });
    for (let seg = 0; seg < 12; seg++) {
        const ropeEl = new THREE.Mesh(
            new THREE.SphereGeometry(0.025, 5, 4),
            ropeMat
        );
        const t = seg / 11;
        ropeEl.position.set(
            -haidenW / 2 + 0.2 + t * (haidenW - 0.4),
            plinthH + haidenH * 0.9 - Math.sin(t * Math.PI) * 0.08,
            plinthD / 2 + 0.05
        );
        g.add(ropeEl);
    }

    // ── Komainu (guardian lion-dogs) ──────────────────────────────────────
    buildKomainu(g, -1.0, plinthH + plinthH / 2, plinthD / 2 + 0.3, false);
    buildKomainu(g,  1.0, plinthH + plinthH / 2, plinthD / 2 + 0.3, true);

    g.position.set(SHRINE_X, 0, SHRINE_Z);
    state.scene.add(g);
    state.environmentMeshes.push(g);
}

// ─── Stone lantern helper ─────────────────────────────────────────────────
function buildStoneLantern(parent, x, y, z) {
    const mat = new THREE.MeshStandardMaterial({ color: '#8a8070', roughness: 0.85 });
    const glowMat = new THREE.MeshStandardMaterial({
        color: '#ffcc55',
        emissive: new THREE.Color('#ff9900'),
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.85
    });

    // Plinth
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.18, 8), mat);
    base.position.set(x, y + 0.09, z);
    parent.add(base);
    // Column
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), mat);
    col.position.set(x, y + 0.53, z);
    parent.add(col);
    // Firebox
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat);
    box.position.set(x, y + 1.04, z);
    parent.add(box);
    // Glowing interior
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), glowMat);
    glow.position.set(x, y + 1.04, z);
    parent.add(glow);
    // Roof cap
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 0.16, 6), mat);
    roof.position.set(x, y + 1.27, z);
    parent.add(roof);
    // Light
    const light = new THREE.PointLight('#ffaa44', 0.7, 2.5);
    light.position.set(x, y + 1.04, z);
    parent.add(light);
    state.shrineLight = state.shrineLight || [];
    state.shrineLight.push(light);
}

// ─── Simplified komainu (lion-dog) ────────────────────────────────────────
function buildKomainu(parent, x, y, z, mirror) {
    const mat = new THREE.MeshStandardMaterial({ color: '#c8b890', roughness: 0.7 });
    const g   = new THREE.Group();

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.32), mat);
    body.position.y = 0.11;
    g.add(body);
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2), mat);
    head.position.set(0, 0.32, 0.1);
    head.rotation.x = mirror ? 0.12 : -0.12;
    g.add(head);
    // Ears
    [-0.07, 0.07].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.05), mat);
        ear.position.set(ex, 0.43, 0.1);
        g.add(ear);
    });
    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.22, 5), mat);
    tail.position.set(0, 0.25, -0.14);
    tail.rotation.x = -0.7;
    g.add(tail);

    g.position.set(x, y, z);
    if (mirror) g.rotation.y = Math.PI;
    parent.add(g);
}

// ─────────────────────────────────────────────────────────────────────────────
// OBSTACLES
// ─────────────────────────────────────────────────────────────────────────────
function registerObstacles() {
    // ── Shrine building (solid block) ─────────────────────────────────────
    state.obstacles.push({
        type: 'rect',
        data: {
            xFrom: SHRINE_X - 2.4,
            xTo:   SHRINE_X + 2.4,
            zFrom: SHRINE_Z - 2.2,
            zTo:   SHRINE_Z + 2.0
        }
    });

    // ── Torii gate — pillar walls; open centre passage ─────────────────────
    // Left pillar wall (west of gate opening)
    state.obstacles.push({
        type: 'rect',
        data: {
            xFrom: TORII_X - 3.2,
            xTo:   TORII_X - GATE_OPEN_HALF,
            zFrom: TORII_Z - 0.35,
            zTo:   TORII_Z + 0.35
        }
    });
    // Right pillar wall (east of gate opening)
    state.obstacles.push({
        type: 'rect',
        data: {
            xFrom: TORII_X + GATE_OPEN_HALF,
            xTo:   TORII_X + 3.2,
            zFrom: TORII_Z - 0.35,
            zTo:   TORII_Z + 0.35
        }
    });
    // Note: gap at TORII_X ± GATE_OPEN_HALF is intentionally open (the passage)
}