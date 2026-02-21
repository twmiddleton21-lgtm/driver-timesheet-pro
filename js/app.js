/**
 * app.js - Main Application Controller
 * Coordinates all modules for the Driver Timesheet Pro application
 */

const App = {
  initialized: false,
  currentUser: null,
  isUnloading: false, // Track if page is unloading

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    console.log(
      `🚛 Driver Timesheet Pro v${CONFIG.APP_VERSION} initializing...`,
    );

    try {
      // FIXED: Load saved theme early (before any UI renders)
      if (typeof Settings !== "undefined" && Settings.loadSavedTheme) {
        Settings.loadSavedTheme();
      }

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
      // Only show error toast if not during page load
      if (!this.isUnloading && typeof UI !== "undefined") {
        UI.showToast("Failed to initialize app. Please refresh.", "error");
      }
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
    if (mainApp) {
      mainApp.classList.remove("hidden");
      // Ensure main app is clickable
      mainApp.style.pointerEvents = "auto";
    }

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

    // Ensure all nav items are clickable
    this.fixNavButtons();

    // Show welcome toast AFTER a small delay to ensure UI is ready
    // But only if not during page unload
    if (!this.isUnloading) {
      setTimeout(() => {
        const deviceInfo = Utils.getDeviceInfo();
        const welcomeMsg = fromBiometric
          ? `Welcome, ${user.username} (${deviceInfo.platform})`
          : `Welcome, ${user.username}`;
        UI.showToast(welcomeMsg);
      }, 100);
    }
  },

  /**
   * Fix nav buttons to ensure they're clickable
   */
  fixNavButtons() {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.style.pointerEvents = "auto";
      btn.style.position = "relative";
      btn.style.zIndex = "100";
    });

    // Ensure settings view is properly set up
    const settingsView = document.getElementById("settings-view");
    if (settingsView) {
      settingsView.style.pointerEvents = "auto";
    }

    // Remove any blocking overlays
    document.querySelectorAll(".fixed.inset-0").forEach((el) => {
      if (!el.id || el.id === "") {
        el.remove();
      }
    });
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

    // Handle online/offline - only show toasts if not unloading
    window.addEventListener("online", () => {
      if (!this.isUnloading && typeof UI !== "undefined") {
        UI.showToast("Back online", "success");
      }
    });

    window.addEventListener("offline", () => {
      if (!this.isUnloading && typeof UI !== "undefined") {
        UI.showToast("Offline mode - data saved locally", "info");
      }
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

    // Handle app installed - only show toast if not unloading
    window.addEventListener("appinstalled", () => {
      console.log("🎉 App installed");
      window.deferredInstallPrompt = null;
      if (!this.isUnloading && typeof UI !== "undefined") {
        UI.showToast("App installed successfully!", "success");
      }
    });

    // Handle page unload - close all modals silently (no toasts)
    window.addEventListener("beforeunload", () => {
      this.isUnloading = true; // Set flag to prevent toasts
      // Also set UI flag if available
      if (typeof UI !== "undefined") {
        UI._isUnloading = true;
      }
      this.closeAllModalsSilent(); // Use silent version
    });

    // Handle page load - ensure clean state and reset flags
    window.addEventListener("load", () => {
      this.isUnloading = false; // Reset flag
      if (typeof UI !== "undefined") {
        UI._isUnloading = false;
      }
      // Clear any stuck modals or overlays from previous session
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
    });

    // CRITICAL FIX: Use event delegation for all modal close buttons
    // This catches clicks even on dynamically added content
    document.addEventListener("click", (e) => {
      // Check if clicked element is or is inside a close button
      const closeBtn = e.target.closest(
        "[onclick*='closeWeekModal'], [onclick*='closeVORModal'], [onclick*='closeModal'], .modal-close, .close-modal, [data-close-modal], .close-btn",
      );

      if (closeBtn) {
        // Determine which modal to close
        const modal = closeBtn.closest("[id$='-modal']");
        if (modal) {
          e.preventDefault();
          e.stopPropagation();
          this.closeModal(modal.id);
          return;
        }
      }

      // Check if clicking on modal backdrop (the modal container itself, not its content)
      const clickedModal = e.target.closest("[id$='-modal']");
      if (clickedModal && e.target === clickedModal) {
        // Clicked on the backdrop/overlay itself
        this.closeModal(clickedModal.id);
      }
    });

    // Also setup direct handlers after a short delay to catch any already-rendered modals
    setTimeout(() => this.setupModalCloseHandlers(), 100);
  },

  /**
   * Setup modal close button handlers - direct attachment
   */
  setupModalCloseHandlers() {
    // Find ALL potential close buttons in modals
    const selectors = [
      "#week-modal button",
      "#vor-detail-modal button",
      "[id$='-modal'] button",
      "[id$='-modal'] [onclick*='close']",
      ".modal-close",
      ".close-modal",
      "[data-close-modal]",
      ".close-btn",
    ];

    document.querySelectorAll(selectors.join(", ")).forEach((btn) => {
      // Remove any existing click handlers to prevent duplicates
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Find the parent modal
        const modal = newBtn.closest("[id$='-modal']");
        if (modal) {
          console.log("Closing modal via direct handler:", modal.id);
          this.closeModal(modal.id);
        }
      });
    });
  },

  /**
   * Close a specific modal by ID
   */
  closeModal(modalId) {
    console.log("Attempting to close modal:", modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.style.pointerEvents = "";
      modal.style.display = "";

      console.log("✅ Modal closed:", modalId);

      // Restore body scroll if no other modals are open
      const anyOpen =
        document.querySelectorAll("[id$='-modal']:not(.hidden)").length > 0;
      if (!anyOpen) {
        document.body.style.overflow = "";
      }
      return true;
    }
    console.warn("❌ Modal not found:", modalId);
    return false;
  },

  /**
   * Close week modal specifically
   */
  closeWeekModal() {
    console.log("closeWeekModal called");
    return this.closeModal("week-modal");
  },

  /**
   * Close VOR detail modal specifically
   */
  closeVORModal() {
    console.log("closeVORModal called");
    return this.closeModal("vor-detail-modal");
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
   * Close all modals silently (no toasts, for page unload)
   */
  closeAllModalsSilent() {
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

// Expose close functions globally for inline onclick handlers
window.closeWeekModal = function () {
  console.log("Global closeWeekModal called");
  return App.closeWeekModal();
};
window.closeVORModal = function () {
  console.log("Global closeVORModal called");
  return App.closeVORModal();
};
window.closeModal = function (id) {
  console.log("Global closeModal called:", id);
  return App.closeModal(id);
};
window.closeAllModals = function () {
  console.log("Global closeAllModals called");
  return App.closeAllModals();
};
