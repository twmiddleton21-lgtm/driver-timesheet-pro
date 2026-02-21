/**
 * settings.js - Settings & Configuration Module
 * Handles settings view, storage, API keys, theme, and data management
 */

// Settings State
let showStorageWidget = localStorage.getItem("showStorageWidget") !== "false";
let currentSettingsUser = null;

/**
 * Initialize settings module
 * @param {Object} user - Current user object
 */
function initSettings(user) {
  console.log("⚙️ Settings initialized");
  currentSettingsUser = user || Auth.getCurrentUser();
  updateApiKeyStatus();
  checkStorageQuota();
  updateStorageWidgetToggle();
  updateBiometricSettingsUI();
  updateThemeLabel();
  return Promise.resolve();
}

/**
 * Update API key status display
 */
function updateApiKeyStatus() {
  const isConfigured = isGeminiConfigured();
  const badge = document.getElementById("api-status-badge");
  const btnText = document.getElementById("api-key-btn-text");
  const status = document.getElementById("api-key-status");
  const warning = document.getElementById("api-key-warning");
  const vorWarning = document.getElementById("vor-api-key-warning");

  if (isConfigured) {
    if (badge) {
      badge.textContent = "Active";
      badge.className =
        "px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium";
    }
    if (btnText) btnText.textContent = "Update API Key";
    if (status) {
      const key = getGeminiKey();
      status.textContent = "Key ending in ..." + key.slice(-4);
    }
    if (warning) warning.classList.add("hidden");
    if (vorWarning) vorWarning.classList.add("hidden");
  } else {
    if (badge) {
      badge.textContent = "Not Configured";
      badge.className =
        "px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium";
    }
    if (btnText) btnText.textContent = "Configure API Key";
    if (status) status.textContent = "Required for AI scanning";

    // Show warning if on scan/vor view
    const scanView = document.getElementById("scan-view");
    const vorView = document.getElementById("vor-view");
    if (warning && scanView && !scanView.classList.contains("hidden")) {
      warning.classList.remove("hidden");
    }
    if (vorWarning && vorView && !vorView.classList.contains("hidden")) {
      vorWarning.classList.remove("hidden");
    }
  }
}

/**
 * Check if Gemini API is configured
 * @returns {boolean}
 */
function isGeminiConfigured() {
  const key = getGeminiKey();
  return key && key.length > 10 && key.startsWith("AIza");
}

/**
 * Get Gemini API key
 * @returns {string}
 */
function getGeminiKey() {
  return localStorage.getItem("gemini_api_key") || "";
}

/**
 * Save Gemini API key
 * @param {string} key - API key
 */
function saveGeminiKey(key) {
  if (!key || key.length < 10 || !key.startsWith("AIza")) {
    showToast(
      "Please enter a valid Gemini API key (starts with AIza...)",
      "error",
    );
    return false;
  }

  localStorage.setItem("gemini_api_key", key);
  updateApiKeyStatus();
  showToast("API key saved successfully!");
  return true;
}

/**
 * Show Gemini API key modal
 */
function showGeminiKeyModal() {
  const modal = document.getElementById("gemini-key-modal");
  const input = document.getElementById("gemini-api-key-input");
  if (input && getGeminiKey()) {
    input.value = getGeminiKey();
  }
  if (modal) modal.classList.remove("hidden");
}

/**
 * Close Gemini API key modal
 */
function closeGeminiKeyModal() {
  const modal = document.getElementById("gemini-key-modal");
  if (modal) modal.classList.add("hidden");
}

/**
 * Handle save API key from modal
 */
function handleSaveGeminiKey() {
  const input = document.getElementById("gemini-api-key-input");
  if (!input) return;

  const key = input.value.trim();
  if (saveGeminiKey(key)) {
    closeGeminiKeyModal();
  }
}

/**
 * Update storage widget visibility
 */
function updateStorageWidgetToggle() {
  const toggle = document.getElementById("storage-widget-toggle");
  if (toggle) {
    if (showStorageWidget) {
      toggle.classList.add("active");
    } else {
      toggle.classList.remove("active");
    }
  }
}

/**
 * Toggle storage widget display
 */
