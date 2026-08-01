/**
 * characters.js
 * ------------------------------------------------------------
 * Data-driven fighter roster. To add a new fighter later, add a
 * new object to FIGHTERS below (and drop matching art into
 * assets/characters/). Nothing in engine.js, fighter.js or
 * game.js needs to change.
 * ------------------------------------------------------------
 */

const FIGHTERS = {

  elephant: {
    id: "elephant",
    name: "The Elephant",
    faction: "Republican",
    tagline: "Heavyweight Powerhouse",
    portrait: "assets/characters/elephant.png",
    color: "#8a4a4a",       // health bar tint
    accent: "#c81d25",      // party accent color (red)

    // Base stats
    maxHealth: 120,
    maxStamina: 100,
    maxMeter: 100,
    walkSpeed: 130,         // px/sec
    weight: 1.35,           // affects knockback resistance

    moves: {
      punch:  { name: "Trunk Jab",     damage: 8,  staminaCost: 8,  startupMs: 90,  activeMs: 90,  recoveryMs: 220, range: 78,  knockback: 40 },
      kick:   { name: "Tusk Sweep",    damage: 12, staminaCost: 14, startupMs: 140, activeMs: 110, recoveryMs: 300, range: 88,  knockback: 70 },
      grapple:{ name: "Herd Slam",     damage: 20, staminaCost: 26, range: 60,     recoveryMs: 500, knockback: 160, knocksDown: true },
      special:{ name: "GOP Stampede",  damage: 26, meterCost: 100,  range: 130,    recoveryMs: 650, knockback: 220, knocksDown: true,
                description: "A charging trunk-first stampede across the ring." }
    },

    dialogue: {
      intro: ["Fiscal discipline starts with a strong defense.", "Lower taxes, higher stakes. Let's go."],
      punch: ["Free markets hit hard!", "That's a tariff you didn't see coming.", "Small government, big jab."],
      kick:  ["Deregulate THIS.", "States' rights to the shin!"],
      grapple:["Strong borders, stronger grip!", "This is what a balanced budget feels like."],
      special:["GOP STAMPEDE!", "Elephants never forget a tax hike!"],
      knockedDown: ["Recounting my votes...", "Just a rules dispute, I'm fine."],
      lowHealth: ["Still standing on principle.", "This isn't over till the polls close."],
      win: ["Landslide victory.", "The base is fired up tonight."],
      lose: ["We'll flip this district next cycle.", "A close race. Good campaign."],
      civicsBanter: [
        "Fun fact: the elephant became the GOP symbol thanks to an 1874 Thomas Nast cartoon.",
        "Republicans generally favor lower taxes and less federal regulation — that's their platform, not a universal truth.",
        "Fact: the U.S. has two major parties because of how our voting system is structured, not a law requiring it."
      ]
    }
  },

  donkey: {
    id: "donkey",
    name: "The Donkey",
    faction: "Democrat",
    tagline: "Fast Technical Striker",
    portrait: "assets/characters/donkey.png",
    color: "#3a4a7a",
    accent: "#1d4fc8",

    maxHealth: 105,
    maxStamina: 110,
    maxMeter: 100,
    walkSpeed: 165,
    weight: 1.0,

    moves: {
      punch:  { name: "Quick Combo",    damage: 6,  staminaCost: 6,  startupMs: 60,  activeMs: 70,  recoveryMs: 160, range: 74,  knockback: 30 },
      kick:   { name: "Spin Kick",      damage: 10, staminaCost: 11, startupMs: 100, activeMs: 90,  recoveryMs: 240, range: 82,  knockback: 55 },
      grapple:{ name: "Coalition Throw",damage: 17, staminaCost: 22, range: 58,     recoveryMs: 460, knockback: 150, knocksDown: true },
      special:{ name: "Blue Wave",      damage: 22, meterCost: 100,  range: 150,    recoveryMs: 600, knockback: 200, knocksDown: true,
                description: "A rapid multi-hit flurry that closes distance fast." }
    },

    dialogue: {
      intro: ["Time for some social progress!", "Let's talk policy — with our fists."],
      punch: ["That's a public option to the face!", "Universal healthcare for your jaw!", "Regulation? Try THIS regulation."],
      kick:  ["Green energy kick!", "Minimum wage, maximum impact!"],
      grapple:["Coalition building, right here!", "We rise together — you fall alone."],
      special:["BLUE WAVE incoming!", "This is what turnout looks like!"],
      knockedDown: ["Recount incoming...", "Just catching my breath, not my ballot."],
      lowHealth: ["Down but the movement isn't.", "Every vote counts, even this one."],
      win: ["The people have spoken.", "Turnout wins elections."],
      lose: ["We'll organize harder next time.", "Good fight. See you at the midterms."],
      civicsBanter: [
        "Fun fact: the donkey became linked to Democrats after an 1828 Andrew Jackson cartoon.",
        "Democrats generally favor more government involvement in the economy — that's their platform, not a universal truth.",
        "Fact: independents are now the largest single group of U.S. voters by self-identification in many polls."
      ]
    }
  },

  ferret: {
    id: "ferret",
    name: "The Ferret",
    faction: "Independent",
    tagline: "Counter / Submission Specialist",
    portrait: "assets/characters/ferret.png",
    color: "#7a6a3a",
    accent: "#c9a227",

    maxHealth: 95,
    maxStamina: 130,
    maxMeter: 100,
    walkSpeed: 190,
    weight: 0.85,

    moves: {
      punch:  { name: "Snap Jab",       damage: 5,  staminaCost: 5,  startupMs: 50, activeMs: 60,  recoveryMs: 130, range: 70, knockback: 25 },
      kick:   { name: "Flash Kick",     damage: 8,  staminaCost: 9,  startupMs: 80, activeMs: 70,  recoveryMs: 190, range: 76, knockback: 45 },
      grapple:{ name: "Independent Lock",damage: 24, staminaCost: 24, range: 55,    recoveryMs: 520, knockback: 140, knocksDown: true },
      special:{ name: "Third Party Rush",damage: 20, meterCost: 100, range: 140,    recoveryMs: 500, knockback: 180, knocksDown: true,
                description: "Blindingly fast counter-rush that punishes overcommitment." }
    },

    dialogue: {
      intro: ["I don't caucus with anybody.", "No party line, just results."],
      punch: ["Not on any platform!", "Unaffiliated and unbothered."],
      kick:  ["Split the ticket on that one!"],
      grapple:["No party owns this move!"],
      special:["THIRD PARTY RUSH!"],
      knockedDown: ["Still undecided about getting up."],
      lowHealth: ["I don't need a majority to keep fighting."],
      win: ["Didn't need a party to win this one."],
      lose: ["I'll caucus with the winner. Kidding. Rematch."],
      civicsBanter: [
        "Fact: independents can vote in either primary or neither, depending on the state's rules.",
        "Fun fact: black-footed ferrets are one of North America's most endangered mammals, unrelated to politics."

      ]
    }
  }
};

// Ordered roster list controls character-select display order.
const ROSTER_ORDER = [
  "elephant",
  "donkey",
  "ferret"
];

// Export roster for the rest of the game.
window.CHARACTERS = FIGHTERS;
window.ROSTER_ORDER = ROSTER_ORDER;
