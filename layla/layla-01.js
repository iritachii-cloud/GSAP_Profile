import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// -------------------- CONFIG --------------------
let config = null;
try {
    const resp = await fetch('layla-01.json');
    config = await resp.json();
} catch(e) {
    config = {
        particleBackground: ['⚡','🔋','✨'],
        particleCount: 24,
        animations: [
            { id: 'jump', label: '⚡ Energy Leap' },
            { id: 'spin', label: '🌀 Cannon Twirl' },
            { id: 'attack', label: '💥 Blast!' },
            { id: 'ai', label: '🤖 Family Chase' },
            { id: 'reset', label: '↩ Calm Reset' }
        ],
        modelFile: 'models/layla.glb',
        modelScaleTarget: 2.2,
        cameraFov: 38,
        cameraDistance: 5,
        orbitLimits: { min: 1, max: 12 },
        shadowMapSize: 2048,
        toneMappingExposure: 1.0
    };
}

// -------------------- STATE --------------------
const state = {
    claw: null, scene: null, camera: null, renderer: null,
    cardEl: document.querySelector('.card'),
    currentAnim: null, activeTimeline: null, tempGroups: [],
    obstacles: [], groundBounds: { xMin: -18, xMax: 18, zMin: -18, zMax: 18 },
    energyTrees: [], timeOfDay: 'day',
    cameraMode: 'free', familyActive: false,
    familyModels: null, npcs: [], walkTarget: null, walkCancel: false,
    animationLoop: { enabled: false, sequences: 1 }, currentSequence: 0,
    waterMaterial: null, speechBubble: null, environmentMeshes: [],
    // FPV HUD elements
    fpvHud: null, fpvDistanceFill: null, fpvThought: null, fpvChatStack: null, fpvMyMsg: null,
    // Day/night lights
    dayLight: {}, nightLight: {}
};

// -------------------- UTILITIES --------------------
function isBlocked(x, z) {
    const b = state.groundBounds;
    if (x < b.xMin || x > b.xMax || z < b.zMin || z > b.zMax) return true;
    for (const obs of state.obstacles) {
        if (obs.type === 'rect') {
            const d = obs.data;
            if (x >= d.xFrom && x <= d.xTo && z >= d.zFrom && z <= d.zTo) return true;
        } else if (obs.type === 'circle') {
            const d = obs.data;
            if ((x - d.x)**2 + (z - d.z)**2 <= d.radius*d.radius) return true;
        }
    }
    return false;
}

const CELL = 0.30, CHAR_RADIUS = 0.28;
function worldToCell(v) { return { cx: Math.round((v.x - state.groundBounds.xMin)/CELL), cy: Math.round((v.z - state.groundBounds.zMin)/CELL) }; }
function cellToWorld(cx, cy) { return new THREE.Vector3(state.groundBounds.xMin + cx*CELL, 0, state.groundBounds.zMin + cy*CELL); }

function isCellBlocked(cx, cy) {
    const w = cellToWorld(cx, cy);
    if (isBlocked(w.x, w.z)) return true;
    const probes = [[CHAR_RADIUS,0],[-CHAR_RADIUS,0],[0,CHAR_RADIUS],[0,-CHAR_RADIUS]];
    for (let [dx,dz] of probes) if (isBlocked(w.x+dx, w.z+dz)) return true;
    return false;
}

function nearestFreeCell(gc, maxR=12) {
    if (!isCellBlocked(gc.cx, gc.cy)) return gc;
    for (let r=1; r<=maxR; r++) {
        let best=null, bestD=Infinity;
        for (let dx=-r; dx<=r; dx++) {
            for (let dy=-r; dy<=r; dy++) {
                if (Math.abs(dx)!==r && Math.abs(dy)!==r) continue;
                const ncx = gc.cx+dx, ncy = gc.cy+dy;
                if (!isCellBlocked(ncx,ncy)) {
                    const d = Math.abs(dx)+Math.abs(dy);
                    if (d<bestD) { bestD=d; best={ cx:ncx, cy:ncy }; }
                }
            }
        }
        if (best) return best;
    }
    return gc;
}

