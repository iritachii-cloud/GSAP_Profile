// state.js – shared references used by all animation modules
export const state = {
    kitty: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    cardEl: document.querySelector('.card'),
    cloneGroup: null,
    cloneTweens: [],
    danceClones: [],
    mainDanceTL: null,
    discoTL: null,
    originalLightColors: {},
    animationLoop: { enabled: false, sequences: 1 },
    currentAnim: null,
    heartsPool: [],

    lights: {},
    skySphere: null,

    nextCloneAction: null,
    nextCloneActionReaders: 0,

    totalCloneActions: 0,
    danceSequencesTarget: 0,

    currentSequence: 0,

    activeTimeline: null,   // stores the currently running GSAP timeline for immediate kill
    tempGroups: []          // stores temporary groups (e.g., spin vortex) for cleanup
};