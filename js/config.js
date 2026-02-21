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

// Settings management - FIXED: Proper dark mode persistence
const Settings = {
  // Initialize settings - delegates to settings.js initSettings()
  init(user) {
    console.log("⚙️ Settings.init() called, delegating to initSettings()");
    if (typeof initSettings === "function") {
      return initSettings(user);
    }
    console.warn("initSettings not available yet");
    return Promise.resolve();
  },

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

  // FIXED: Proper dark mode getter/setter with immediate DOM application
  get darkMode() {
    return localStorage.getItem("ts_dark_mode") === "true";
  },

  set darkMode(value) {
    localStorage.setItem("ts_dark_mode", value ? "true" : "false");
    this.applyDarkMode(value);
  },

  // FIXED: Apply dark mode to DOM immediately
  applyDarkMode(isDark) {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    // Update label if exists
    const label = document.getElementById("theme-label");
    if (label) {
      label.textContent = isDark ? "Light Mode" : "Dark Mode";
    }
    console.log("Dark mode applied:", isDark);
  },

  // FIXED: Load and apply saved dark mode on startup
  loadSavedTheme() {
    const isDark = this.darkMode;
    this.applyDarkMode(isDark);
    console.log("Loaded saved theme, dark mode:", isDark);
    return isDark;
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

  // UI Methods - delegate to settings.js global functions
  closeBiometricSetupModal() {
    if (typeof closeBiometricSetupModal === "function") {
      closeBiometricSetupModal();
    } else {
      const modal = document.getElementById("biometric-setup-modal");
      if (modal) modal.classList.add("hidden");
    }
  },

  updateBiometricSettingsUI() {
    if (typeof updateBiometricSettingsUI === "function") {
      updateBiometricSettingsUI();
    }
  },

  updateAPIStatusUI() {
    if (typeof updateApiKeyStatus === "function") {
      updateApiKeyStatus();
    }
  },

  updateStorageWidgetVisibility() {
    if (typeof updateStorageWidgetVisibility === "function") {
      updateStorageWidgetVisibility();
    }
  },

  showGeminiKeyModal() {
    if (typeof showGeminiKeyModal === "function") {
      showGeminiKeyModal();
    } else {
      const modal = document.getElementById("gemini-key-modal");
      if (modal) modal.classList.remove("hidden");
    }
  },

  closeGeminiKeyModal() {
    if (typeof closeGeminiKeyModal === "function") {
      closeGeminiKeyModal();
    } else {
      const modal = document.getElementById("gemini-key-modal");
      if (modal) modal.classList.add("hidden");
    }
  },

  saveGeminiKey() {
    if (typeof handleSaveGeminiKey === "function") {
      handleSaveGeminiKey();
    }
  },

  // FIXED: Toggle theme properly saves and applies
  toggleTheme() {
    const newValue = !this.darkMode;
    this.darkMode = newValue;
    console.log("Theme toggled, new dark mode:", newValue);
    return newValue;
  },

  toggleStorageWidget() {
    if (typeof toggleStorageWidget === "function") {
      toggleStorageWidget();
    }
  },

  toggleBiometric() {
    if (typeof toggleBiometricAuth === "function") {
      toggleBiometricAuth();
    }
  },

  showBiometricSetupModal() {
    if (typeof showBiometricSetupModal === "function") {
      showBiometricSetupModal();
    } else {
      const modal = document.getElementById("biometric-setup-modal");
      if (modal) modal.classList.remove("hidden");
    }
  },

  setupBiometricNow() {
    if (typeof setupBiometricNow === "function") {
      setupBiometricNow();
    } else {
      this.showBiometricSetupModal();
    }
  },

  showRemoveAccountConfirm() {
    if (typeof showRemoveAccountConfirm === "function") {
      showRemoveAccountConfirm();
    } else {
      const modal = document.getElementById("remove-account-modal");
      if (modal) modal.classList.remove("hidden");
    }
  },

  hideRemoveAccountModal() {
    if (typeof hideRemoveAccountModal === "function") {
      hideRemoveAccountModal();
    } else {
      const modal = document.getElementById("remove-account-modal");
      if (modal) modal.classList.add("hidden");
    }
  },

  async executeRemoveAccount() {
    if (typeof executeRemoveAccount === "function") {
      await executeRemoveAccount();
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

// FIXED: Apply saved theme immediately when script loads (before DOM ready)
(function loadThemeEarly() {
  const isDark = localStorage.getItem("ts_dark_mode") === "true";
  if (isDark) {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }
  console.log("Early theme load, dark mode:", isDark);
})();

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG, API, Settings, DOCS };
}