class MinHeap {
    constructor() { this._data = []; }
    push(node) { this._data.push(node); this._bubbleUp(this._data.length-1); }
    pop() { const top=this._data[0]; const last=this._data.pop(); if(this._data.length>0) { this._data[0]=last; this._sinkDown(0); } return top; }
    get size() { return this._data.length; }
    _bubbleUp(i) { while(i>0) { const p=(i-1)>>1; if(this._data[p].f<=this._data[i].f) break; [this._data[p],this._data[i]]=[this._data[i],this._data[p]]; i=p; } }
    _sinkDown(i) { const n=this._data.length; while(true) { let min=i, l=2*i+1, r=2*i+2; if(l<n && this._data[l].f<this._data[min].f) min=l; if(r<n && this._data[r].f<this._data[min].f) min=r; if(min===i) break; [this._data[min],this._data[i]] = [this._data[i],this._data[min]]; i=min; } }
}

function heuristic(ax, ay, bx, by) { const dx=Math.abs(ax-bx), dy=Math.abs(ay-by); return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy); }
const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const COST = [1,1,1,1,1.414,1.414,1.414,1.414];

function lineOfSight(a,b) {
    const dist = a.distanceTo(b);
    const steps = Math.ceil(dist/(CELL*0.4))+1;
    for(let s=0; s<=steps; s++) {
        const t = s/steps;
        if(isBlocked(a.x+(b.x-a.x)*t, a.z+(b.z-a.z)*t)) return false;
    }
    return true;
}

function stringPull(path) {
    if(path.length<=2) return path;
    const out=[path[0]];
    let i=0;
    while(i<path.length-1) {
        let j=path.length-1;
        while(j>i+1 && !lineOfSight(path[i], path[j])) j--;
        out.push(path[j]);
        i=j;
    }
    return out;
}

export function aStar(start, goal) {
    let sc = worldToCell(start), gc = worldToCell(goal);
    sc = nearestFreeCell(sc,6); gc = nearestFreeCell(gc,12);
    if(sc.cx===gc.cx && sc.cy===gc.cy) return [goal];
    const key=(cx,cy)=> (cx<<16)|(cy&0xFFFF);
    const gMap=new Map(), par=new Map(), heap=new MinHeap();
    const sk=key(sc.cx,sc.cy);
    gMap.set(sk,0);
    heap.push({ cx:sc.cx, cy:sc.cy, f:heuristic(sc.cx,sc.cy,gc.cx,gc.cy), g:0, k:sk });
    const MAX_ITER=20000;
    let found=null;
    for(let iter=0; iter<MAX_ITER; iter++) {
        if(heap.size===0) break;
        const cur=heap.pop();
        const curG=gMap.get(cur.k);
        if(curG===undefined || cur.g>curG) continue;
        if(cur.cx===gc.cx && cur.cy===gc.cy) { found=cur; break; }
        for(let d=0; d<8; d++) {
            const ncx=cur.cx+DIRS[d][0], ncy=cur.cy+DIRS[d][1];
            if(isCellBlocked(ncx,ncy)) continue;
            if(d>=4 && (isCellBlocked(cur.cx+DIRS[d][0], cur.cy) || isCellBlocked(cur.cx, cur.cy+DIRS[d][1]))) continue;
            const ng=cur.g+COST[d];
            const nk=key(ncx,ncy);
            const old=gMap.get(nk);
            if(old!==undefined && ng>=old) continue;
            gMap.set(nk,ng);
            par.set(nk,cur);
            heap.push({ cx:ncx, cy:ncy, g:ng, f:ng+heuristic(ncx,ncy,gc.cx,gc.cy), k:nk });
        }
    }
    if(!found) return null;
    const raw=[];
    let node=found;
    while(node) { raw.push(cellToWorld(node.cx,node.cy)); node=par.get(node.k); }
    raw.reverse();
    return stringPull(raw);
}

function getRandomWalkablePosition() {
    const b=state.groundBounds;
    for(let i=0;i<200;i++) {
        const x=b.xMin+Math.random()*(b.xMax-b.xMin);
        const z=b.zMin+Math.random()*(b.zMax-b.zMin);
        if(!isBlocked(x,z)) return new THREE.Vector3(x,0,z);
    }
    return state.claw ? state.claw.position.clone() : new THREE.Vector3(0,0,0);
}

