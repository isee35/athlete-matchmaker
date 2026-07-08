export type SkillType = "baa" | "numeric_golf" | "numeric_rating";

export interface Subdivision {
  id: string;
  label: string;
}

export interface Sport {
  id: string;
  label: string;
  category: "golf" | "racket" | "basketball" | "volleyball" | "football" | "soccer" | "alternative" | "running" | "cycling" | "swimming" | "bowling";
  categoryLabel: string;
  emoji: string;
  subdivisions: Subdivision[];
  skillType: SkillType;
  skillLabel?: string; // e.g. "Handicap" for golf, "DUPR Rating" for pickleball
  skillVerifiedLabel?: string; // e.g. "USGA Verified"
  alternativeNotifyAll?: boolean; // true = if you select this sport, you get notified for all alternative sports
}

export const SPORTS: Sport[] = [
  // --- Golf ---
  {
    id: "golf",
    label: "Golf",
    category: "golf",
    categoryLabel: "Golf",
    emoji: "⛳",
    subdivisions: [
      { id: "driving_range", label: "Driving Range" },
      { id: "9_holes", label: "9 Holes" },
      { id: "18_holes", label: "18 Holes" },
    ],
    skillType: "numeric_golf",
    skillLabel: "Handicap",
    skillVerifiedLabel: "USGA Verified",
  },

  // --- Racket Sports ---
  {
    id: "pickleball",
    label: "Pickleball",
    category: "racket",
    categoryLabel: "Racket Sports",
    emoji: "🏓",
    subdivisions: [],
    skillType: "numeric_rating",
    skillLabel: "DUPR Rating",
    skillVerifiedLabel: "DUPR Verified",
  },
  {
    id: "tennis",
    label: "Tennis",
    category: "racket",
    categoryLabel: "Racket Sports",
    emoji: "🎾",
    subdivisions: [],
    skillType: "numeric_rating",
    skillLabel: "UTR / NTRP Rating",
    skillVerifiedLabel: "Officially Rated",
  },
  {
    id: "racquetball",
    label: "Racquetball",
    category: "racket",
    categoryLabel: "Racket Sports",
    emoji: "🏸",
    subdivisions: [],
    skillType: "baa",
  },
  {
    id: "paddle_smash",
    label: "Paddle Smash",
    category: "racket",
    categoryLabel: "Racket Sports",
    emoji: "🏏",
    subdivisions: [],
    skillType: "baa",
  },

  // --- Basketball ---
  {
    id: "basketball",
    label: "Basketball",
    category: "basketball",
    categoryLabel: "Basketball",
    emoji: "🏀",
    subdivisions: [
      { id: "1v1", label: "1 on 1" },
      { id: "3v3", label: "3 on 3" },
      { id: "5v5", label: "5 on 5" },
    ],
    skillType: "baa",
  },

  // --- Volleyball ---
  {
    id: "volleyball",
    label: "Volleyball",
    category: "volleyball",
    categoryLabel: "Volleyball",
    emoji: "🏐",
    subdivisions: [
      { id: "indoor", label: "Indoor" },
      { id: "beach", label: "Beach / Sand" },
    ],
    skillType: "baa",
  },

  // --- Football ---
  {
    id: "football",
    label: "Football",
    category: "football",
    categoryLabel: "Football",
    emoji: "🏈",
    subdivisions: [
      { id: "flag", label: "Flag Football" },
      { id: "two_hand_touch", label: "Two-Hand Touch" },
      { id: "passing_drills", label: "Passing Drills" },
      { id: "7v7", label: "7 on 7" },
    ],
    skillType: "baa",
  },

  // --- Soccer ---
  {
    id: "soccer",
    label: "Soccer",
    category: "soccer",
    categoryLabel: "Soccer",
    emoji: "⚽",
    subdivisions: [
      { id: "indoor", label: "Indoor" },
      { id: "7v7", label: "7 on 7" },
      { id: "11v11", label: "11 on 11" },
    ],
    skillType: "baa",
  },

  // --- Running ---
  {
    id: "running",
    label: "Running / Group Jog",
    category: "running",
    categoryLabel: "Running",
    emoji: "🏃",
    subdivisions: [],
    skillType: "baa",
  },

  // --- Cycling ---
  {
    id: "cycling",
    label: "Cycling",
    category: "cycling",
    categoryLabel: "Cycling",
    emoji: "🚴",
    subdivisions: [],
    skillType: "baa",
  },

  // --- Swimming ---
  {
    id: "swimming",
    label: "Swimming",
    category: "swimming",
    categoryLabel: "Swimming",
    emoji: "🏊",
    subdivisions: [
      { id: "open_swim", label: "Open Swim" },
      { id: "lap_swim", label: "Lap Swim" },
    ],
    skillType: "baa",
  },

  // --- Bowling ---
  {
    id: "bowling",
    label: "Bowling",
    category: "bowling",
    categoryLabel: "Bowling",
    emoji: "🎳",
    subdivisions: [],
    skillType: "baa",
  },

  // --- Alternative Sports ---
  {
    id: "disc_golf",
    label: "Disc Golf",
    category: "alternative",
    categoryLabel: "Alternative Sports",
    emoji: "🥏",
    subdivisions: [],
    skillType: "baa",
    alternativeNotifyAll: true,
  },
  {
    id: "cornhole",
    label: "Cornhole",
    category: "alternative",
    categoryLabel: "Alternative Sports",
    emoji: "🌽",
    subdivisions: [],
    skillType: "baa",
    alternativeNotifyAll: true,
  },
  {
    id: "spikeball",
    label: "Spike Ball",
    category: "alternative",
    categoryLabel: "Alternative Sports",
    emoji: "🟡",
    subdivisions: [],
    skillType: "baa",
    alternativeNotifyAll: true,
  },
  {
    id: "ramp_shot",
    label: "Ramp Shot",
    category: "alternative",
    categoryLabel: "Alternative Sports",
    emoji: "🎯",
    subdivisions: [],
    skillType: "baa",
    alternativeNotifyAll: true,
  },
];

export const SPORT_CATEGORIES = [
  { id: "golf", label: "Golf", emoji: "⛳" },
  { id: "racket", label: "Racket Sports", emoji: "🏓" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐" },
  { id: "football", label: "Football", emoji: "🏈" },
  { id: "soccer", label: "Soccer", emoji: "⚽" },
  { id: "running", label: "Running", emoji: "🏃" },
  { id: "cycling", label: "Cycling", emoji: "🚴" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
  { id: "bowling", label: "Bowling", emoji: "🎳" },
  { id: "alternative", label: "Alternative Sports", emoji: "🎯" },
];

export function getSportById(id: string) {
  return SPORTS.find((s) => s.id === id);
}

export function getSportsByCategory(category: string) {
  return SPORTS.filter((s) => s.category === category);
}
