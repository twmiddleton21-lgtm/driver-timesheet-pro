/**
 * DRIVER TIMESHEET PRO - DATABASE
 * IndexedDB and localStorage management
 */

const DB = {
  // IndexedDB instance
  imageDB: null,

  // ==========================================
  // INITIALIZATION
  // ==========================================

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.imageDB) return this.imageDB;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB error:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.imageDB = request.result;
        resolve(this.imageDB);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Images store
        if (!db.objectStoreNames.contains(CONFIG.STORES.images)) {
          db.createObjectStore(CONFIG.STORES.images, { keyPath: "id" });
        }

        // Documents store
        if (!db.objectStoreNames.contains(CONFIG.STORES.documents)) {
          const docStore = db.createObjectStore(CONFIG.STORES.documents, {
            keyPath: "id",
          });
          docStore.createIndex("weekStart", "weekStart", { unique: false });
        }

        // Timesheets store
        if (!db.objectStoreNames.contains(CONFIG.STORES.timesheets)) {
          const tsStore = db.createObjectStore(CONFIG.STORES.timesheets, {
            keyPath: "id",
          });
          tsStore.createIndex("weekStart", "weekStart", { unique: false });
          tsStore.createIndex("archived", "archived", { unique: false });
        }

        // Archives store
        if (!db.objectStoreNames.contains(CONFIG.STORES.archives)) {
          db.createObjectStore(CONFIG.STORES.archives, { keyPath: "id" });
        }

        // VOR Reports store
        if (!db.objectStoreNames.contains(CONFIG.STORES.vorReports)) {
          const vorStore = db.createObjectStore(CONFIG.STORES.vorReports, {
            keyPath: "id",
          });
          vorStore.createIndex("defectNumber", "defectNumber", {
            unique: false,
          });
          vorStore.createIndex("date", "date", { unique: false });
        }

        // Biometric credentials store
        if (!db.objectStoreNames.contains(CONFIG.STORES.biometricCredentials)) {
          db.createObjectStore(CONFIG.STORES.biometricCredentials, {
            keyPath: "id",
          });
        }
      };
    });
  },

  // ==========================================
  // GENERIC CRUD OPERATIONS
  // ==========================================

  /**
   * Save data to store
   */
  async save(storeName, id, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.imageDB.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put({
        id,
        ...data,
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get data from store
   */
  async get(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.imageDB.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Delete from store
   */
  async delete(storeName, id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.imageDB.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get all from store
   */
  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.imageDB.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Clear entire store
   */
  async clear(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.imageDB.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Query by index
   */
  async queryByIndex(storeName, indexName, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.imageDB.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  // ==========================================
  // USER MANAGEMENT (localStorage)
  // ==========================================

  users: {
    getAll() {
      return JSON.parse(localStorage.getItem("ts_users") || "[]");
    },

    save(users) {
      localStorage.setItem("ts_users", JSON.stringify(users));
    },

    get(username) {
      return this.getAll().find((u) => u.username === username);
    },

    exists(username) {
      return this.getAll().some((u) => u.username === username);
    },

    add(user) {
      const users = this.getAll();
      users.push({
        ...user,
        created: new Date().toISOString(),
      });
      this.save(users);
      return user;
    },

    delete(username) {
      const users = this.getAll().filter((u) => u.username !== username);
      this.save(users);
      // Clean up user data
      localStorage.removeItem(`ts_data_${username}`);
      localStorage.removeItem(`ts_settings_${username}`);
      localStorage.removeItem(`biometric_${username}`);
    },

    validatePin(username, pin) {
      const user = this.get(username);
      return user && user.pin === Utils.hashPin(pin);
    },
  },

  // ==========================================
  // TIMESHEET DATA (localStorage + IndexedDB)
  // ==========================================

  timesheets: {
    getAll(username) {
      return JSON.parse(localStorage.getItem(`ts_data_${username}`) || "[]");
    },

    save(username, data) {
      localStorage.setItem(`ts_data_${username}`, JSON.stringify(data));
    },

    getById(username, id) {
      return this.getAll(username).find((t) => t.id === id);
    },

    getByWeekStart(username, weekStart) {
      return this.getAll(username).find((t) => t.weekStart === weekStart);
    },

    add(username, timesheet) {
      const all = this.getAll(username);
      all.push(timesheet);
      this.save(username, all);
      return timesheet;
    },

    update(username, id, updates) {
      const all = this.getAll(username);
      const index = all.findIndex((t) => t.id === id);
      if (index !== -1) {
        all[index] = {
          ...all[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        this.save(username, all);
        return all[index];
      }
      return null;
    },

    delete(username, weekStart) {
      const all = this.getAll(username);
      const filtered = all.filter((t) => t.weekStart !== weekStart);
      this.save(username, filtered);
    },

    deleteByMonth(username, year, month) {
      const all = this.getAll(username);
      const filtered = all.filter((t) => {
        const d = Utils.parseDate(t.weekStart);
        return !(d.getFullYear() === year && d.getMonth() === month);
      });
      this.save(username, filtered);
    },
  },

  // ==========================================
  // DOCUMENTS (IndexedDB)
  // ==========================================

  async getDocumentsForWeek(weekStart) {
    return await DB.queryByIndex(
      CONFIG.STORES.documents,
      "weekStart",
      weekStart,
    );
  },

  async saveDocument(docId, data) {
    return await DB.save(CONFIG.STORES.documents, docId, data);
  },

  async deleteDocument(docId) {
    return await DB.delete(CONFIG.STORES.documents, docId);
  },

  // ==========================================
  // IMAGES (IndexedDB)
  // ==========================================

  async saveImage(imageId, dataUrl) {
    return await DB.save(CONFIG.STORES.images, imageId, { data: dataUrl });
  },

  async getImage(imageId) {
    const result = await DB.get(CONFIG.STORES.images, imageId);
    return result?.data || null;
  },

  async deleteImage(imageId) {
    return await DB.delete(CONFIG.STORES.images, imageId);
  },

  // ==========================================
  // VOR REPORTS (IndexedDB)
  // ==========================================

  async getVORReports(username) {
    const all = await DB.getAll(CONFIG.STORES.vorReports);
    return all
      .filter((r) => r.username === username)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async saveVORReport(report) {
    return await DB.save(CONFIG.STORES.vorReports, report.id, report);
  },

  async deleteVORReport(reportId) {
    const report = await DB.get(CONFIG.STORES.vorReports, reportId);
    if (report) {
      // Clean up images
      if (report.mainImageId) await DB.deleteImage(report.mainImageId);
      if (report.additionalImageId)
        await DB.deleteImage(report.additionalImageId);
      await DB.delete(CONFIG.STORES.vorReports, reportId);
    }
    return report;
  },

  async searchVORReports(username, searchTerm) {
    const all = await this.getVORReports(username);
    const term = searchTerm.toLowerCase();
    return all.filter(
      (r) =>
        (r.defectNumber && r.defectNumber.toLowerCase().includes(term)) ||
        (r.regNumber && r.regNumber.toLowerCase().includes(term)),
    );
  },

  // ==========================================
  // BIOMETRIC CREDENTIALS (IndexedDB)
  // ==========================================

  async getBiometricCredential(username) {
    return await DB.get(
      CONFIG.STORES.biometricCredentials,
      `biometric_${username}`,
    );
  },

  async saveBiometricCredential(username, credential) {
    const deviceInfo = Utils.getDeviceInfo();
    return await DB.save(
      CONFIG.STORES.biometricCredentials,
      `biometric_${username}`,
      {
        username,
        credentialId: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        type: credential.type,
        deviceType: deviceInfo.platform,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      },
    );
  },

  async deleteBiometricCredential(username) {
    return await DB.delete(
      CONFIG.STORES.biometricCredentials,
      `biometric_${username}`,
    );
  },

  async updateCredentialLastUsed(username) {
    const cred = await this.getBiometricCredential(username);
    if (cred) {
      cred.lastUsed = new Date().toISOString();
      await this.save(
        CONFIG.STORES.biometricCredentials,
        `biometric_${username}`,
        cred,
      );
    }
  },

  // ==========================================
  // ARCHIVE MANAGEMENT
  // ==========================================

  async archiveWeek(username, weekStart) {
    const timesheet = DB.timesheets.getByWeekStart(username, weekStart);
    if (!timesheet) return null;

    const archiveId = `archive_${username}_${weekStart}`;
    const archived = {
      ...timesheet,
      archived: true,
      archivedAt: new Date().toISOString(),
    };

    await DB.save(CONFIG.STORES.archives, archiveId, archived);
    DB.timesheets.delete(username, weekStart);
    return archived;
  },

  async unarchiveWeek(username, weekStart) {
    const archiveId = `archive_${username}_${weekStart}`;
    const archived = await DB.get(CONFIG.STORES.archives, archiveId);

    if (!archived) return null;

    delete archived.archived;
    delete archived.archivedAt;

    DB.timesheets.add(username, archived);
    await DB.delete(CONFIG.STORES.archives, archiveId);
    return archived;
  },

  async getArchivedWeeks(username) {
    const all = await DB.getAll(CONFIG.STORES.archives);
    return all.filter((a) => a.id && a.id.includes(username));
  },

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  /**
   * Clear all data for a user
   */
  async clearAllUserData(username) {
    // Delete timesheets
    const timesheets = DB.timesheets.getAll(username);
    for (const ts of timesheets) {
      if (ts.imageIds?.front) await DB.deleteImage(ts.imageIds.front);
    }

    // Delete documents
    const docs = await DB.getAll(CONFIG.STORES.documents);
    for (const doc of docs) {
      if (doc.id.includes(username)) await DB.deleteDocument(doc.id);
    }

    // Delete VOR reports
    const vors = await DB.getVORReports(username);
    for (const vor of vors) {
      await this.deleteVORReport(vor.id);
    }

    // Delete biometric credentials
    await this.deleteBiometricCredential(username);

    // Clear localStorage
    localStorage.removeItem(`ts_data_${username}`);
    localStorage.removeItem(`ts_settings_${username}`);
    localStorage.removeItem(`biometric_${username}`);
  },

  /**
   * Clear entire database
   */
  async clearAll() {
    const stores = Object.values(CONFIG.STORES);
    for (const storeName of stores) {
      await this.clear(storeName);
    }
  },

  /**
   * Export all data for backup
   */
  async exportUserData(username) {
    return {
      timesheets: DB.timesheets.getAll(username),
      documents: (await DB.getAll(CONFIG.STORES.documents)).filter((d) =>
        d.id.includes(username),
      ),
      vorReports: await DB.getVORReports(username),
      exportedAt: new Date().toISOString(),
    };
  },

  // ==========================================
  // STORAGE QUOTA - FIXED VERSION
  // ==========================================

  /**
   * Check storage quota with proper fallbacks
   * Works on all browsers including Safari/iOS
   */
  async checkStorageQuota() {
    let result = {
      used: 0,
      quota: 0,
      percent: 0,
      usedMB: "0.0",
      quotaMB: "Unknown",
      available: "Unknown",
      supported: false,
    };

    try {
      // Try the modern Storage API first
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();

        if (estimate) {
          result.used = estimate.usage || 0;
          result.quota = estimate.quota || 0;
          result.supported = true;

          // Calculate percentage
          if (result.quota > 0) {
            result.percent = Math.round((result.used / result.quota) * 100);
            result.quotaMB = (result.quota / (1024 * 1024)).toFixed(0);
            result.available =
              ((result.quota - result.used) / (1024 * 1024)).toFixed(0) + " MB";
          } else {
            // Quota is 0 or unavailable (common in Safari)
            result.percent = 0;
            result.quotaMB = "Unlimited";
            result.available = "Unlimited";
          }

          result.usedMB = (result.used / (1024 * 1024)).toFixed(1);
        }
      } else {
        // Storage API not supported - calculate localStorage usage as fallback
        console.log("Storage API not supported, using fallback");
        result = this.calculateLocalStorageSize();
      }
    } catch (error) {
      console.warn("Storage estimate failed:", error);
      // Use fallback calculation
      result = this.calculateLocalStorageSize();
    }

    // Update UI if elements exist
    this.updateStorageUI(result);

    return result;
  },

  /**
   * Calculate storage used by localStorage and IndexedDB (fallback)
   */
  calculateLocalStorageSize() {
    let totalSize = 0;

    // Calculate localStorage size
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
      }
    }

    // Estimate IndexedDB size (rough estimate)
    // Note: We can't accurately measure IndexedDB without iterating all stores
    // So we add a buffer based on known data
    const bufferMB = 5; // Assume ~5MB for IndexedDB images/docs

    return {
      used: totalSize,
      quota: 0, // Unknown
      percent: 0,
      usedMB: (totalSize / (1024 * 1024) + bufferMB).toFixed(1),
      quotaMB: "Unknown",
      available: "Unknown",
      supported: false,
      isEstimate: true,
    };
  },

  /**
   * Update storage UI elements
   */
  updateStorageUI(data) {
    // Update storage widget if it exists
    const usedEl = document.getElementById("storage-used");
    const availableEl = document.getElementById("storage-available");
    const barEl = document.getElementById("storage-bar");
    const percentEl = document.getElementById("storage-percent");

    if (usedEl) usedEl.textContent = data.usedMB + " MB";
    if (availableEl) availableEl.textContent = data.available;

    if (barEl) {
      barEl.style.width = data.percent + "%";
      // Color code based on usage
      barEl.className =
        "h-full transition-all duration-300 " +
        (data.percent > 90
          ? "bg-red-500"
          : data.percent > 70
            ? "bg-yellow-500"
            : "bg-blue-500");
    }

    if (percentEl) percentEl.textContent = data.percent + "%";
  },
};

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DB;
}

// Expose to window for global access
window.DB = DB;
