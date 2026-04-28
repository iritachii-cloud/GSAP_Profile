// state.js – shared references for Shadow Claw
export const state = {
    claw: null,               // main character mesh
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    cardEl: document.querySelector('.card'),
    cloneGroup: null,
    cloneTweens: [],
    danceClones: [],
    mainDanceTL: null,
    stormTL: null,            // timeline for storm effects
    rainParticles: null,
    lightningInterval: null,
    animationLoop: { enabled: false, sequences: 1 },
    currentAnim: null,
    darkEffectsPool: [],      // claw marks, sparks, etc.

    lights: {},
    skySphere: null,

    nextCloneAction: null,
    nextCloneActionReaders: 0,

    totalCloneActions: 0,
    danceSequencesTarget: 0,

    currentSequence: 0,

    activeTimeline: null,
    tempGroups: [],           // temporary groups for spin vortex etc.
    stormActive: false
};