const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];
const DELETE_ROLES = ["Captain", "ViceCaptain", "Owner"];
const VIEW_ROLES = ["Captain", "ViceCaptain", "Facilitator", "TeamLead", "TeamMember", "Owner"];

const UPLOAD_UNITS = ["sq.ft", "feet", "inch", "cm", "m"];
const FLOWER_TYPES = ["Natural", "Artificial", "Both"];
const EVENT_TYPES = ["Wedding", "Corporate", "Birthday", "Gala", "Conference", "Social"];
const DECOR_TYPES = [
  "Name board",
  "Stage Ceiling",
  "Hall side Decoration",
  "Hall ceiling work",
  "Hall Entrance",
  "Receiption Area",
  "Pathway",
  "Main Entrance",
  "Orchestra Stage",
  "Car Decoration",
  "Selfie Area",
  "Bedroom Decoration",
  "Home Decoration",
  "Lighting work in Home",
  "Lighting work in Mahal",
  "Audio work",
];

const VENUES = ["Indoor", "Outdoor", "Ballroom", "Garden", "Historic", "Industrial"];
const EVENT_TIMES = ["Morning", "Afternoon", "Evening/Night"];
const SIZE_FILTERS = ["Small (1-50)", "Medium (51-200)", "Large (200+)", "Extra Large (500+)"];

const COLORS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Charcoal Gray", hex: "#36454f" },
  { name: "Royal Blue", hex: "#4169e1" },
  { name: "Bright Red", hex: "#dc2626" },
  { name: "Light Pink", hex: "#f9a8d4" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Peach", hex: "#fca5a5" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Silver", hex: "#9ca3af" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Green", hex: "#22c55e" },
  { name: "Orange", hex: "#f97316" },
  { name: "Brown", hex: "#92400e" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Cream", hex: "#fef3c7" },
  { name: "Lavender", hex: "#c4b5fd" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Burgundy", hex: "#881337" },
  { name: "Mint", hex: "#6ee7b7" },
  { name: "Coral", hex: "#fb7185" },
  { name: "Rose Gold", hex: "#fda4af" },
  { name: "Champagne", hex: "#f7dc6f" },
];

const DEFAULT_PAGE_SIZE = 20;
const MAX_COLORS_SELECT = 3;
const MAX_SIZE_INPUT = 4;

const PRICE_RANGE = { MIN: 0, MAX: 10000, STEP: 50 };

module.exports = {
  UPLOAD_ROLES,
  DELETE_ROLES,
  VIEW_ROLES,
  UPLOAD_UNITS,
  FLOWER_TYPES,
  EVENT_TYPES,
  DECOR_TYPES,
  VENUES,
  EVENT_TIMES,
  SIZE_FILTERS,
  COLORS,
  DEFAULT_PAGE_SIZE,
  MAX_COLORS_SELECT,
  MAX_SIZE_INPUT,
  PRICE_RANGE,
};