function toggleStorageWidget() {
  showStorageWidget = !showStorageWidget;
  localStorage.setItem("showStorageWidget", showStorageWidget);
  updateStorageWidgetToggle();

  const widget = document.getElementById("storage-widget");
  if (widget) {
    widget.style.display = showStorageWidget ? "block" : "none";
  }

  showToast(
    showStorageWidget ? "Storage widget enabled" : "Storage widget hidden",
  );
}

/**
 * Update storage widget visibility on dashboard
 */
function updateStorageWidgetVisibility() {
  const widget = document.getElementById("storage-widget");
  if (widget) {
    widget.style.display = showStorageWidget ? "block" : "none";
  }
}

/**
 * Update biometric settings UI
 */
async function updateBiometricSettingsUI() {
  if (!currentSettingsUser) {
    currentSettingsUser = Auth.getCurrentUser();
  }

  if (!currentSettingsUser) return;

  const title = document.getElementById("biometric-setting-title");
  const status = document.getElementById("biometric-setting-status");
  const iconStatus = document.getElementById("biometric-icon-status");
  const toggle = document.getElementById("biometric-toggle");
  const infoBox = document.getElementById("biometric-info-box");
  const infoText = document.getElementById("biometric-info-text");
  const setupBtn = document.getElementById("setup-biometric-btn");

  const deviceInfo = getDeviceInfo();
  const biometricAvailable = await checkBiometricAvailability();

  if (!biometricAvailable) {
    if (title) title.textContent = deviceInfo.platform;
    if (status) {
      status.textContent = "Not available on this device";
      status.className = "text-xs text-gray-500";
    }
    if (iconStatus) {
      iconStatus.innerHTML = '<i class="fas fa-times text-gray-400"></i>';
      iconStatus.className =
        "w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center";
    }
    if (toggle) {
      toggle.classList.remove("active");
      toggle.style.display = "none";
    }
    if (infoBox) infoBox.classList.remove("hidden");
    if (infoText) {
      infoText.textContent =
        "Your device does not support biometric authentication or it is not enabled in system settings.";
    }
    if (setupBtn) setupBtn.classList.add("hidden");
    return;
  }

  // Check if user has biometric registered
  const cred = await getBiometricCredentials(currentSettingsUser.username);
  const userEnabled =
    localStorage.getItem(`biometric_${currentSettingsUser.username}`) ===
    "true";

  if (cred && userEnabled) {
    if (title) title.textContent = deviceInfo.platform;
    if (status) {
      status.textContent = "Enabled and ready";
      status.className = "text-xs text-green-600 dark:text-green-400";
    }
    if (iconStatus) {
      iconStatus.innerHTML = '<i class="fas fa-check text-white"></i>';
      iconStatus.className =
        "w-10 h-10 rounded-full bg-green-500 flex items-center justify-center";
    }
    if (toggle) {
      toggle.classList.add("active");
      toggle.style.display = "block";
    }
    if (infoBox) infoBox.classList.add("hidden");
    if (setupBtn) setupBtn.classList.add("hidden");
  } else {
    if (title) title.textContent = deviceInfo.platform;
    if (status) {
      status.textContent = "Not set up";
      status.className = "text-xs text-gray-500";
    }
    if (iconStatus) {
      iconStatus.innerHTML = '<i class="fas fa-fingerprint text-gray-400"></i>';
      iconStatus.className =
        "w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center";
    }
    if (toggle) {
      toggle.classList.remove("active");
      toggle.style.display = "block";
    }
    if (infoBox) infoBox.classList.remove("hidden");
    if (infoText) {
      infoText.textContent = `Enable ${deviceInfo.platform} for faster, more secure login on this device. Your biometric data never leaves this device.`;
    }
    if (setupBtn) setupBtn.classList.remove("hidden");
  }
}

/**
 * Toggle biometric authentication
 */
async function toggleBiometricAuth() {
  if (!currentSettingsUser) {
    currentSettingsUser = Auth.getCurrentUser();
  }

  if (!currentSettingsUser) return;

  const toggle = document.getElementById("biometric-toggle");
  const isEnabled = toggle && toggle.classList.contains("active");

  if (isEnabled) {
    // Disable biometric
    if (confirm("Disable Face ID / Touch ID login?")) {
      await deleteBiometricCredential(currentSettingsUser.username);
      localStorage.setItem(
        `biometric_${currentSettingsUser.username}`,
        "false",
      );
      if (toggle) toggle.classList.remove("active");
      await updateBiometricSettingsUI();
      showToast("Biometric login disabled");
    }
  } else {
    // Enable biometric - show setup modal
    // Ensure we're not already showing a modal
    const existingModal = document.getElementById("biometric-setup-modal");
    if (existingModal && !existingModal.classList.contains("hidden")) {
      return; // Already showing
    }
    showBiometricSetupModal();
  }
}