// -------------------- ENVIRONMENT (simplified but functional) --------------------
function createLabFloorTexture() {
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=512;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0a0f16'; ctx.fillRect(0,0,512,512);
    ctx.strokeStyle='#1e2a38'; ctx.lineWidth=1;
    for(let x=0;x<=512;x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,512); ctx.stroke(); }
    for(let y=0;y<=512;y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(512,y); ctx.stroke(); }
    ctx.strokeStyle='#2a7acc'; ctx.lineWidth=2; ctx.globalAlpha=0.3;
    for(let x=0;x<=512;x+=128) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,512); ctx.stroke(); }
    for(let y=0;y<=512;y+=128) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(512,y); ctx.stroke(); }
    ctx.fillStyle='#88aaff'; ctx.globalAlpha=0.6;
    for(let x=0;x<=512;x+=128) for(let y=0;y<=512;y+=128) { ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); }
    const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace; tex.wrapS=THREE.RepeatWrapping; tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(8,8);
    return tex;
}

function setupEnvironment() {
    // Ground
    const groundGeo=new THREE.PlaneGeometry(40,40);
    const groundMat=new THREE.MeshStandardMaterial({ map:createLabFloorTexture(), roughness:0.7, metalness:0.5 });
    const ground=new THREE.Mesh(groundGeo,groundMat);
    ground.rotation.x=-Math.PI/2; ground.position.y=0; ground.receiveShadow=true;
    state.scene.add(ground);
    // Simple obstacles: river at z=0 width 3, bridge from x=-1.2 to 1.2
    const RIVER_Z=0, RIVER_WIDTH=3, BRIDGE_HALF=1.2;
    const halfZ=RIVER_WIDTH/2;
    state.obstacles.push({ type:'rect', data:{ xFrom:-20, xTo:-BRIDGE_HALF, zFrom:RIVER_Z-halfZ, zTo:RIVER_Z+halfZ } });
    state.obstacles.push({ type:'rect', data:{ xFrom:BRIDGE_HALF, xTo:20, zFrom:RIVER_Z-halfZ, zTo:RIVER_Z+halfZ } });
    // River visual
    const riverMat=new THREE.MeshStandardMaterial({ color:'#1a4a8a', roughness:0.1, metalness:0.75, transparent:true, opacity:0.78, emissive:'#002244', emissiveIntensity:0.35 });
    const riverPlane=new THREE.Mesh(new THREE.PlaneGeometry(44,RIVER_WIDTH),riverMat);
    riverPlane.rotation.x=-Math.PI/2; riverPlane.position.set(0,0.02,RIVER_Z);
    state.scene.add(riverPlane);
    // Bridge
    const bridgeGroup=new THREE.Group();
    const gratingMat=new THREE.MeshStandardMaterial({ color:'#5a7a8a', roughness:0.6, metalness:0.85 });
    for(let i=-3;i<=3;i++) {
        const plank=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.06,RIVER_WIDTH+0.2),gratingMat);
        plank.position.set(i*0.4,0.08,RIVER_Z); bridgeGroup.add(plank);
    }
    state.scene.add(bridgeGroup);
    // Energy pylons (simplified)
    const pylonPositions=[[-14,-15],[0,-16],[14,-15],[-12,-8],[-16,-3],[-10,5],[-15,10],[11,-7],[16,2],[12,8],[17,14],[-8,13],[6,15],[-14,16],[14,-10],[-5,-9],[7,-6],[-7,7],[5,11]];
    pylonPositions.forEach(([x,z]) => {
        const poleMat=new THREE.MeshStandardMaterial({ color:'#44aaff', emissive:'#003366', emissiveIntensity:0.3 });
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,4,6),poleMat);
        pole.position.set(x,2,z); state.scene.add(pole);
        const orbMat=new THREE.MeshStandardMaterial({ color:'#88ccff', emissive:'#2266aa', emissiveIntensity:0.5 });
        const orb=new THREE.Mesh(new THREE.SphereGeometry(0.5,8),orbMat);
        orb.position.set(x,4.2,z); state.scene.add(orb);
        state.obstacles.push({ type:'circle', data:{ x, z, radius:1.8 } });
    });
    // Day/night lighting
    state.dayLight.ambient=new THREE.AmbientLight('#aaccff',0.8);
    state.dayLight.sun=new THREE.DirectionalLight('#ffeedd',1.8);
    state.dayLight.sun.position.set(3,5,2); state.dayLight.sun.castShadow=true;
    state.nightLight.ambient=new THREE.AmbientLight('#223366',0.4);
    state.nightLight.moon=new THREE.DirectionalLight('#88aaff',0.6);
    state.nightLight.moon.position.set(-2,4,-1);
    state.scene.add(state.dayLight.ambient); state.scene.add(state.dayLight.sun);
}

