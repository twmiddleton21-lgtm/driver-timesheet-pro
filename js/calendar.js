/**
 * calendar.js - Calendar and Dashboard Module
 * Calendar rendering, week selection, and dashboard stats
 */

const Calendar = {
  currentMonth: new Date(),
  selectedWeekStart: null,

  /**
   * Initialize calendar module
   */
  init() {
    // Set up event listeners
    const scanDateSelect = document.getElementById("scan-date-select");
    if (scanDateSelect) {
      scanDateSelect.addEventListener("change", () =>
        this.updateScanWeekDisplay(),
      );
    }
  },

  /**
   * Render the calendar
   */
  render() {
    if (!Auth.currentUser) return;

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    // Update header
    const monthYearEl = document.getElementById("calendar-month-year");
    if (monthYearEl) {
      monthYearEl.textContent = new Date(year, month).toLocaleDateString(
        "en-US",
        {
          month: "long",
          year: "numeric",
        },
      );
    }

    // Get calendar data
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Get user's timesheets
    const timesheets = DB.timesheets.getAll(Auth.currentUser.username);
    const weekData = {};
    const docData = {};
    const vorData = {};

    timesheets.forEach((ts) => {
      const date = Utils.parseDate(ts.weekStart);
      if (date.getFullYear() === year && date.getMonth() === month) {
        weekData[date.getDate()] = ts;
      }
    });

    // Get documents for calendar
    DB.getAll(CONFIG.STORES.documents).then((docs) => {
      docs.forEach((doc) => {
        const date = Utils.parseDate(doc.weekStart);
        if (date.getFullYear() === year && date.getMonth() === month) {
          if (!docData[date.getDate()]) docData[date.getDate()] = 0;
          docData[date.getDate()]++;
        }
      });
    });

    // Get VOR reports for calendar
    DB.getVORReports(Auth.currentUser.username).then((reports) => {
      reports.forEach((vor) => {
        const date = Utils.parseDate(vor.date);
        if (date.getFullYear() === year && date.getMonth() === month) {
          vorData[date.getDate()] = vor;
        }
      });
    });

    // Render grid
    const grid = document.getElementById("calendar-grid");
    if (!grid) return;

    grid.innerHTML = "";

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      grid.appendChild(this.createDayElement(prevMonthDays - i, true));
    }

    // Current month days
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === todayDate && month === todayMonth && year === todayYear;
      const hasData = weekData[day];
      const hasDocs = docData[day] > 0;
      const hasVOR = vorData[day];

      const cell = this.createDayElement(
        day,
        false,
        isToday,
        hasData,
        hasDocs,
        hasVOR,
      );

      if (hasData || hasDocs || hasVOR) {
        cell.onclick = () =>
          this.selectWeek(weekData[day], day, hasDocs, hasVOR);
      } else {
        cell.onclick = () => this.selectEmptyWeek(year, month, day);
      }

      grid.appendChild(cell);
    }

    // Next month padding
    const remaining = (7 - ((startPadding + daysInMonth) % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      grid.appendChild(this.createDayElement(day, true));
    }
  },

  /**
   * Create a calendar day element
   */
  createDayElement(
    day,
    isOtherMonth,
    isToday = false,
    hasData = false,
    hasDocs = false,
    hasVOR = false,
  ) {
    const div = document.createElement("div");
    let className = "calendar-day";

    if (isOtherMonth) {
      className +=
        " other-month bg-gray-100 dark:bg-dark-surface text-gray-400";
    } else {
      className +=
        " bg-white dark:bg-dark-surface text-gray-900 dark:text-white";
    }

    if (isToday) className += " today";
    if (hasData) className += " has-data";
    if (hasDocs) className += " has-docs";
    if (hasVOR) className += " has-vor";

    div.className = className;

    let todayIndicator = "";
    if (isToday) {
      todayIndicator =
        '<div class="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-dark-card"></div>';
    }

    let docIndicator = "";
    if (hasDocs && !hasData && !hasVOR) {
      docIndicator =
        '<div class="absolute bottom-1 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>';
    }

    let vorIndicator = "";
    if (hasVOR) {
      vorIndicator =
        '<div class="absolute bottom-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></div>';
    }

    div.innerHTML = `
            <span class="text-lg font-bold">${day}</span>
            ${hasData ? '<div style="background: rgba(255,255,255,0.5); height: 3px; width: 60%; border-radius: 2px; margin-top: 2px;"></div>' : ""}
            ${docIndicator}
            ${vorIndicator}
            ${todayIndicator}
        `;

    return div;
  },

  /**
   * Change month
   */
  changeMonth(delta) {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
    this.render();
  },

  /**
   * Select a week with data
   */
  async selectWeek(timesheet, day, hasDocs, hasVOR) {
    this.selectedWeekStart = timesheet
      ? timesheet.weekStart
      : Utils.formatDateForInput(
          new Date(
            this.currentMonth.getFullYear(),
            this.currentMonth.getMonth(),
            day,
          ),
        );

    const preview = document.getElementById("week-preview");
    if (preview) preview.classList.remove("hidden");

    if (timesheet) {
      const rangeEl = document.getElementById("preview-week-range");
      const hoursEl = document.getElementById("preview-total-hours");
      const daysEl = document.getElementById("preview-days");

      if (rangeEl) rangeEl.textContent = timesheet.weekRange;
      if (hoursEl) hoursEl.textContent = timesheet.totalHours + "h";

      if (daysEl) {
        daysEl.innerHTML = timesheet.days
          .map(
            (day, i) => `
                    <div class="flex-shrink-0 w-16 h-16 rounded-xl ${day.hours > 0 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-dark-surface text-gray-400"} flex flex-col items-center justify-center">
                        <span class="text-xs">${["S", "M", "T", "W", "T", "F", "S"][i]}</span>
                        <span class="font-bold">${day.hours > 0 ? day.hours : "-"}</span>
                    </div>
                `,
          )
          .join("");
      }
    } else {
      const rangeEl = document.getElementById("preview-week-range");
      const hoursEl = document.getElementById("preview-total-hours");
      const daysEl = document.getElementById("preview-days");

      const date = new Date(
        this.currentMonth.getFullYear(),
        this.currentMonth.getMonth(),
        day,
      );
      if (rangeEl)
        rangeEl.textContent =
          "Week of " +
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (hoursEl) hoursEl.textContent = "-";
      if (daysEl)
        daysEl.innerHTML =
          '<div class="text-gray-400 text-sm">No timesheet data</div>';
    }

    // Show document count
    const docs = await DB.getDocumentsForWeek(this.selectedWeekStart);
    const docPreview = document.getElementById("preview-documents");
    if (docPreview) {
      if (docs.length > 0) {
        docPreview.classList.remove("hidden");
        const countEl = document.getElementById("preview-doc-count");
        if (countEl)
          countEl.textContent = `${docs.length} doc${docs.length > 1 ? "s" : ""} attached`;
      } else {
        docPreview.classList.add("hidden");
      }
    }
  },

  /**
   * Select an empty week (for new upload)
   */
  selectEmptyWeek(year, month, day) {
    const date = new Date(year, month, day, 12, 0, 0);
    const saturday = new Date(date);
    saturday.setDate(date.getDate() + (6 - date.getDay()));

    const scanDateSelect = document.getElementById("scan-date-select");
    if (scanDateSelect) {
      scanDateSelect.value = Utils.formatDateForInput(saturday);
      this.updateScanWeekDisplay();
    }

    App.switchView("scan");
    UI.showToast("Selected week for new upload");
  },

  /**
   * Open selected week details
   */
  openSelectedWeek() {
    if (!this.selectedWeekStart) return;
    const timesheets = DB.timesheets.getAll(Auth.currentUser.username);
    const ts = timesheets.find((t) => t.weekStart === this.selectedWeekStart);
    if (ts) {
      History.openWeekDetails(ts);
    } else {
      UI.showToast("No timesheet data for this week", "error");
    }
  },

  /**
   * Update scan week display text
   */
  updateScanWeekDisplay() {
    const dateInput = document.getElementById("scan-date-select");
    const infoEl = document.getElementById("selected-week-info");
    if (!dateInput || !infoEl || !dateInput.value) return;

    const endDate = Utils.parseDate(dateInput.value);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);

    infoEl.textContent = `Week: ${Utils.formatWeekRange(startDate, endDate)}`;
  },

  /**
   * Update dashboard stats
   */
  updateStats() {
    if (!Auth.currentUser) return;

    const timesheets = DB.timesheets.getAll(Auth.currentUser.username);
    const now = new Date();

    const monthSheets = timesheets.filter((t) => {
      const d = Utils.parseDate(t.weekStart);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });

    const monthHours = monthSheets.reduce((sum, t) => sum + t.totalHours, 0);

    const statEl = document.getElementById("stat-month-hours");
    if (statEl) statEl.textContent = monthHours.toFixed(1) + "h";
  },

  /**
   * Render recent uploads list
   */
  renderRecent() {
    if (!Auth.currentUser) return;

    const list = document.getElementById("recent-list");
    if (!list) return;

    const timesheets = DB.timesheets
      .getAll(Auth.currentUser.username)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 3);

    if (timesheets.length === 0) {
      list.innerHTML =
        '<p class="text-gray-400 text-sm text-center py-4">No uploads yet</p>';
      return;
    }

    list.innerHTML = timesheets
      .map(
        (ts) => `
            <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-surface rounded-xl cursor-pointer" onclick="History.openWeekDetailsById(${ts.id})">
                <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                    <i class="fas fa-check"></i>
                </div>
                <div class="flex-1">
                    <p class="font-medium text-sm text-gray-900 dark:text-white">${ts.weekRange}</p>
                    <p class="text-xs text-gray-500">${ts.totalHours} hours • ${ts.firstWorkingDay || "Unknown"} start</p>
                </div>
                <i class="fas fa-chevron-right text-gray-400 text-sm"></i>
            </div>
        `,
      )
      .join("");
  },
};
