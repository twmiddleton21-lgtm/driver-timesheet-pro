/**
 * app.js - Main Application Controller
 * Coordinates all modules for the Driver Timesheet Pro application
 */

const App = {
  initialized: false,
  currentUser: null,

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    console.log(
      `🚛 Driver Timesheet Pro v${CONFIG.APP_VERSION} initializing...`,
    );

    try {
      // Initialize database first
      await DB.init();
      console.log("✅ Database initialized");

      // Initialize all modules
      Utils.init();
      UI.init();

      // Initialize Auth BEFORE other modules that might depend on it
      await Auth.init();

      Calendar.init();
      Scan.init();
      VOR.init();
      History.init();

      // Initialize settings module
      if (typeof initSettings === "function") {
        initSettings();
      } else if (typeof Settings !== "undefined" && Settings.init) {
        Settings.init();
      }

      // Setup global event listeners
      this.setupGlobalEvents();

      this.initialized = true;
      console.log("✅ Application initialized successfully");
    } catch (error) {
      console.error("❌ Initialization failed:", error);
      UI.showToast("Failed to initialize app. Please refresh.", "error");
    }
  },

  /**
   * Handle successful login
   * @param {Object} user - User object
   * @param {boolean} fromBiometric - Whether login was via biometric
   */
  onLoginSuccess(user, fromBiometric = false) {
    console.log(
      `✅ Login successful: ${user.username} (${fromBiometric ? "biometric" : "PIN"})`,
    );

    this.currentUser = user;

    // Hide auth screen, show main app
    const authScreen = document.getElementById("auth-screen");
    const mainApp = document.getElementById("main-app");

    if (authScreen) authScreen.classList.add("hidden");
    if (mainApp) mainApp.classList.remove("hidden");

    // Initialize settings with current user - use initSettings from settings.js if available
    if (typeof initSettings === "function") {
      initSettings(user);
    } else if (typeof Settings !== "undefined" && Settings.init) {
      Settings.init(user);
    }

    // Set default dates
    this.setDefaultDates();

    // Initial render
    if (typeof Calendar !== "undefined") {
      Calendar.render();
      Calendar.updateStats();
      Calendar.renderRecent();
    }

    if (typeof DB !== "undefined" && DB.checkStorageQuota) {
      DB.checkStorageQuota();
    }

    // Update API key status and storage widget if functions exist
    if (typeof updateApiKeyStatus === "function") {
      updateApiKeyStatus();
    } else if (typeof Settings !== "undefined" && Settings.updateApiKeyStatus) {
      Settings.updateApiKeyStatus();
    }

    if (typeof updateStorageWidgetVisibility === "function") {
      updateStorageWidgetVisibility();
    } else if (
      typeof Settings !== "undefined" &&
      Settings.updateStorageWidgetVisibility
    ) {
      Settings.updateStorageWidgetVisibility();
    }

    // Show welcome toast
    const deviceInfo = Utils.getDeviceInfo();
    const welcomeMsg = fromBiometric
      ? `Welcome, ${user.username} (${deviceInfo.platform})`
      : `Welcome, ${user.username}`;
    UI.showToast(welcomeMsg);
  },

  /**
   * Switch between views
   * @param {string} viewName - Name of view to switch to
   */
  switchView(viewName) {
    console.log(`Switching to view: ${viewName}`);

    // Close all modals first to prevent any blocking layers
    this.closeAllModals();

    // Hide all views and reset their pointer events
    document.querySelectorAll(".view-section").forEach((el) => {
      el.classList.add("hidden");
      el.style.pointerEvents = "";
      el.style.display = "";
    });

    // Show selected view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
      targetView.classList.remove("hidden");
      targetView.style.pointerEvents = "auto";
      targetView.style.display = "";
      console.log(`✅ Showed view: ${viewName}-view`);
    } else {
      console.error(`❌ View not found: ${viewName}-view`);
      return;
    }

    // Update nav items
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.remove("active", "text-primary", "vor-active");
      el.classList.add("text-gray-400");
    });

    const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeBtn) {
      if (viewName === "vor") {
        activeBtn.classList.add("active", "vor-active");
      } else {
        activeBtn.classList.add("active", "text-primary");
      }
      activeBtn.classList.remove("text-gray-400");
    }

    // View-specific initialization
    if (viewName === "history" && typeof History !== "undefined")
      History.render();
    if (viewName === "dashboard") {
      if (typeof Calendar !== "undefined") {
        Calendar.render();
        Calendar.updateStats();
      }
    }
    if (viewName === "scan") {
      if (typeof updateApiKeyStatus === "function") {
        updateApiKeyStatus();
      } else if (
        typeof Settings !== "undefined" &&
        Settings.updateApiKeyStatus
      ) {
        Settings.updateApiKeyStatus();
      }
    }
    if (viewName === "vor") {
      if (typeof updateApiKeyStatus === "function") {
        updateApiKeyStatus();
      } else if (
        typeof Settings !== "undefined" &&
        Settings.updateApiKeyStatus
      ) {
        Settings.updateApiKeyStatus();
      }
    }
    if (viewName === "settings") {
      console.log("Initializing settings view");
      // Ensure settings user is set
      if (typeof initSettings === "function" && this.currentUser) {
        initSettings(this.currentUser);
      }
      if (typeof updateApiKeyStatus === "function") {
        updateApiKeyStatus();
      } else if (
        typeof Settings !== "undefined" &&
        Settings.updateApiKeyStatus
      ) {
        Settings.updateApiKeyStatus();
      }
      if (typeof updateBiometricSettingsUI === "function") {
        updateBiometricSettingsUI();
      } else if (
        typeof Settings !== "undefined" &&
        Settings.updateBiometricSettingsUI
      ) {
        Settings.updateBiometricSettingsUI();
      }
    }
    if (viewName === "archive" && typeof History !== "undefined")
      History.renderArchiveList();
  },

  /**
   * Set default dates for scan and VOR views
   */
  setDefaultDates() {
    const today = new Date();

    // Set scan date to next Saturday (week ending)
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + (6 - today.getDay()));
    const scanDateSelect = document.getElementById("scan-date-select");
    if (scanDateSelect) {
      scanDateSelect.value = Utils.formatDateForInput(saturday);
      // Trigger display update
      const event = new Event("change");
      scanDateSelect.dispatchEvent(event);
    }

    // Set VOR date to today
    const vorDateSelect = document.getElementById("vor-date-select");
    if (vorDateSelect) {
      vorDateSelect.value = Utils.formatDateForInput(today);
    }
  },

  /**
   * Setup global event listeners
   */
  setupGlobalEvents() {
    // Prevent zoom on double-tap (iOS)
    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      },
      false,
    );

    // Handle visibility change (app resume)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        console.log("App resumed");
      }
    });

    // Handle online/offline
    window.addEventListener("online", () => {
      UI.showToast("Back online", "success");
    });

    window.addEventListener("offline", () => {
      UI.showToast("Offline mode - data saved locally", "info");
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Escape to close modals
      if (e.key === "Escape") {
        this.closeAllModals();
      }

      // Ctrl/Cmd + number for view switching
      if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        const views = ["dashboard", "scan", "vor", "history", "settings"];
        const viewIndex = parseInt(e.key) - 1;
        if (views[viewIndex]) {
          this.switchView(views[viewIndex]);
        }
      }
    });

    // Handle app install prompt (PWA)
    window.addEventListener("beforeinstallprompt", (e) => {
      window.deferredInstallPrompt = e;
      console.log("👍 App installable");
    });

    // Handle app installed
    window.addEventListener("appinstalled", () => {
      console.log("🎉 App installed");
      window.deferredInstallPrompt = null;
      UI.showToast("App installed successfully!", "success");
    });

    // Handle page unload - close all modals to prevent "Document removed" message
    window.addEventListener("beforeunload", () => {
      this.closeAllModals();
    });

    // Handle page load - ensure clean state
    window.addEventListener("load", () => {
      // Clear any stuck modals or overlays from previous session
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
    });
  },

  /**
   * Close all open modals
   */
  closeAllModals() {
    const modals = [
      "gemini-key-modal",
      "biometric-setup-modal",
      "biometric-setup-prompt",
      "delete-modal",
      "remove-account-modal",
      "week-modal",
      "vor-detail-modal",
      "share-fallback-modal",
      "fullscreen-viewer",
      "auto-login-screen",
    ];

    modals.forEach((id) => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.add("hidden");
        modal.style.pointerEvents = "";
        modal.style.display = "";
      }
    });

    // Remove any lingering modal backdrops or blocking overlays
    document
      .querySelectorAll(".modal-backdrop, .fixed.inset-0.z-50")
      .forEach((el) => {
        if (el.id && modals.includes(el.id)) {
          el.classList.add("hidden");
        }
      });

    // Restore body scroll and pointer events
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
  },

  /**
   * Get current user
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentUser;
  },
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => App.init());
} else {
  App.init();
}
