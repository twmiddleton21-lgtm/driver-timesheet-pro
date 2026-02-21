/**
 * DRIVER TIMESHEET PRO - UTILITIES
 * Date formatting, calculations, and helper functions
 */

const Utils = {
  // ==========================================
  // INITIALIZATION
  // ==========================================

  /**
   * Initialize utilities module
   */
  init() {
    console.log("📦 Utils initialized");
    return Promise.resolve();
  },

  // ==========================================
  // DATE UTILITIES
  // ==========================================

  /**
   * Format date for input field (YYYY-MM-DD)
   */
  formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  /**
   * Parse date string to Date object
   * Handles multiple formats
   */
  parseDate(dateString) {
    if (!dateString) return new Date();

    if (dateString instanceof Date) return dateString;

    // Handle ISO format (YYYY-MM-DD)
    if (typeof dateString === "string" && dateString.includes("-")) {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        // Ensure we're parsing as local date by setting time to noon
        return new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
          12,
          0,
          0,
        );
      }
    }

    return new Date(dateString);
  },

  /**
   * Format date for display (e.g., "14 Feb 2026")
   */
  formatDateDisplay(date, options = {}) {
    const d = this.parseDate(date);
    const defaultOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...options,
    };
    return d.toLocaleDateString("en-GB", defaultOptions);
  },

  /**
   * Format week range (e.g., "Feb 5-11")
   */
  formatWeekRange(startDate, endDate) {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    const options = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
  },

  /**
   * Get Saturday (week ending) for a given date
   */
  getWeekEnding(date = new Date()) {
    const d = this.parseDate(date);
    const day = d.getDay();
    const diff = 6 - day; // Days until Saturday
    const saturday = new Date(d);
    saturday.setDate(d.getDate() + diff);
    return saturday;
  },

  /**
   * Get week start (Sunday) for a given week ending
   */
  getWeekStart(weekEnding) {
    const end = this.parseDate(weekEnding);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return start;
  },

  /**
   * Parse week ending date from various formats
   */
  parseWeekEndingDate(dateStr) {
    const formats = [
      // DD-MM-YYYY or DD/MM/YYYY
      /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
      // DD-MM-YY or DD/MM/YY
      /(\d{1,2})[-/](\d{1,2})[-/](\d{2})/,
      // 1 Jan 2024 or 1 January 2024
      /(\d{1,2})\s+(\w+)\s+(\d{4})/i,
      // ISO format YYYY-MM-DD
      /(\d{4})-(\d{2})-(\d{2})/,
    ];

    const monthNames = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (!match) continue;

      let day, month, year;

      // Check if it's the ISO format (YYYY-MM-DD)
      if (match[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      }
      // Check if it's text month format
      else if (match[0].match(/\d{1,2}\s+\w+\s+\d{4}/i)) {
        day = parseInt(match[1]);
        month = monthNames.indexOf(match[2].toLowerCase().substring(0, 3));
        year = parseInt(match[3]);
      }
      // Standard DD-MM-YYYY format
      else {
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = parseInt(match[3]);
      }

      // Handle 2-digit years
      if (year < 100) year = 2000 + year;

      // Validate
      if (month >= 0 && month < 12 && day > 0 && day <= 31) {
        const date = new Date(year, month, day, 12, 0, 0);
        if (date.getDate() === day && date.getMonth() === month) {
          return date;
        }
      }
    }

    return null;
  },

  /**
   * Parse VOR date (DD-MM-YY format common in defect reports)
   */
  parseVORDate(dateStr) {
    // Try DD-MM-YYYY or DD/MM/YYYY
    const match = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (match) {
      let day = parseInt(match[1]);
      let month = parseInt(match[2]) - 1;
      let year = parseInt(match[3]);
      if (year < 100) year += 2000;

      const date = new Date(year, month, day, 12, 0, 0);
      if (date.getDate() === day) return date;
    }
    return null;
  },

  /**
   * Check if two dates are the same day
   */
  isSameDay(date1, date2) {
    const d1 = this.parseDate(date1);
    const d2 = this.parseDate(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  },

  /**
   * Get first day of month
   */
  getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1);
  },

  /**
   * Get last day of month
   */
  getLastDayOfMonth(year, month) {
    return new Date(year, month + 1, 0);
  },

  // ==========================================
  // TIME CALCULATIONS
  // ==========================================

  /**
   * Calculate hours between two times (HH:MM format)
   */
  calculateHoursBetween(startTime, endTime) {
    if (!startTime || !endTime) return 0;

    const parseTime = (t) => {
      const [h, m] = t.split(":").map(Number);
      return { h: h || 0, m: m || 0 };
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    let startMinutes = start.h * 60 + start.m;
    let endMinutes = end.h * 60 + end.m;

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    return (endMinutes - startMinutes) / 60;
  },

  /**
   * Format time from various formats to HH:MM
   */
  formatTime(timeStr) {
    if (!timeStr) return null;

    // Already in HH:MM format
    if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;

    // HHMM format (e.g., "0758" -> "07:58")
    if (timeStr.match(/^\d{4}$/)) {
      return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
    }

    // H:MM format (e.g., "7:58" -> "07:58")
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return `${match[1].padStart(2, "0")}:${match[2]}`;
    }

    return timeStr;
  },

  // ==========================================
  // STRING UTILITIES
  // ==========================================

  /**
   * Hash a PIN (simple hash for comparison)
   */
  hashPin(pin) {
    if (!pin) return "";
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  },

  /**
   * Truncate text with ellipsis
   */
  truncate(str, length = 50) {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + "...";
  },

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  },

  // ==========================================
  // ARRAY/OBJECT UTILITIES
  // ==========================================

  /**
   * Group array by key
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = result[group] || [];
      result[group].push(item);
      return result;
    }, {});
  },

  /**
   * Sort array by date (newest first)
   */
  sortByDate(array, dateKey = "date") {
    return [...array].sort((a, b) => {
      const dateA = this.parseDate(a[dateKey]);
      const dateB = this.parseDate(b[dateKey]);
      return dateB - dateA;
    });
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    wait =
      wait || (typeof CONFIG !== "undefined" ? CONFIG.DEBOUNCE_DELAY : 250);
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // ==========================================
  // VALIDATION
  // ==========================================

  /**
   * Validate PIN (4 digits)
   */
  isValidPin(pin) {
    return /^\d{4}$/.test(pin);
  },

  /**
   * Validate defect number format
   */
  isValidDefectNumber(num) {
    return /^\d{5,6}$/.test(num);
  },

  /**
   * Validate UK registration number (basic)
   */
  isValidRegNumber(reg) {
    // Basic UK reg format: AB12 CDE or similar
    return /^[A-Z]{2}\d{2}\s?[A-Z]{3}$/i.test(reg);
  },

  /**
   * Check if value is empty/null/undefined
   */
  isEmpty(value) {
    return value === null || value === undefined || value === "";
  },

  // ==========================================
  // DEVICE DETECTION
  // ==========================================

  /**
   * Get device information
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(ua) && !window.MSStream;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isMobile = isIOS || isAndroid || /Mobile/.test(ua);

    // Face ID available on iPhone X and later, iPad Pro
    const hasFaceID =
      isIOS &&
      !/iPod/.test(ua) &&
      ((/iPhone/.test(ua) && !/iPhone [5678]/.test(ua)) ||
        (/iPad/.test(ua) && /Pro/.test(ua)));

    // Touch ID on most Apple devices with biometric
    const hasTouchID = isApple && !hasFaceID;

    return {
      isApple,
      isIOS,
      isAndroid,
      isMobile,
      hasFaceID,
      hasTouchID,
      platform: isApple ? (hasFaceID ? "Face ID" : "Touch ID") : "Biometric",
      userAgent: ua,
    };
  },

  /**
   * Check if WebAuthn is supported
   */
  async isWebAuthnSupported() {
    if (!window.PublicKeyCredential) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  // ==========================================
  // STORAGE UTILITIES
  // ==========================================

  /**
   * Check storage quota
   */
  async checkStorage() {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const { usage, quota } = await navigator.storage.estimate();
        return {
          used: usage || 0,
          quota: quota || 0,
          percent: quota ? Math.round((usage / quota) * 100) : 0,
          usedMB: ((usage || 0) / (1024 * 1024)).toFixed(1),
          quotaMB: quota ? (quota / (1024 * 1024)).toFixed(0) : "Unknown",
        };
      } catch (e) {
        console.error("Storage estimate failed:", e);
      }
    }
    return null;
  },
};

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Utils;
}

// CRITICAL: Expose to window for browser global access
window.Utils = Utils;