/**
 * Show biometric setup modal
 */
function showBiometricSetupModal() {
  const modal = document.getElementById("biometric-setup-modal");
  if (modal) {
    modal.classList.remove("hidden");
    // Ensure the modal doesn't block clicks
    modal.style.pointerEvents = "auto";
  }
}

/**
 * Close biometric setup modal
 */
function closeBiometricSetupModal() {
  const modal = document.getElementById("biometric-setup-modal");
  if (modal) {
    modal.classList.add("hidden");
    // Ensure pointer events are reset
    modal.style.pointerEvents = "";
  }

  // Also ensure body scroll is restored and no backdrop remains
  document.body.style.overflow = "";

  // Remove any lingering modal backdrops
  const backdrops = document.querySelectorAll(".modal-backdrop");
  backdrops.forEach((backdrop) => backdrop.remove());
}

/**
 * Start biometric registration process
 */
async function startBiometricRegistration() {
  const btn = document.getElementById("start-biometric-setup-btn");
  if (!btn) return;

  // Ensure we have the current user
  if (!currentSettingsUser) {
    currentSettingsUser = Auth.getCurrentUser();
  }

  if (!currentSettingsUser) {
    showToast("No user logged in", "error");
    return;
  }

  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';
  btn.disabled = true;

  try {
    await registerBiometric(currentSettingsUser.username);

    localStorage.setItem(`biometric_${currentSettingsUser.username}`, "true");
    localStorage.setItem("lastLoggedInUser", currentSettingsUser.username);

    // Close modal properly
    closeBiometricSetupModal();

    // Update UI
    const toggle = document.getElementById("biometric-toggle");
    if (toggle) toggle.classList.add("active");

    await updateBiometricSettingsUI();
    showToast(`${getDeviceInfo().platform} enabled successfully!`);
  } catch (error) {
    console.error("Setup error:", error);
    showToast("Setup failed. Please try again.", "error");
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/**
 * Setup biometric from settings page
 */
function setupBiometricNow() {
  // Ensure we have current user before showing modal
  if (!currentSettingsUser) {
    currentSettingsUser = Auth.getCurrentUser();
  }
  showBiometricSetupModal();
}

// Helper functions for biometric
async function checkBiometricAvailability() {
  if (typeof Auth !== "undefined" && Auth.isWebAuthnSupported) {
    return await Auth.isWebAuthnSupported();
  }
  return false;
}

async function getBiometricCredentials(username) {
  if (typeof DB !== "undefined" && DB.getBiometricCredential) {
    return await DB.getBiometricCredential(username);
  }
  return null;
}

async function deleteBiometricCredential(username) {
  if (typeof DB !== "undefined" && DB.deleteBiometricCredential) {
    return await DB.deleteBiometricCredential(username);
  }
}

async function registerBiometric(username) {
  if (typeof Auth !== "undefined" && Auth.registerBiometric) {
    return await Auth.registerBiometric(username);
  }
  throw new Error("Biometric registration not available");
}

function getDeviceInfo() {
  if (typeof Utils !== "undefined" && Utils.getDeviceInfo) {
    return Utils.getDeviceInfo();
  }
  return {
    platform: "Biometric",
    hasFaceID: false,
    isApple: /iPhone|iPad|Mac/.test(navigator.userAgent),
  };
}

/**
 * Update theme label - FIXED to check actual DOM state
 */
function updateThemeLabel() {
  const isDark = document.documentElement.classList.contains("dark");
  const label = document.getElementById("theme-label");
  if (label) {
    label.textContent = isDark ? "Light Mode" : "Dark Mode";
  }
}

/**
 * Toggle theme - FIXED to use Settings object for persistence
 */
function toggleTheme() {
  // Use Settings object which properly saves to localStorage
  if (typeof Settings !== "undefined" && Settings.toggleTheme) {
    const isDark = Settings.toggleTheme();
    updateThemeLabel();
    return isDark;
  }

  // Fallback if Settings not available
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("ts_dark_mode", isDark ? "true" : "false");
  updateThemeLabel();
  return isDark;
}

/**
 * Show delete options modal
 * @param {string} type - 'week' or 'month'
 */
function showDeleteOptions(type) {
  const modal = document.getElementById("delete-modal");
  const title = document.getElementById("delete-modal-title");
  const content = document.getElementById("delete-options-content");

  if (!modal || !title || !content) return;

  if (!currentSettingsUser) {
    currentSettingsUser = Auth.getCurrentUser();
  }

  const timesheets = DB.timesheets.getAll(currentSettingsUser.username);

  if (type === "week") {
    title.textContent = "Delete Specific Week";
    const weeks = [...new Set(timesheets.map((ts) => ts.weekRange))];

    if (weeks.length === 0) {
      content.innerHTML =
        '<p class="text-gray-500 text-center py-4">No weeks to delete</p>';
    } else {
      content.innerHTML = weeks
        .map((week) => {
          const ts = timesheets.find((t) => t.weekRange === week);
          return `
                    <button onclick="confirmDeleteWeek('${ts.weekStart}')" class="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-dark-surface rounded-xl mb-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <div>
                            <span class="font-medium text-gray-900 dark:text-white block">${week}</span>
                            <span class="text-xs text-gray-500">${ts.totalHours}h • ${ts.firstWorkingDay || "Unknown"} start</span>
                        </div>
                        <i class="fas fa-trash text-red-500"></i>
                    </button>
                `;
        })
        .join("");
    }
  } else if (type === "month") {
    title.textContent = "Delete Month";
    const months = {};

    timesheets.forEach((ts) => {
      const date = new Date(ts.weekStart);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!months[key]) {
        months[key] = {
          year: date.getFullYear(),
          month: date.getMonth(),
          count: 0,
          hours: 0,
        };
      }
      months[key].count++;
      months[key].hours += ts.totalHours;
    });

    const monthList = Object.values(months);
    if (monthList.length === 0) {
      content.innerHTML =
        '<p class="text-gray-500 text-center py-4">No data to delete</p>';
    } else {
      content.innerHTML = monthList
        .map(
          (m) => `
                <button onclick="confirmDeleteMonth(${m.year}, ${m.month})" class="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-dark-surface rounded-xl mb-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <div>
                        <span class="font-medium text-gray-900 dark:text-white block">${new Date(m.year, m.month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                        <span class="text-xs text-gray-500">${m.count} weeks • ${m.hours.toFixed(1)}h</span>
                    </div>
                    <i class="fas fa-trash text-red-500"></i>
                </button>
            `,
        )
        .join("");
    }
  }

  modal.classList.remove("hidden");
}

/**
 * Show VOR delete options
 */
async function showDeleteVOROptions() {
  const modal = document.getElementById("delete-modal");
  const title = document.getElementById("delete-modal-title");
  const content = document.getElementById("delete-options-content");

  if (!modal || !title || !content) return;

  if (!currentSettingsUser) {
    currentSettingsUser = Auth.getCurrentUser();
  }

  title.textContent = "Delete VOR Reports";

  const vorReports = await DB.getVORReports(currentSettingsUser.username);

  if (vorReports.length === 0) {
    content.innerHTML =
      '<p class="text-gray-500 text-center py-4">No VOR reports to delete</p>';
  } else {
    content.innerHTML = vorReports
      .map(
        (vor) => `
            <button onclick="confirmDeleteVOR('${vor.id}')" class="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-dark-surface rounded-xl mb-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <div>
                    <span class="font-medium text-gray-900 dark:text-white block">Defect #${vor.defectNumber}</span>
                    <span class="text-xs text-gray-500">${vor.date} • ${vor.regNumber || "No reg"}</span>
                </div>
                <i class="fas fa-trash text-red-500"></i>
            </button>
        `,
      )
      .join("");
  }

  modal.classList.remove("hidden");
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
  const modal = document.getElementById("delete-modal");
  if (modal) modal.classList.add("hidden");
}

/**
 * Delete all data confirmation
 */
async function deleteAllData() {
  if (
    !confirm(
      "DELETE ALL TIMESHEET DATA?\n\nThis will remove every timesheet and document. This cannot be undone.",
    )
  ) {
    return;
  }

  if (!confirm("Are you absolutely sure?")) {
    return;
  }

  if (!currentSettingsUser) {
    currentSettingsUser = Auth.getCurrentUser();
  }

  await DB.clearAll();
  DB.timesheets.save(currentSettingsUser.username, []);

  // Refresh views
  if (typeof Calendar !== "undefined") {
    Calendar.render();
    Calendar.updateStats();
    Calendar.renderRecent();
  }

  const preview = document.getElementById("week-preview");
  if (preview) preview.classList.add("hidden");

  checkStorageQuota();
  showToast("All data deleted");
}

/**
 * Show account removal confirmation
 */
function showRemoveAccountConfirm() {
  const modal = document.getElementById("remove-account-modal");
  if (modal) modal.classList.remove("hidden");
}

/**
 * Hide account removal modal
 */
function hideRemoveAccountModal() {
  const modal = document.getElementById("remove-account-modal");
  if (modal) modal.classList.add("hidden");
}

/**
 * Execute account removal
 */
async function executeRemoveAccount() {
  hideRemoveAccountModal();

  const removalScreen = document.getElementById("final-removal-screen");
  if (removalScreen) removalScreen.classList.remove("hidden");

  try {
    await DB.clearAll();
  } catch (e) {
    console.log("Store clearing failed:", e);
  }

  if (currentSettingsUser) {
    DB.users.delete(currentSettingsUser.username);
  }

  // Animate removal
  await new Promise((r) => setTimeout(r, 300));
  const check = document.getElementById("removal-check");
  const title = document.getElementById("removal-title");
  const text = document.getElementById("removal-text");

  if (check) check.classList.remove("opacity-0");
  await new Promise((r) => setTimeout(r, 300));
  if (title) title.classList.remove("opacity-0");
  await new Promise((r) => setTimeout(r, 200));
  if (text) text.classList.remove("opacity-0");

  // Clear caches
  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (e) {
      console.log("Cache clearing failed:", e);
    }
  }

  // Clear all app data after delay
  setTimeout(() => {
    localStorage.clear();
    indexedDB.deleteDatabase(CONFIG.DB_NAME);
    location.reload();
  }, 3000);
}

