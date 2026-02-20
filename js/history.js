/**
 * DRIVER TIMESHEET PRO - HISTORY
 * Timesheet history, VOR reports, archives, and search
 */

const History = {
  // State
  currentFilter: "all",
  currentTimesheet: null,

  // ==========================================
  // INITIALIZATION
  // ==========================================

  init() {
    this.render();
  },

  // ==========================================
  // RENDERING
  // ==========================================

  render(filter = "all") {
    this.currentFilter = filter;
    this.renderTimesheets(filter);
    this.renderVORReports(filter);
  },

  renderTimesheets(filter) {
    const list = document.getElementById("history-list");
    if (!list) return;

    const username = Auth.getCurrentUser()?.username;
    let timesheets = DB.timesheets.getAll(username);

    // Sort newest first
    timesheets.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));

    // Apply filter
    const now = new Date();
    if (filter === "month") {
      timesheets = timesheets.filter((t) => {
        const d = Utils.parseDate(t.weekStart);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    } else if (filter === "year") {
      timesheets = timesheets.filter((t) => {
        return Utils.parseDate(t.weekStart).getFullYear() === now.getFullYear();
      });
    }

    if (timesheets.length === 0) {
      list.innerHTML = UI.emptyState(
        "fa-calendar-week",
        "No timesheets",
        filter === "all"
          ? "Upload your first timesheet to get started"
          : "No records for this period",
      );
      return;
    }

    list.innerHTML = timesheets
      .map(
        (ts) => `
            <div class="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors" 
                 onclick="History.openWeekDetailsById(${ts.id})">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl ${ts.totalHours > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-gray-100 dark:bg-dark-surface text-gray-400"} flex items-center justify-center">
                        <i class="fas fa-calendar-week text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-sm text-gray-900 dark:text-white">${ts.weekRange}</h4>
                        <p class="text-xs text-gray-500">${ts.totalHours}h • ${ts.firstWorkingDay || "?"} start</p>
                    </div>
                </div>
                <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
        `,
      )
      .join("");
  },

  async renderVORReports(filter) {
    const list = document.getElementById("vor-history-list");
    if (!list) return;

    const username = Auth.getCurrentUser()?.username;
    let reports = await DB.getVORReports(username);

    // Apply filter
    const now = new Date();
    if (filter === "month") {
      reports = reports.filter((r) => {
        const d = Utils.parseDate(r.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    } else if (filter === "year") {
      reports = reports.filter((r) => {
        return Utils.parseDate(r.date).getFullYear() === now.getFullYear();
      });
    }

    if (reports.length === 0) {
      list.innerHTML = UI.emptyState(
        "fa-exclamation-triangle",
        "No VOR reports",
        "Defect reports will appear here",
      );
      return;
    }

    list.innerHTML = reports
      .map(
        (vor) => `
            <div class="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer vor-card hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors" 
                 onclick="History.openVORDetails('${vor.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-sm text-gray-900 dark:text-white">Defect #${vor.defectNumber}</h4>
                        <p class="text-xs text-gray-500">${vor.date} • ${vor.regNumber || "No reg"} • ${vor.time || "No time"}</p>
                    </div>
                </div>
                <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
        `,
      )
      .join("");
  },

  // ==========================================
  // FILTERING
  // ==========================================

  setFilter(type) {
    // Update button states
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      if (btn.dataset.filter === type) {
        btn.classList.add("bg-primary", "text-white");
        btn.classList.remove(
          "bg-gray-200",
          "dark:bg-dark-surface",
          "text-gray-700",
          "dark:text-gray-300",
        );
      } else {
        btn.classList.remove("bg-primary", "text-white");
        btn.classList.add(
          "bg-gray-200",
          "dark:bg-dark-surface",
          "text-gray-700",
          "dark:text-gray-300",
        );
      }
    });

    this.render(type);
  },

  // ==========================================
  // SEARCH
  // ==========================================

  async searchDefects() {
    const searchInput = document.getElementById("defect-search-input");
    const searchTerm = searchInput?.value.trim();

    if (!searchTerm) {
      this.render(this.currentFilter);
      return;
    }

    const username = Auth.getCurrentUser()?.username;
    const filtered = await DB.searchVORReports(username, searchTerm);

    const list = document.getElementById("vor-history-list");
    if (filtered.length === 0) {
      list.innerHTML = UI.emptyState(
        "fa-search",
        "No matches",
        `No VOR reports found for "${searchTerm}"`,
      );
    } else {
      list.innerHTML = filtered
        .map(
          (vor) => `
                <div class="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-sm border-2 border-orange-400 dark:border-orange-600 flex justify-between items-center cursor-pointer vor-card" 
                     onclick="History.openVORDetails('${vor.id}')">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-lg"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-sm text-gray-900 dark:text-white">Defect #${vor.defectNumber}</h4>
                            <p class="text-xs text-gray-500">${vor.date} • ${vor.regNumber || "No reg"}</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-orange-500"></i>
                </div>
            `,
        )
        .join("");
    }

    // Clear timesheets when searching
    document.getElementById("history-list").innerHTML =
      `<div class="text-center py-4 text-gray-400 text-sm">
                <p>Search active - showing ${filtered.length} defect${filtered.length !== 1 ? "s" : ""}</p>
            </div>`;

    UI.show(
      `Found ${filtered.length} VOR report${filtered.length !== 1 ? "s" : ""}`,
      "info",
    );
  },

  clearSearch() {
    const searchInput = document.getElementById("defect-search-input");
    if (searchInput) searchInput.value = "";
    this.render(this.currentFilter);
    UI.show("Search cleared", "info");
  },

  // ==========================================
  // WEEK DETAILS MODAL
  // ==========================================

  openWeekDetailsById(id) {
    const username = Auth.getCurrentUser()?.username;
    const ts = DB.timesheets.getById(username, id);
    if (ts) this.openWeekDetails(ts);
  },

  async openWeekDetails(ts) {
    this.currentTimesheet = ts;

    const modal = document.getElementById("week-modal");
    const title = document.getElementById("week-modal-title");
    const content = document.getElementById("week-modal-content");

    if (title) title.textContent = ts.weekRange;

    // Get image and documents
    const frontImg = await DB.getImage(ts.imageIds.front);
    const docs = await DB.getDocumentsForWeek(ts.weekStart);

    // Build content
    let html = "";

    // Main image
    if (frontImg) {
      html += `
                <div class="mb-4 relative group">
                    <img src="${frontImg}" class="w-full rounded-xl cursor-pointer" onclick="History.viewTimesheetImage()" alt="Timesheet">
                    <div class="absolute top-3 right-3">
                        <button onclick="event.stopPropagation(); History.shareTimesheet()" class="bg-blue-500 hover:bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            `;
    }

    // Documents
    if (docs.length > 0) {
      html += `
                <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800 mb-4">
                    <h4 class="font-semibold text-purple-800 dark:text-purple-300 mb-2">
                        <i class="fas fa-paperclip mr-2"></i>Documents (${docs.length})
                    </h4>
                    <div class="grid grid-cols-3 gap-2">
                        ${docs
                          .map(
                            (doc) => `
                            <div class="attached-doc-thumbnail" onclick="History.openDocument('${doc.id}')">
                                ${
                                  doc.fileType.startsWith("image/")
                                    ? `<img src="${doc.data}" class="w-full h-20 object-cover">`
                                    : `<div class="w-full h-20 flex items-center justify-center bg-red-100 text-red-600">
                                        <i class="fas fa-file-pdf text-2xl"></i>
                                    </div>`
                                }
                                <div class="doc-overlay"><i class="fas fa-eye"></i></div>
                                <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate">
                                    ${doc.docName}
                                </div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            `;
    }

    // Stats
    html += `
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${ts.totalHours}h</p>
                    <p class="text-xs text-blue-600 dark:text-blue-400">Total Hours</p>
                </div>
                <div class="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                    <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">${ts.longDays}</p>
                    <p class="text-xs text-orange-600 dark:text-orange-400">Long Days</p>
                </div>
                <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                    <p class="text-2xl font-bold text-red-600 dark:text-red-400">${ts.lowRestDays}</p>
                    <p class="text-xs text-red-600 dark:text-red-400">Low Rest</p>
                </div>
            </div>
        `;

    // Days table
    html += `
            <div class="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-dark-card">
                        <tr>
                            <th class="text-left p-3 text-gray-500 font-medium">Day</th>
                            <th class="text-left p-3 text-gray-500 font-medium">On</th>
                            <th class="text-left p-3 text-gray-500 font-medium">Off</th>
                            <th class="text-right p-3 text-gray-500 font-medium">Hrs</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ts.days
                          .map(
                            (day) => `
                            <tr class="border-t border-gray-100 dark:border-gray-700 ${day.hours > 0 ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}">
                                <td class="p-3 font-medium">${day.day}</td>
                                <td class="p-3 text-gray-600 dark:text-gray-400">${day.start}</td>
                                <td class="p-3 text-gray-600 dark:text-gray-400">${day.end}</td>
                                <td class="p-3 text-right font-bold ${day.hours > 10 ? "text-orange-500" : "text-green-600"}">
                                    ${day.hours > 0 ? day.hours + "h" : "-"}
                                </td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    // Actions
    html += `
            <button onclick="History.deleteWeek('${ts.weekStart}')" class="w-full py-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors mt-4">
                <i class="fas fa-trash mr-2"></i>Delete This Week
            </button>
        `;

    if (content) content.innerHTML = html;
    if (modal) modal.classList.remove("hidden");
  },

  closeWeekDetails() {
    const modal = document.getElementById("week-modal");
    if (modal) modal.classList.add("hidden");
    this.currentTimesheet = null;
  },

  viewTimesheetImage() {
    if (!this.currentTimesheet) return;
    DB.getImage(this.currentTimesheet.imageIds.front).then((img) => {
      if (img) {
        UI.viewImage(
          img,
          `timesheet_${this.currentTimesheet.weekRange}.jpg`,
          "Main Timesheet",
          {
            dataUrl: img,
            name: `timesheet_${this.currentTimesheet.weekRange}.jpg`,
            type: "image/jpeg",
          },
        );
      }
    });
  },

  async shareTimesheet() {
    if (!this.currentTimesheet) return;
    const img = await DB.getImage(this.currentTimesheet.imageIds.front);
    if (!img) return;

    const filename = `timesheet_${this.currentTimesheet.weekRange.replace(/\s/g, "_")}.jpg`;

    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(img);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: "image/jpeg" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Timesheet - " + this.currentTimesheet.weekRange,
            files: [file],
          });
          return;
        }
      } catch (e) {
        console.log("Native share failed:", e);
      }
    }

    // Fallback
    const link = document.createElement("a");
    link.href = img;
    link.download = filename;
    link.click();
    UI.show("Timesheet saved to downloads", "success");
  },

  async openDocument(docId) {
    const doc = await DB.get(CONFIG.STORES.documents, docId);
    if (!doc) return;

    if (doc.fileType.startsWith("image/")) {
      UI.viewImage(doc.data, doc.filename, doc.docName || "Document", doc);
    } else {
      const link = document.createElement("a");
      link.href = doc.data;
      link.download = doc.filename;
      link.click();
      UI.show("PDF download started", "success");
    }
  },

  async deleteWeek(weekStart) {
    const confirmed = await UI.confirm("Delete this week permanently?", {
      danger: true,
    });
    if (!confirmed) return;

    const username = Auth.getCurrentUser()?.username;
    const ts = DB.timesheets.getByWeekStart(username, weekStart);

    // Delete image
    if (ts?.imageIds?.front) {
      await DB.deleteImage(ts.imageIds.front);
    }

    // Delete documents
    const docs = await DB.getDocumentsForWeek(weekStart);
    for (const doc of docs) {
      await DB.deleteDocument(doc.id);
    }

    // Delete record
    DB.timesheets.delete(username, weekStart);

    this.closeWeekDetails();
    this.render(this.currentFilter);
    Calendar.render();
    Calendar.updateStats();
    UI.show("Week deleted", "success");
  },

  // ==========================================
  // VOR DETAILS MODAL
  // ==========================================

  async openVORDetails(vorId) {
    const vor = await DB.get(CONFIG.STORES.vorReports, vorId);
    if (!vor) {
      UI.show("VOR report not found", "error");
      return;
    }

    const modal = document.getElementById("vor-detail-modal");
    const content = document.getElementById("vor-detail-content");

    // Get images
    const mainImg = vor.mainImageId ? await DB.getImage(vor.mainImageId) : null;
    const additionalImg = vor.additionalImageId
      ? await DB.getImage(vor.additionalImageId)
      : null;

    let html = `
            <div class="vor-detail-section mb-4">
                <div class="vor-detail-grid">
                    <div class="vor-detail-item">
                        <span class="vor-detail-label">Defect Number</span>
                        <span class="vor-detail-value mono text-lg">${vor.defectNumber}</span>
                    </div>
                    <div class="vor-detail-item">
                        <span class="vor-detail-label">Date</span>
                        <span class="vor-detail-value">${vor.date}</span>
                    </div>
                    <div class="vor-detail-item">
                        <span class="vor-detail-label">Time</span>
                        <span class="vor-detail-value">${vor.time || "Not recorded"}</span>
                    </div>
                    <div class="vor-detail-item">
                        <span class="vor-detail-label">Reg/Trailer</span>
                        <span class="vor-detail-value mono">${vor.regNumber || "Not recorded"}</span>
                    </div>
                </div>
            </div>
        `;

    if (vor.natureOfDefect) {
      html += `
                <div class="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Nature of Defect</h4>
                    <p class="text-gray-700 dark:text-gray-300 text-sm">${vor.natureOfDefect}</p>
                </div>
            `;
    }

    if (mainImg) {
      html += `
                <div class="mb-4">
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Defect Photo</h4>
                    <img src="${mainImg}" class="w-full rounded-xl cursor-pointer" onclick="UI.viewImage('${mainImg}', 'defect.jpg', 'Defect Photo', {dataUrl:'${mainImg}',name:'defect.jpg',type:'image/jpeg'})" alt="Defect">
                </div>
            `;
    }

    if (additionalImg) {
      html += `
                <div class="mb-4">
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Additional Photo</h4>
                    <img src="${additionalImg}" class="w-full rounded-xl cursor-pointer" onclick="UI.viewImage('${additionalImg}', 'additional.jpg', 'Additional Photo', {dataUrl:'${additionalImg}',name:'additional.jpg',type:'image/jpeg'})" alt="Additional">
                </div>
            `;
    }

    html += `
            <button onclick="History.deleteVOR('${vor.id}')" class="w-full py-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors">
                <i class="fas fa-trash mr-2"></i>Delete This Report
            </button>
        `;

    if (content) content.innerHTML = html;
    if (modal) modal.classList.remove("hidden");
  },

  closeVORDetails() {
    const modal = document.getElementById("vor-detail-modal");
    if (modal) modal.classList.add("hidden");
  },

  async deleteVOR(vorId) {
    const confirmed = await UI.confirm("Delete this VOR report permanently?", {
      danger: true,
    });
    if (!confirmed) return;

    await DB.deleteVORReport(vorId);
    this.closeVORDetails();
    this.render(this.currentFilter);
    UI.show("VOR report deleted", "success");
  },

  // ==========================================
  // ARCHIVE VIEW
  // ==========================================

  async showArchiveView() {
    App.switchView("archive");
    await this.renderArchives();
  },

  async renderArchives() {
    const list = document.getElementById("archive-list");
    if (!list) return;

    const username = Auth.getCurrentUser()?.username;
    const archives = await DB.getArchivedWeeks(username);

    if (archives.length === 0) {
      list.innerHTML = UI.emptyState(
        "fa-archive",
        "No archived weeks",
        "Archived weeks will appear here",
      );
      return;
    }

    list.innerHTML = archives
      .map(
        (ts) => `
            <div class="bg-gray-100 dark:bg-dark-surface rounded-2xl p-4 border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 flex items-center justify-center">
                        <i class="fas fa-archive text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-semibold text-sm text-gray-700 dark:text-gray-300">${ts.weekRange}</h4>
                        <p class="text-xs text-gray-500">${ts.totalHours}h • Archived ${new Date(ts.archivedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <button class="px-3 py-1 bg-primary text-white text-xs rounded-lg" onclick="History.unarchiveWeek('${ts.weekStart}')">
                    Restore
                </button>
            </div>
        `,
      )
      .join("");
  },

  async unarchiveWeek(weekStart) {
    const username = Auth.getCurrentUser()?.username;
    await DB.unarchiveWeek(username, weekStart);

    this.renderArchives();
    Calendar.render();
    Calendar.updateStats();
    UI.show("Week restored from archive", "success");
  },
};

// Expose to window for inline onclick handlers
window.History = History;
