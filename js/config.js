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
  // Initialize settings
  init() {
    console.log("⚙️ Settings initialized");
    this.updateAPIStatusUI();
    this.updateBiometricSettingsUI();
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

  // UI Methods needed by auth.js
  closeBiometricSetupModal() {
    const modal = document.getElementById("biometric-setup-modal");
    if (modal) modal.classList.add("hidden");
  },

  updateBiometricSettingsUI() {
    // Update the biometric toggle in settings view
    const toggle = document.getElementById("biometric-toggle");
    const statusText = document.getElementById("biometric-setting-status");
    const iconStatus = document.getElementById("biometric-icon-status");

    if (Auth.currentUser) {
      const enabled =
        localStorage.getItem(`biometric_${Auth.currentUser.username}`) ===
        "true";
      if (toggle) {
        toggle.classList.toggle("active", enabled);
      }
      if (statusText) {
        statusText.textContent = enabled ? "Enabled" : "Not enabled";
      }
      if (iconStatus) {
        iconStatus.className = `w-10 h-10 rounded-full flex items-center justify-center ${enabled ? "bg-purple-100 text-purple-600" : "bg-gray-200 text-gray-500"}`;
      }
    }
  },

  showGeminiKeyModal() {
    const modal = document.getElementById("gemini-key-modal");
    if (modal) modal.classList.remove("hidden");
  },

  closeGeminiKeyModal() {
    const modal = document.getElementById("gemini-key-modal");
    if (modal) modal.classList.add("hidden");
  },

  saveGeminiKey() {
    const input = document.getElementById("gemini-api-key-input");
    const key = input?.value.trim();

    if (key && key.startsWith("AIza")) {
      API.setKey(key);
      this.closeGeminiKeyModal();
      if (typeof UI !== "undefined") {
        UI.showToast("API Key saved successfully!", "success");
      }
      this.updateAPIStatusUI();
    } else {
      if (typeof UI !== "undefined") {
        UI.showToast(
          "Please enter a valid API key starting with 'AIza'",
          "error",
        );
      } else {
        alert("Please enter a valid API key starting with 'AIza'");
      }
    }
  },

  updateAPIStatusUI() {
    const badge = document.getElementById("api-status-badge");
    const btnText = document.getElementById("api-key-btn-text");
    const status = document.getElementById("api-key-status");

    if (API.hasKey()) {
      if (badge) {
        badge.textContent = "Configured";
        badge.className =
          "px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium";
      }
      if (btnText) btnText.textContent = "Update API Key";
      if (status) status.textContent = "Ready for AI scanning";
    } else {
      if (badge) {
        badge.textContent = "Not Configured";
        badge.className =
          "px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium";
      }
      if (btnText) btnText.textContent = "Configure API Key";
      if (status) status.textContent = "Required for AI scanning";
    }
  },

  toggleTheme() {
    this.darkMode = !this.darkMode;
    const label = document.getElementById("theme-label");
    if (label) {
      label.textContent = this.darkMode ? "Light Mode" : "Dark Mode";
    }
  },

  toggleStorageWidget() {
    this.showStorageWidget = !this.showStorageWidget;
    const toggle = document.getElementById("storage-widget-toggle");
    if (toggle) toggle.classList.toggle("active");

    const widget = document.getElementById("storage-widget");
    if (widget) {
      widget.style.display = this.showStorageWidget ? "block" : "none";
    }
  },

  toggleBiometric() {
    if (!Auth.currentUser) return;

    const enabled =
      localStorage.getItem(`biometric_${Auth.currentUser.username}`) === "true";

    if (enabled) {
      // Disable biometric
      localStorage.removeItem(`biometric_${Auth.currentUser.username}`);
      DB.deleteBiometricCredential(Auth.currentUser.username);
      if (typeof UI !== "undefined") {
        UI.showToast("Biometric login disabled", "success");
      }
    } else {
      // Show setup modal
      this.showBiometricSetupModal();
      return;
    }

    this.updateBiometricSettingsUI();
  },

  showBiometricSetupModal() {
    const modal = document.getElementById("biometric-setup-modal");
    if (modal) modal.classList.remove("hidden");
  },

  setupBiometricNow() {
    this.showBiometricSetupModal();
  },

  showRemoveAccountConfirm() {
    const modal = document.getElementById("remove-account-modal");
    if (modal) modal.classList.remove("hidden");
  },

  hideRemoveAccountModal() {
    const modal = document.getElementById("remove-account-modal");
    if (modal) modal.classList.add("hidden");
  },

  async executeRemoveAccount() {
    if (!Auth.currentUser) return;

    const username = Auth.currentUser.username;

    // Delete all user data
    await DB.clearAllUserData(username);

    // Delete user account
    DB.users.delete(username);

    // Show final screen
    const finalScreen = document.getElementById("final-removal-screen");
    if (finalScreen) {
      finalScreen.classList.remove("hidden");

      // Animate elements
      setTimeout(() => {
        document.getElementById("removal-check").style.opacity = "1";
      }, 100);
      setTimeout(() => {
        document.getElementById("removal-title").style.opacity = "1";
      }, 300);
      setTimeout(() => {
        document.getElementById("removal-text").style.opacity = "1";
      }, 500);
    }

    // Clear all app data after delay
    setTimeout(() => {
      localStorage.clear();
      indexedDB.deleteDatabase(CONFIG.DB_NAME);
      location.reload();
    }, 3000);
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
