/**
 * DRIVER TIMESHEET PRO - CONFIGURATION
 * App constants, settings, and configuration
 */

const CONFIG = {
  // App Info
  APP_VERSION: "5.3.0",
  APP_NAME: "Driver Timesheet Pro",

  // API Configuration
  GEMINI_MODEL: "gemini-2.0-flash",
  GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models",

  // Storage Configuration
  DB_NAME: "DriverTimesheetDB_v5",
  DB_VERSION: 4,

  // Store Names
  STORES: {
    images: "images",
    timesheets: "timesheets",
    archives: "archives",
    documents: "documents",
    vorReports: "vorReports",
    biometricCredentials: "biometricCredentials",
  },

  // File Size Limits (bytes)
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB for images
  MAX_DOCUMENT_SIZE: 20 * 1024 * 1024, // 20MB for documents

  // Image Processing
  MAX_IMAGE_WIDTH: 2000,
  IMAGE_QUALITY: 0.9,

  // OCR Settings
  OCR_TIMEOUT: 30000, // 30 seconds
  MAX_OCR_RETRIES: 3,

  // Date Formats
  DATE_FORMAT_INPUT: "YYYY-MM-DD",
  DATE_FORMAT_DISPLAY: "DD MMM YYYY",
  DATE_FORMAT_WEEK_RANGE: "MMM D",

  // Document Types
  DOC_TYPES: {
    1: { name: "Timesheet Front", icon: "fa-file-image" },
    2: { name: "Fuel & Expense", icon: "fa-gas-pump" },
    3: { name: "Circle Check", icon: "fa-clipboard-check" },
  },

  // Days of Week
  DAYS: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  DAYS_SHORT: ["S", "M", "T", "W", "T", "F", "S"],
  DAYS_FULL: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],

  // Theme Colors
  COLORS: {
    primary: "#3B82F6",
    secondary: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    dark: "#0F172A",
    darkCard: "#1E293B",
    darkSurface: "#334155",
    vorOrange: "#F97316",
    biometric: "#8B5CF6",
  },

  // UI Settings
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 250,

  // Feature Flags
  FEATURES: {
    biometricAuth: true,
    autoOCR: true,
    documentUpload: true,
    vorReporting: true,
    darkMode: true,
    pwa: false, // Set to true when service worker is added
  },
};

// API Key management
const API = {
  getKey() {
    return localStorage.getItem("gemini_api_key") || "";
  },

  setKey(key) {
    localStorage.setItem("gemini_api_key", key);
  },

  hasKey() {
    const key = this.getKey();
    return key && key.length > 10 && key.startsWith("AIza");
  },

  clearKey() {
    localStorage.removeItem("gemini_api_key");
  },
};

// Settings management
const Settings = {
  get(key, defaultValue = null) {
    const value = localStorage.getItem(`ts_setting_${key}`);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  set(key, value) {
    localStorage.setItem(`ts_setting_${key}`, JSON.stringify(value));
  },

  get showStorageWidget() {
    return this.get("showStorageWidget", true);
  },

  set showStorageWidget(value) {
    this.set("showStorageWidget", value);
  },

  get darkMode() {
    return localStorage.getItem("darkMode") === "true";
  },

  set darkMode(value) {
    localStorage.setItem("darkMode", value ? "true" : "false");
    if (value) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  },

  get lastLoggedInUser() {
    return localStorage.getItem("lastLoggedInUser") || null;
  },

  set lastLoggedInUser(username) {
    if (username) {
      localStorage.setItem("lastLoggedInUser", username);
    } else {
      localStorage.removeItem("lastLoggedInUser");
    }
  },
};

// Document names helper
const DOCS = {
  getName(num) {
    return CONFIG.DOC_TYPES[num]?.name || "Document";
  },

  getIcon(num) {
    return CONFIG.DOC_TYPES[num]?.icon || "fa-file";
  },

  getAll() {
    return CONFIG.DOC_TYPES;
  },
};

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG, API, Settings, DOCS };
}
