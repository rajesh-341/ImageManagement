const UPLOAD_ROLES = ["Captain", "ViceCaptain", "Owner"];
const DELETE_ROLES = ["Captain", "ViceCaptain", "Owner", "Facilitator", "TeamLead", "TeamMember", "Marketing", "Admin"];
const VIEW_ROLES = ["Captain", "ViceCaptain", "Facilitator", "TeamLead", "TeamMember", "Marketing", "Admin", "Owner"];
const FOLDER_VIEW_ROLES = ["Captain", "ViceCaptain", "Admin", "Owner"];

const UPLOAD_UNITS = ["sq.ft", "feet", "inch", "cm", "m"];
const FLOWER_TYPES = ["Natural", "Artificial", "Both"];
const EVENT_TYPES = [
  "Wedding", "Puberty", "House Warming", "Ear Piercing", "Baby Shower",
  "Birthday", "Inauguration", "Meeting", "25th Wedding Anniversary",
  "Shashtiabdapoorti", "Surprise Gift", "Salagai Poojai", "Annual Day",
  "Labour Day", "Naming Ceremony", "Holy Communion", "Farewell",
  "Kari Virundhu", "Get Together"
];
const DECOR_TYPES = [
  "Name board", "Stage Ceiling", "Hall side Decoration",
  "Hall ceiling work", "Hall Entrance", "Receiption Area",
  "Pathway", "Main Entrance", "Orchestra Stage", "Car Decoration",
  "Selfie Area", "Bedroom Decoration", "Home Decoration",
  "Lighting work in Home", "Lighting work in Mahal", "Audio work",
];

const VENUES = ["Indoor", "Outdoor", "Ballroom", "Garden", "Historic", "Industrial"];
const EVENT_TIMES = ["Morning", "Afternoon", "Evening/Night"];
const SIZE_FILTERS = ["Small (1-50)", "Medium (51-200)", "Large (200+)", "Extra Large (500+)"];

const COLORS = [
  { name: "Red", hex: "#dc2626" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Brown", hex: "#92400e" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Light Blue", hex: "#93c5fd" },
  { name: "Dark Blue", hex: "#1e40af" },
  { name: "Light Green", hex: "#86efac" },
  { name: "Dark Green", hex: "#166534" },
  { name: "Sky Blue", hex: "#38bdf8" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Olive Green", hex: "#808000" },
  { name: "Beige", hex: "#f5f5dc" },
  { name: "Cream", hex: "#fef3c7" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Silver", hex: "#9ca3af" },
  { name: "Bronze", hex: "#cd7f32" },
  { name: "Copper", hex: "#b87333" },
  { name: "Rose Gold", hex: "#fda4af" },
];

const DEFAULT_PAGE_SIZE = 20;
const MAX_COLORS_SELECT = 3;
const MAX_SIZE_INPUT = 4;

const PRICE_RANGE = { MIN: 0, MAX: 10000, STEP: 50 };

module.exports = {
  UPLOAD_ROLES,
  DELETE_ROLES,
  VIEW_ROLES,
  FOLDER_VIEW_ROLES,
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