// -------------------- SPEECH BUBBLES & IDLE THOUGHTS --------------------
const emotionStyle = {
    happy:{ bg:'rgba(20,30,50,0.85)', border:'#88ccff', color:'#cceeff', glow:'#88aaff' },
    flirty:{ bg:'rgba(40,10,30,0.85)', border:'#ff99cc', color:'#ffddee', glow:'#ff99cc' },
    // ... simplified
};
let bubbles = {};
function getBubbleFor(name) {
    if(!bubbles[name]) {
        const div=document.createElement('div'); div.className='char-bubble';
        document.querySelector('.canvas-wrap').appendChild(div);
        bubbles[name]=div;
    }
    return bubbles[name];
}
function showCharacterBubble(name, model, text, emotion='happy', holdMs=3500) {
    const b=getBubbleFor(name);
    b._textEl = b._textEl || (()=>{ const s=document.createElement('span'); b.appendChild(s); return s; })();
    b._textEl.textContent=text;
    b.style.display='block';
    b.style.opacity='1';
    setTimeout(()=>{ b.style.opacity='0'; }, holdMs);
}
function hideAllBubbles() { Object.values(bubbles).forEach(b=>{ b.style.opacity='0'; }); }

// Layla idle thought deck
const LAYLA_IDLE_DAY = [
    { text:"My cannon's humming perfectly today ⚡", emotion:'happy' },
    { text:"Where did Dad wander off to? He promised snacks!", emotion:'curious' },
    { text:"Clint better be charging his phone for selfies later 📸", emotion:'flirty' }
];
const LAYLA_IDLE_NIGHT = [
    { text:"Night mode: stars and sparks ✨", emotion:'peaceful' },
    { text:"The fire‑sparks look like tiny lanterns tonight.", emotion:'happy' }
];
let idleDeck=[], idleIndex=0;
function shuffleDeck(arr) { let a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function rebuildDeck() { idleDeck = shuffleDeck(state.timeOfDay==='night'?LAYLA_IDLE_NIGHT:LAYLA_IDLE_DAY); idleIndex=0; }
function nextIdleMessage() { if(idleDeck.length===0||idleIndex>=idleDeck.length) rebuildDeck(); return idleDeck[idleIndex++]; }

let laylaIdleTimer=null, laylaIdleActive=false;
function startLaylaIdleCycle() {
    if(laylaIdleActive) return;
    laylaIdleActive=true;
    function cycle() {
        if(!laylaIdleActive || !state.claw) return;
        const msg = nextIdleMessage();
        showCharacterBubble('layla', state.claw, msg.text, msg.emotion, 4500);
        laylaIdleTimer = setTimeout(cycle, 5000 + Math.random()*7000);
    }
    cycle();
}
function stopLaylaIdleCycle() { if(laylaIdleTimer) clearTimeout(laylaIdleTimer); laylaIdleActive=false; }

// -------------------- NPC IDLE WITH PATHFINDING & CHAT --------------------
const NPC_SPEED=1.5;
const INTERACT_DIST=3.5;
const PAUSE_AFTER_CHAT=2.5; // seconds
let npcs=[], interactionMap=new Set();

function createNPC(name, modelKey, idleLines, greetings, farewell) {
    const baseModel = state.familyModels[modelKey];
    if(!baseModel) return null;
    const model = baseModel.clone();
    const pos = getRandomWalkablePosition();
    model.position.set(pos.x, baseModel.userData.baseY, pos.z);
    state.scene.add(model);
    return { name, model, state:'idle', target:pos.clone(), idleLines, greetings, farewell, chatTimer:null, movingTween:null };
}

async function typewriterBubble(character, text, emotion, delayPerChar=30) {
    const b=getBubbleFor(character.name);
    b._textEl = b._textEl || (()=>{ const s=document.createElement('span'); b.appendChild(s); return s; })();
    b._textEl.textContent='';
    b.style.opacity='1';
    for(let i=0; i<text.length; i++) {
        b._textEl.textContent += text[i];
        await new Promise(r=>setTimeout(r, delayPerChar));
    }
    await new Promise(r=>setTimeout(r, 2000)); // hold
    b.style.opacity='0';
}

async function startInteraction(a,b) {
    if(a.state==='interacting'||b.state==='interacting') return;
    const key=`${a.name}-${b.name}`;
    if(interactionMap.has(key)) return;
    interactionMap.add(key);
    a.state='interacting'; b.state='interacting';
    if(a.movingTween) a.movingTween.kill(); if(b.movingTween) b.movingTween.kill();
    // Face each other
    const dirA = new THREE.Vector3().subVectors(b.model.position, a.model.position).normalize();
    a.model.rotation.y = Math.atan2(dirA.x, dirA.z);
    const dirB = new THREE.Vector3().subVectors(a.model.position, b.model.position).normalize();
    b.model.rotation.y = Math.atan2(dirB.x, dirB.z);
    // Greetings
    const greetA = a.greetings?.[b.name] || { text:"Hi!", emotion:'happy' };
    const greetB = b.greetings?.[a.name] || { text:"Hello!", emotion:'happy' };
    await typewriterBubble(a, greetA.text, greetA.emotion, 25);
    await typewriterBubble(b, greetB.text, greetB.emotion, 25);
    // Two random lines each
    const linesA = [...a.idleLines].sort(()=>Math.random()-0.5).slice(0,2);
    const linesB = [...b.idleLines].sort(()=>Math.random()-0.5).slice(0,2);
    for(let i=0;i<Math.min(linesA.length,linesB.length);i++) {
        await typewriterBubble(a, linesA[i].text, linesA[i].emotion, 25);
        await typewriterBubble(b, linesB[i].text, linesB[i].emotion, 25);
    }
    // Farewell
    const byeA = a.farewell?.[b.name] || { text:"See ya!", emotion:'happy' };
    const byeB = b.farewell?.[a.name] || { text:"Bye!", emotion:'happy' };
    await typewriterBubble(a, byeA.text, byeA.emotion, 25);
    await typewriterBubble(b, byeB.text, byeB.emotion, 25);
    // Pause
    await new Promise(r=>setTimeout(r, PAUSE_AFTER_CHAT*1000));
    a.state='idle'; b.state='idle';
    a.target = getRandomWalkablePosition(); b.target = getRandomWalkablePosition();
    interactionMap.delete(key);
    startMovingNPC(a); startMovingNPC(b);
}

function startMovingNPC(npc) {
    if(npc.state!=='idle') return;
    if(npc.movingTween) npc.movingTween.kill();
    const startPos = npc.model.position.clone();
    const targetPos = npc.target;
    const dist = startPos.distanceTo(targetPos);
    if(dist<0.3) { npc.target = getRandomWalkablePosition(); startMovingNPC(npc); return; }
    const path = aStar(startPos, targetPos);
    if(!path || path.length<2) { npc.target = getRandomWalkablePosition(); startMovingNPC(npc); return; }
    let idx=1;
    function moveStep() {
        if(npc.state!=='idle') return;
        if(idx>=path.length) { npc.state='idle'; npc.target=getRandomWalkablePosition(); setTimeout(()=>startMovingNPC(npc), 2000); return; }
        const to = path[idx];
        const dur = startPos.distanceTo(to)/NPC_SPEED;
        npc.movingTween = gsap.to(npc.model.position, {
            x:to.x, z:to.z, duration:dur, ease:'linear',
            onUpdate:()=>{
                const dir = new THREE.Vector3().subVectors(to, npc.model.position).normalize();
                if(dir.length()>0.01) npc.model.rotation.y = Math.atan2(dir.x, dir.z);
                npc.model.position.y = npc.model.userData.baseY;
            },
            onComplete:()=>{ idx++; moveStep(); }
        });
    }
    moveStep();
}

function updateNPCs(delta) {
    if(state.familyActive) return;
    // Check interactions
    for(let i=0;i<npcs.length;i++) {
        for(let j=i+1;j<npcs.length;j++) {
            const a=npcs[i], b=npcs[j];
            if(a.state!=='idle' || b.state!=='idle') continue;
            const dist = a.model.position.distanceTo(b.model.position);
            if(dist<INTERACT_DIST) startInteraction(a,b);
        }
    }
    // Periodic idle chat for each NPC
    for(let npc of npcs) {
        if(npc.state==='idle' && !npc.chatTimer) {
            npc.chatTimer = setTimeout(async ()=>{
                if(npc.state!=='idle') { npc.chatTimer=null; return; }
                const line = npc.idleLines[Math.floor(Math.random()*npc.idleLines.length)];
                await typewriterBubble(npc, line.text, line.emotion, 30);
                npc.chatTimer = null;
            }, 6000+Math.random()*8000);
        }
    }
}

// -------------------- FAMILY CHASE (simplified but functional with A*) --------------------
async function wait(ms) { return new Promise(r=>setTimeout(r,ms)); }
let familyPhase=0, familyTarget=null, familyChaseActive=false;
const FAMILY_SEQUENCE = [
    { name:'nolan', modelKey:'nolan', rounds:3, idleLines:[], chaseLines:[], fleeLines:[], caughtLines:[] },
    { name:'lillian', modelKey:'lillian', rounds:3, idleLines:[], chaseLines:[], fleeLines:[], caughtLines:[] },
    { name:'clint', modelKey:'clint', rounds:7, idleLines:[], chaseLines:[], fleeLines:[], caughtLines:[] }
];

async function chaseCharacter(phase) {
    const char = FAMILY_SEQUENCE[phase];
    for(let round=0; round<char.rounds; round++) {
        if(!state.familyActive) return false;
        const pos = getRandomWalkablePosition();
        const model = state.familyModels[char.modelKey].clone();
        model.position.set(pos.x, model.userData.baseY, pos.z);
        state.scene.add(model);
        familyTarget = model;
        // Show greeting
        const greet = { text:`${char.name} says: Come find me!`, emotion:'happy' };
        showCharacterBubble(char.name, model, greet.text, greet.emotion, 3000);
        await wait(1500);
        // Layla walks using A*
        while(state.familyActive && familyTarget && model.parent) {
            const dist = state.claw.position.distanceTo(model.position);
            if(dist<2.5) break;
            const path = aStar(state.claw.position, model.position);
            if(!path || path.length<2) { await wait(200); continue; }
            for(let i=1;i<path.length;i++) {
                if(!state.familyActive) return false;
                await walkSegment(path[i]);
                if(state.claw.position.distanceTo(model.position)<2.5) break;
            }
        }
        if(!state.familyActive) return false;
        // Catch
        showCharacterBubble(char.name, model, round===char.rounds-1 ? "OK you got me!" : "You're close!", 'happy', 2000);
        await wait(2000);
        if(round===char.rounds-1) {
            showCharacterBubble('layla', state.claw, `Caught ${char.name}!`, 'excited', 2500);
            await wait(2500);
            state.scene.remove(model);
        } else {
            // flee
            showCharacterBubble(char.name, model, "Not yet! I'm running!", 'playful', 1500);
            await wait(1500);
            state.scene.remove(model);
            await wait(1000);
        }
    }
    return true;
}

async function startFamilyChase() {
    if(state.familyActive) return;
    state.familyActive = true;
    stopNPCs();
    stopLaylaIdleCycle();
    for(let phase=0; phase<3; phase++) {
        if(!state.familyActive) break;
        await chaseCharacter(phase);
    }
    if(state.familyActive) {
        showCharacterBubble('layla', state.claw, "Family reunited! 💙", 'happy', 4000);
        await wait(4000);
    }
    stopFamilyChase();
}
function stopFamilyChase() {
    state.familyActive = false;
    if(familyTarget && familyTarget.parent) state.scene.remove(familyTarget);
    familyTarget=null;
    startNPCs();
    startLaylaIdleCycle();
}
function stopNPCs() {
    npcs.forEach(n=>{ if(n.model.parent) state.scene.remove(n.model); if(n.movingTween) n.movingTween.kill(); clearTimeout(n.chatTimer); });
    npcs=[];
    interactionMap.clear();
}
async function startNPCs() {
    if(npcs.length) return;
    if(!state.familyModels) return;
    const defs = [
        { name:'nolan', modelKey:'nolan', idleLines:[{text:"I love tinkering!",emotion:'happy'}], greetings:{}, farewell:{} },
        { name:'lillian', modelKey:'lillian', idleLines:[{text:"Calculating optimal path...",emotion:'techy'}], greetings:{}, farewell:{} },
        { name:'clint', modelKey:'clint', idleLines:[{text:"Selfie time!",emotion:'flirty'}], greetings:{}, farewell:{} }
    ];
    for(let d of defs) {
        const npc = createNPC(d.name, d.modelKey, d.idleLines, d.greetings, d.farewell);
        if(npc) npcs.push(npc);
    }
    npcs.forEach(npc => startMovingNPC(npc));
}

// -------------------- LAYLA AUTO-WALK (A* based) --------------------
function setLaylaTarget(targetPos) {
    if(!state.claw) return;
    state.walkTarget = targetPos.clone();
    state.walkCancel = false;
    gsap.killTweensOf(state.claw.position);
    walkTowardsTarget();
}
function clearLaylaTarget() { state.walkTarget=null; state.walkCancel=true; if(state.claw) gsap.killTweensOf(state.claw.position); }
async function walkTowardsTarget() {
    while(state.walkTarget && !state.walkCancel) {
        const start = state.claw.position.clone();
        const target = state.walkTarget.clone();
        if(start.distanceTo(target)<0.3) break;
        const path = aStar(start, target);
        if(!path || path.length<2) break;
        for(let i=1;i<path.length;i++) {
            if(!state.walkTarget || state.walkCancel) break;
            await walkSegment(path[i]);
        }
    }
    clearLaylaTarget();
}
function walkSegment(targetPos) {
    return new Promise(resolve => {
        if(!state.claw || state.walkCancel) { resolve(); return; }
        const start = state.claw.position.clone();
        const dist = start.distanceTo(targetPos);
        if(dist<0.05) { resolve(); return; }
        const duration = dist / 2.5;
        const dir = new THREE.Vector3().subVectors(targetPos, start).normalize();
        const targetRot = Math.atan2(dir.x, dir.z);
        gsap.to(state.claw.rotation, { y:targetRot, duration:0.2, ease:'power2.out' });
        gsap.to(state.claw.position, {
            x:targetPos.x, z:targetPos.z, duration:duration, ease:'linear',
            onUpdate:()=>{
                if(state.claw) state.claw.position.y = state.claw.userData.baseY;
            },
            onComplete:resolve
        });
    });
}

// -------------------- ANIMATIONS (stubs for jump, spin, attack, reset) --------------------
function resetPose(dur=0.35, fullReset=false) {
    if(state.activeTimeline) state.activeTimeline.kill();
    gsap.killTweensOf(state.claw.position);
    gsap.killTweensOf(state.claw.rotation);
    gsap.killTweensOf(state.claw.scale);
    const tl = gsap.timeline();
    tl.to(state.claw.position, { x:0, y:state.claw.userData.baseY, z:0, duration:dur, ease:'power2.out' },0);
    tl.to(state.claw.scale, { x:1, y:1, z:1, duration:dur },0);
    tl.to(state.claw.rotation, { x:0, y:fullReset?0:state.claw.rotation.y, z:0, duration:dur },0);
    state.currentAnim=null;
    return tl;
}
function jumpClaw(loop,seq) { /* placeholder – real implementation would add fancy effects */ resetPose(0.1,false); }
function spinClaw(loop,seq) { resetPose(0.1,false); }
function attackClaw(loop,seq) { resetPose(0.1,false); }

// -------------------- LOADING & INIT --------------------
async function loadModel() {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(draco);
    return new Promise((resolve,reject)=>{
        loader.load(config.modelFile, (gltf)=>{
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x,size.y,size.z);
            const scale = (config.modelScaleTarget||2.4)/maxDim;
            model.scale.setScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            const box2 = new THREE.Box3().setFromObject(model);
            model.position.y -= box2.min.y;
            model.userData.baseY = model.position.y;
            model.traverse(obj=>{ if(obj.isMesh){ obj.castShadow=true; obj.receiveShadow=true; } });
            state.claw = model;
            state.scene.add(model);
            resolve();
        }, undefined, reject);
    });
}