/**
 * Manage archives - switch to archive view
 */
function manageArchives() {
  switchView("archive");
}

// Storage quota check helper
async function checkStorageQuota() {
  if (typeof DB !== "undefined" && DB.checkStorageQuota) {
    await DB.checkStorageQuota();
  }
}

// Expose functions to window for inline onclick handlers
window.initSettings = initSettings;
window.updateApiKeyStatus = updateApiKeyStatus;
window.isGeminiConfigured = isGeminiConfigured;
window.getGeminiKey = getGeminiKey;
window.saveGeminiKey = saveGeminiKey;
window.showGeminiKeyModal = showGeminiKeyModal;
window.closeGeminiKeyModal = closeGeminiKeyModal;
window.handleSaveGeminiKey = handleSaveGeminiKey;
window.toggleStorageWidget = toggleStorageWidget;
window.updateStorageWidgetVisibility = updateStorageWidgetVisibility;
window.updateBiometricSettingsUI = updateBiometricSettingsUI;
window.toggleBiometricAuth = toggleBiometricAuth;
window.showBiometricSetupModal = showBiometricSetupModal;
window.closeBiometricSetupModal = closeBiometricSetupModal;
window.startBiometricRegistration = startBiometricRegistration;
window.setupBiometricNow = setupBiometricNow;
window.showDeleteOptions = showDeleteOptions;
window.showDeleteVOROptions = showDeleteVOROptions;
window.closeDeleteModal = closeDeleteModal;
window.deleteAllData = deleteAllData;
window.showRemoveAccountConfirm = showRemoveAccountConfirm;
window.hideRemoveAccountModal = hideRemoveAccountModal;
window.executeRemoveAccount = executeRemoveAccount;
window.manageArchives = manageArchives;
window.toggleTheme = toggleTheme;
window.updateThemeLabel = updateThemeLabel;
window.checkBiometricAvailability = checkBiometricAvailability;
window.getBiometricCredentials = getBiometricCredentials;
window.deleteBiometricCredential = deleteBiometricCredential;
window.registerBiometric = registerBiometric;
window.getDeviceInfo = getDeviceInfo;
