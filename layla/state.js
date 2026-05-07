export const state = {
    // Layla character
    claw: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    cardEl: document.querySelector('.card'),

    // Animation & effects
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
    petalSystem: null,        // for energy spark system
    petalActive: false,

    // AI mode (idle wander)
    dancePhase: null,         // 'active' or null
    danceAudio: null,
    danceEndTimer: null,

    // World obstacles and bounds
    obstacles: [],
    groundBounds: { xMin: -18, xMax: 18, zMin: -18, zMax: 18 },
    energyTrees: [],          // decorative trees

    // Day/night
    timeOfDay: 'day',
    lantern: null,
    birds: null,
    fireflies: null,
    clouds: null,
    skyMesh: null,
    dayLight: {},
    nightLight: {},

    // UI
    speechBubble: null,
    cameraMode: 'free',       // 'free' | 'track' | 'fpv'

    // Family chase system (sequential: Nolan → Lillian → Clint)
    familyActive: false,           // whether chase is running
    familyPhase: 0,                // 0 = Nolan, 1 = Lillian, 2 = Clint
    familyEncounterCount: 0,       // number of catches in current phase
    familyTarget: null,            // current character being chased (model)
    familyFollowers: [],           // models that follow Layla after being caught
    familyChasePause: false,       // blocks movement during dialogue
    familyEncounterCooldown: false, // prevents spamming encounters
    familyFinalSequence: false,    // set when all phases complete

    // FPV idle cooldown (for HUD)
    fpvCustomMessageEndTime: 0,
};