function init() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color('#0a0a2a');
    state.camera = new THREE.PerspectiveCamera(38,1,0.1,500);
    state.camera.position.set(0,1.4,5);
    state.renderer = new THREE.WebGLRenderer({ canvas:document.getElementById('c'), antialias:true });
    state.renderer.setSize(800,450);
    state.renderer.shadowMap.enabled = true;
    setupEnvironment();
    // OrbitControls for free mode
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.enablePan = false;
    state.controls.minDistance = 1;
    state.controls.maxDistance = 12;
    state.controls.target.set(0,1,0);
    // Load family models placeholder (same GLTFLoader for nolan, lillian, clint)
    state.familyModels = {};
    const familyUrls = {
        nolan: 'models/nolan.glb',
        lillian: 'models/lillian.glb',
        clint: 'models/clint.glb'
    };
    Promise.all(Object.entries(familyUrls).map(([key,url])=> new Promise((res)=>{
        loader.load(url, (gltf)=>{
            const m = gltf.scene;
            const box = new THREE.Box3().setFromObject(m);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x,size.y,size.z);
            const scale = 1.0/maxDim;
            m.scale.setScalar(scale);
            m.position.y -= box.min.y;
            m.userData.baseY = m.position.y;
            state.familyModels[key]=m;
            res();
        }, undefined, ()=>res(createFallbackModel(key)));
    }))).then(()=>{
        startNPCs();
        startLaylaIdleCycle();
    });
    function createFallbackModel(name) {
        const geo=new THREE.BoxGeometry(0.5,0.9,0.5);
        const mat=new THREE.MeshStandardMaterial({ color: name==='nolan'?0xffaa66: name==='lillian'?0xff88aa:0xaaffaa });
        const m=new THREE.Mesh(geo,mat);
        m.position.y=0.45;
        m.userData.baseY=0.45;
        return m;
    }
    // Animation loop
    let lastTime=0;
    function animate(now) {
        requestAnimationFrame(animate);
        const delta = Math.min(0.033, (now-lastTime)/1000);
        lastTime=now;
        updateNPCs(delta);
        if(state.controls && state.cameraMode==='free') state.controls.update();
        state.renderer.render(state.scene, state.camera);
    }
    requestAnimationFrame(animate);
    // UI buttons
    const btnsDiv=document.querySelector('.btns');
    config.animations.forEach(anim=>{
        const btn=document.createElement('button');
        btn.textContent=anim.label;
        btn.onclick=()=>{
            if(!state.claw) return;
            if(state.activeTimeline) state.activeTimeline.kill();
            stopFamilyChase();
            const loop = document.getElementById('loopCheckbox').checked;
            const seq = parseInt(document.getElementById('seqCount').value)||1;
            if(anim.id==='ai') startFamilyChase();
            else if(anim.id==='reset') resetPose(0.25,true);
            else if(anim.id==='jump') jumpClaw(loop,seq);
            else if(anim.id==='spin') spinClaw(loop,seq);
            else if(anim.id==='attack') attackClaw(loop,seq);
        };
        btnsDiv.appendChild(btn);
    });
    // Camera mode buttons
    document.getElementById('camFree').onclick=()=>{ state.cameraMode='free'; state.controls.enabled=true; };
    document.getElementById('camTrack').onclick=()=>{ state.cameraMode='track'; state.controls.enabled=false; };
    document.getElementById('camFPV').onclick=()=>{ state.cameraMode='fpv'; state.controls.enabled=false; };
    // Day/night toggle
    let isDay=true;
    document.getElementById('dayNightToggle').onclick=()=>{
        isDay=!isDay;
        state.timeOfDay = isDay?'day':'night';
        const amb = isDay?state.dayLight.ambient:state.nightLight.ambient;
        const dir = isDay?state.dayLight.sun:state.nightLight.moon;
        state.scene.add(amb); state.scene.add(dir);
        if(!isDay) { state.scene.remove(state.dayLight.ambient); state.scene.remove(state.dayLight.sun); }
        else { state.scene.remove(state.nightLight.ambient); state.scene.remove(state.nightLight.moon); }
        rebuildDeck();
    };
    // Load main model
    loadModel().then(()=>{
        document.getElementById('loading').classList.add('hidden');
    }).catch(console.error);
}

// -------------------- START --------------------
window.onload = () => {
    const overlay=document.getElementById('overlay');
    const openBtn=document.getElementById('openBtn');
    const closeBtn=document.getElementById('closeBtn');
    openBtn.onclick=()=>overlay.classList.add('open');
    closeBtn.onclick=()=>overlay.classList.remove('open');
    init();
};