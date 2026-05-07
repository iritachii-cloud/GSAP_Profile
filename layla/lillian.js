// ============================================
//  Lillian's complete dialogue library
//  Used by: speechBubble, familyChase, npcIdle
// ============================================

// ----- IDLE LINES (while she's waiting or roaming) -----
export const LILLIAN_IDLE = [
    { text: "System diagnostics: all clear. Snark levels: high. 🔧", emotion: 'techy' },
    { text: "I could improve Layla's cannon efficiency by 4.2%. Later though.", emotion: 'proud' },
    { text: "Nolan left his spanner on the ground again…", emotion: 'annoyed' },
    { text: "My tracking drone is picking up a cute energy signature nearby.", emotion: 'playful' },
    { text: "The plasma fence is holding steady — I designed it, after all.", emotion: 'techy' },
    { text: "I wonder if Clint finally charged his phone for that selfie.", emotion: 'curious' },
    { text: "Nothing beats a hot soldering iron and a fresh blueprint.", emotion: 'peaceful' },
    { text: "I recalibrated the steam vents this morning. You're welcome.", emotion: 'proud' },
    { text: "If Layla gets hurt, I'm weaponising the entire lab.", emotion: 'protective' },
    { text: "The energy river is at optimal flow today.", emotion: 'techy' },
    { text: "Note to self: build a sock‑finding drone for Nolan.", emotion: 'playful' },
    { text: "Clint should know I have a background check algorithm.", emotion: 'cheeky' },
    { text: "The crystal pylons are humming in a perfect E‑flat.", emotion: 'peaceful' },
    { text: "I love my family, even when they make a mess of my lab.", emotion: 'happy' },
    { text: "Maybe I should add glitter to the security bots. For morale.", emotion: 'excited' },
    { text: "Layla's energy aura is exceptionally bright today.", emotion: 'proud' },
    { text: "I'll never admit it, but I enjoy the family chases.", emotion: 'embarrassed' },
    { text: "Next project: an auto‑recharging snack dispenser.", emotion: 'determined' },
    { text: "This lab is my masterpiece — and my playground.", emotion: 'happy' },
    { text: "All systems nominal. Time for a coffee.", emotion: 'peaceful' },
];

// ----- CHASE LINES (when Layla is approaching) -----
export const LILLIAN_CHASE = [
    { text: "Layla! My sensors detected you coming! Come here! ⚡", emotion: 'techy' },
    { text: "I can see your energy signature spiking — you're close!", emotion: 'excited' },
    { text: "Don't make me recalibrate your cannon, young lady!", emotion: 'playful' },
    { text: "Your dad already goofed off — don't you follow suit!", emotion: 'protective' },
    { text: "You can't outrun a genius, sweetheart!", emotion: 'proud' },
    { text: "My tracking drone says you're 15 meters out. Ready?", emotion: 'determined' },
    { text: "Come on then! Let's see what my daughter's got!", emotion: 'excited' },
];

// ----- FLEE LINES (just before Layla catches her) -----
export const LILLIAN_FLEE = [
    { text: "I invented that cannon — I can dodge it!", emotion: 'proud' },
    { text: "You'll have to do better than that, honey!", emotion: 'excited' },
    { text: "Back to the workbench! (Tactical retreat.)", emotion: 'cheeky' },
    { text: "My EMP isn't ready yet — gotta run!", emotion: 'worried' },
];

// ----- CAUGHT LINES (final round) -----
export const LILLIAN_CAUGHT = [
    { text: "Fine! You win. Now let's go catch that boyfriend of yours. 💙", emotion: 'happy' },
    { text: "Oof, alright — I surrender! But you're cleaning your cannon afterwards.", emotion: 'playful' },
    { text: "You're too fast, just like your mother! Oh wait…", emotion: 'proud' },
    { text: "Caught! Now let's do what families do — chase someone else!", emotion: 'excited' },
];

// ----- SIDELINE CHEERS (during Clint chase) -----
export const LILLIAN_CHEER = [
    { text: "My tracker confirms you're closing in! 📡", emotion: 'techy' },
    { text: "Clint can't outrun my daughter's energy!", emotion: 'proud' },
    { text: "I calculated his top speed — you've got this!", emotion: 'determined' },
    { text: "Go Layla! Show him what engineering genes can do!", emotion: 'excited' },
];

// ----- INTERACTION GREETINGS (for NPC roaming) -----
export const LILLIAN_GREETINGS = {
    layla:   { text: "Hello sweetheart! Energy levels stable?", emotion: 'techy' },
    nolan:   { text: "Nolan, please tell me you didn't misplace the plasma coil again.", emotion: 'annoyed' },
    clint:   { text: "Clint! Remember, I have surveillance drones everywhere.", emotion: 'protective' },
};

export const LILLIAN_FAREWELL = {
    layla:   { text: "Stay safe, my little lightning bolt. ⚡", emotion: 'peaceful' },
    nolan:   { text: "I'll be in the lab. Don't blow anything up without me.", emotion: 'techy' },
    clint:   { text: "Keep her smiling. That's all I ask.", emotion: 'protective' },
};