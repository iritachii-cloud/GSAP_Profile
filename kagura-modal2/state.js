export const state = {
    claw: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    cardEl: document.querySelector('.card'),
    cloneGroup: null,
    cloneTweens: [],
    danceClones: [],
    mainDanceTL: null,
    animationLoop: { enabled: false, sequences: 1 },
    currentAnim: null,
    darkEffectsPool: [],
    lights: {},
    skySphere: null,
    environmentMeshes: [],
    currentSequence: 0,
    activeTimeline: null,
    tempGroups: [],
    stormActive: false,
    petalSystem: null,
    petalActive: false,

    // AI mode specific
    dancePhase: null,
    danceAudio: null,
    danceEndTimer: null,

    obstacles: [],
    groundBounds: { xMin: -18, xMax: 18, zMin: -18, zMax: 18 },
    cherryTrees: [],

    timeOfDay: 'day',
    lantern: null,
    birds: null,
    fireflies: null,
    clouds: null,
    skyMesh: null,
    dayLight: {},
    nightLight: {},

    // Speech bubble
    speechBubble: null,

    // Camera mode
    cameraMode: 'free'      // 'free' | 'track' | 'fpv'
};