/**
 * DRIVER TIMESHEET PRO - UI UTILITIES
 * Shared UI components, modals, and interactions
 */

const UI = {
  // ==========================================
  // INITIALIZATION
  // ==========================================

  /**
   * Initialize UI module
   */
  init() {
    console.log("🎨 UI initialized");
    // Ensure toast starts completely hidden and non-interactive
    const toast = document.getElementById("toast");
    if (toast) {
      toast.classList.add(
        "-translate-y-20",
        "opacity-0",
        "pointer-events-none",
      );
      toast.style.pointerEvents = "none";
    }
    return Promise.resolve();
  },

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================

  /**
   * Show toast notification
   */
  showToast(message, type = "success") {
    // SILENT DURING PAGE LOAD/UNLOAD: Don't show toasts in first 2 seconds or if unloading
    if (this._isPageLoading || this._isUnloading) {
      console.log("Toast suppressed (page loading/unloading):", message);
      return;
    }

    const toast = document.getElementById("toast");
    const msgEl = document.getElementById("toast-message");
    const iconEl = document.getElementById("toast-icon");

    if (!toast || !msgEl || !iconEl) {
      console.warn("Toast elements not found, falling back to alert");
      alert(message);
      return;
    }

    // Set icon based on type
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      info: "fa-info-circle",
      warning: "fa-exclamation-triangle",
    };

    const colors = {
      success: "text-green-400",
      error: "text-red-400",
      info: "text-blue-400",
      warning: "text-amber-400",
    };

    iconEl.className = `fas ${icons[type] || icons.success} ${colors[type] || colors.success} dark:${colors[type] || colors.success}`;
    msgEl.textContent = message;

    // Show toast - enable pointer events when visible
    toast.classList.remove(
      "-translate-y-20",
      "opacity-0",
      "pointer-events-none",
    );
    toast.style.pointerEvents = "auto";

    // Hide after delay
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.add(
        "-translate-y-20",
        "opacity-0",
        "pointer-events-none",
      );
      toast.style.pointerEvents = "none";
    }, 3000);
  },

  // Alias for compatibility
  show(message, type = "success") {
    return this.showToast(message, type);
  },

  // ==========================================
  // SILENT MODE CONTROL
  // ==========================================

  _isPageLoading: true, // Start as true
  _isUnloading: false,

  /**
   * Enable silent mode (no toasts)
   */
  enableSilentMode() {
    this._isUnloading = true;
    console.log("UI silent mode enabled");
  },

  /**
   * Disable silent mode (allow toasts)
   */
  disableSilentMode() {
    this._isUnloading = false;
    console.log("UI silent mode disabled");
  },

  // ==========================================
  // MODAL MANAGEMENT
  // ==========================================

  modals: {},

  /**
   * Create and show modal
   */
  showModal(id, content, options = {}) {
    const defaults = {
      backdrop: true,
      closeOnBackdrop: true,
      className: "",
    };
    const opts = { ...defaults, ...options };

    // Create modal element
    const modal = document.createElement("div");
    modal.id = id;
    modal.className = `fixed inset-0 z-50 ${opts.className}`;

    modal.innerHTML = `
            ${opts.backdrop ? `<div class="modal-backdrop" ${opts.closeOnBackdrop ? `onclick="UI.closeModal('${id}')"` : ""}></div>` : ""}
            <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <div class="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto slide-up">
                    ${content}
                </div>
            </div>
        `;

    document.body.appendChild(modal);
    this.modals[id] = modal;

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    return modal;
  },

  /**
   * Close modal
   */
  closeModal(id) {
    const modal = this.modals[id];
    if (modal) {
      modal.remove();
      delete this.modals[id];
    }

    // Restore body scroll if no modals open
    if (Object.keys(this.modals).length === 0) {
      document.body.style.overflow = "";
    }
  },

  /**
   * Close all modals
   */
  closeAllModals() {
    Object.keys(this.modals).forEach((id) => this.closeModal(id));
  },

  // ==========================================
  // FULLSCREEN IMAGE VIEWER
  // ==========================================

  /**
   * Open fullscreen image viewer
   */
  viewImage(imageUrl, filename, docType, docData) {
    const viewer = document.createElement("div");
    viewer.className = "fullscreen-image-viewer";
    viewer.id = "fullscreen-viewer";
    viewer.onclick = (e) => {
      if (
        e.target === viewer ||
        e.target.classList.contains("viewer-content")
      ) {
        this.closeImageViewer();
      }
    };

    viewer.innerHTML = `
            <div class="viewer-header">
                <button class="close-btn" onclick="UI.closeImageViewer()" type="button">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="viewer-content">
                <img src="${imageUrl}" alt="${filename}">
            </div>
            <div class="viewer-footer">
                <div class="filename-container">
                    <div class="filename">${filename}</div>
                    <div class="doc-type-label">${docType}</div>
                </div>
                <button class="share-btn-large" onclick="UI.shareImage('${imageUrl}', '${filename}', '${docType}')" type="button">
                    <i class="fas fa-share-alt"></i>
                    Share
                </button>
            </div>
        `;

    document.body.appendChild(viewer);
    document.body.style.overflow = "hidden";

    // Add escape key handler
    this._viewerEscapeHandler = (e) => {
      if (e.key === "Escape") this.closeImageViewer();
    };
    document.addEventListener("keydown", this._viewerEscapeHandler);
  },

  /**
   * Close image viewer
   */
  closeImageViewer() {
    const viewer = document.getElementById("fullscreen-viewer");
    if (viewer) {
      viewer.remove();
      document.body.style.overflow = "";
    }
    if (this._viewerEscapeHandler) {
      document.removeEventListener("keydown", this._viewerEscapeHandler);
    }
  },

  /**
   * Share image from viewer
   */
  async shareImage(imageUrl, filename, docType) {
    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: docType,
            text: `${docType} - ${filename}`,
            files: [file],
          });
          return;
        }
      } catch (e) {
        console.log("Native share failed:", e);
      }
    }

    // Fallback: download
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = filename;
    link.click();
    this.showToast("Image saved to downloads", "success");
  },

  // ==========================================
  // CONFIRMATION DIALOGS
  // ==========================================

  /**
   * Show confirmation dialog
   */
  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const defaults = {
        title: "Confirm",
        confirmText: "Yes",
        cancelText: "Cancel",
        danger: false,
      };
      const opts = { ...defaults, ...options };

      const content = `
                <div class="p-6 text-center">
                    <div class="w-16 h-16 ${opts.danger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"} rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas ${opts.danger ? "fa-exclamation-triangle" : "fa-question"} text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">${opts.title}</h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-6">${message}</p>
                    <div class="flex gap-3">
                        <button onclick="UI.closeModal('confirm-modal'); window._confirmCallback(false)" class="flex-1 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-dark-surface">
                            ${opts.cancelText}
                        </button>
                        <button onclick="UI.closeModal('confirm-modal'); window._confirmCallback(true)" class="flex-1 py-3 rounded-xl ${opts.danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-blue-600"} text-white font-semibold">
                            ${opts.confirmText}
                        </button>
                    </div>
                </div>
            `;

      window._confirmCallback = (result) => {
        delete window._confirmCallback;
        resolve(result);
      };

      this.showModal("confirm-modal", content, { closeOnBackdrop: false });
    });
  },

  /**
   * Show alert dialog
   */
  alert(message, title = "Notice") {
    return new Promise((resolve) => {
      const content = `
                <div class="p-6 text-center">
                    <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-info text-2xl"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">${title}</h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-6">${message}</p>
                    <button onclick="UI.closeModal('alert-modal'); window._alertCallback()" class="w-full py-3 rounded-xl bg-primary hover:bg-blue-600 text-white font-semibold">
                        OK
                    </button>
                </div>
            `;

      window._alertCallback = () => {
        delete window._alertCallback;
        resolve();
      };

      this.showModal("alert-modal", content, { closeOnBackdrop: false });
    });
  },

  // ==========================================
  // FORM HELPERS
  // ==========================================

  /**
   * Get form data as object
   */
  getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const data = {};
    const elements = form.querySelectorAll("input, select, textarea");

    elements.forEach((el) => {
      if (el.name) {
        if (el.type === "checkbox") {
          data[el.name] = el.checked;
        } else if (el.type === "number") {
          data[el.name] = parseFloat(el.value) || 0;
        } else {
          data[el.name] = el.value;
        }
      }
    });

    return data;
  },

  /**
   * Set form data from object
   */
  setFormData(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;

    Object.keys(data).forEach((key) => {
      const el = form.querySelector(`[name="${key}"]`);
      if (el) {
        if (el.type === "checkbox") {
          el.checked = !!data[key];
        } else {
          el.value = data[key] || "";
        }
      }
    });
  },

  /**
   * Clear form
   */
  clearForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.reset();
  },

  /**
   * Validate required fields
   */
  validateRequired(formId, fields) {
    const form = document.getElementById(formId);
    if (!form) return { valid: true };

    const data = this.getFormData(formId);
    const missing = [];

    fields.forEach((field) => {
      if (!data[field] || data[field] === "") {
        missing.push(field);
        const el = form.querySelector(`[name="${field}"]`);
        if (el) {
          el.classList.add("border-red-500");
          setTimeout(() => el.classList.remove("border-red-500"), 3000);
        }
      }
    });

    return {
      valid: missing.length === 0,
      missing,
    };
  },

  // ==========================================
  // LOADING STATES
  // ==========================================

  /**
   * Show loading overlay on element
   */
  setLoading(elementId, loading = true, text = "Loading...") {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (loading) {
      el.classList.add("relative");
      const overlay = document.createElement("div");
      overlay.className =
        "absolute inset-0 bg-white/80 dark:bg-dark/80 flex items-center justify-center z-10 loading-overlay";
      overlay.innerHTML = `
                <div class="text-center">
                    <div class="spinner mb-2"></div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${text}</p>
                </div>
            `;
      el.appendChild(overlay);
    } else {
      const overlay = el.querySelector(".loading-overlay");
      if (overlay) overlay.remove();
    }
  },

  /**
   * Set button loading state
   */
  setButtonLoading(buttonId, loading = true, text = null) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    if (loading) {
      btn._originalText = btn.innerHTML;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${text || "Loading..."}`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn._originalText || btn.innerHTML;
      btn.disabled = false;
    }
  },

  // ==========================================
  // SCROLL HELPERS
  // ==========================================

  /**
   * Scroll to element
   */
  scrollTo(elementId, options = {}) {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        ...options,
      });
    }
  },

  /**
   * Scroll to top
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // ==========================================
  // THEME TOGGLE
  // ==========================================

  /**
   * Toggle dark mode
   */
  toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");

    // Update label if exists
    const label = document.getElementById("theme-label");
    if (label) {
      label.textContent = isDark ? "Light Mode" : "Dark Mode";
    }

    return isDark;
  },

  // ==========================================
  // EMPTY STATES
  // ==========================================

  /**
   * Create empty state HTML
   */
  emptyState(icon, title, text) {
    return `
            <div class="empty-state">
                <i class="fas ${icon} empty-state-icon"></i>
                <h4 class="empty-state-title">${title}</h4>
                <p class="empty-state-text">${text}</p>
            </div>
        `;
  },

  // ==========================================
  // PROGRESS BARS
  // ==========================================

  /**
   * Update progress bar
   */
  updateProgress(barId, percentage, text = null) {
    const bar = document.getElementById(barId);
    const textEl = document.getElementById(`${barId}-text`);

    if (bar) {
      bar.style.width = `${percentage}%`;
    }
    if (textEl && text) {
      textEl.textContent = text;
    }
  },
};

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = UI;
}

// CRITICAL: Expose to window for browser global access
window.UI = UI;

// Global compatibility for functions that might be called directly
window.showToast = (message, type) => UI.showToast(message, type);
window.show = (message, type) => UI.show(message, type);

// NEW: Disable silent mode after page loads
setTimeout(() => {
  UI._isPageLoading = false;
  console.log("UI toasts enabled");
}, 2000);
