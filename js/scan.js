/**
 * DRIVER TIMESHEET PRO - SCAN & OCR
 * Timesheet scanning, OCR processing, and document upload
 */

const Scan = {
  // State
  currentImage: null,
  processedImage: null,
  autoDetectedData: null,
  autoDetectedWeekEnding: null,
  ocrAttempts: 0,

  // Document storage (no OCR)
  currentDocs: {
    1: null,
    2: null,
    3: null,
  },

  // ==========================================
  // INITIALIZATION
  // ==========================================

  init() {
    this.setupEventListeners();
    this.resetForm();
  },

  setupEventListeners() {
    // Date input
    const dateSelect = document.getElementById("scan-date-select");
    if (dateSelect) {
      dateSelect.addEventListener("change", () => this.updateWeekDisplay());
      // Set default to next Saturday
      const saturday = Utils.getWeekEnding();
      dateSelect.value = Utils.formatDateForInput(saturday);
      this.updateWeekDisplay();
    }
  },

  // ==========================================
  // IMAGE HANDLING
  // ==========================================

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > CONFIG.MAX_IMAGE_SIZE) {
      UI.show("Image too large (max 10MB)", "error");
      return;
    }

    this.setProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        this.currentImage = e.target.result;
        this.processedImage = await this.preprocessImage(this.currentImage);

        // Update preview
        const preview = document.getElementById("preview-front");
        const defaultView = document.getElementById("upload-front-default");

        if (preview) {
          preview.src = this.processedImage;
          preview.classList.remove("hidden");
        }
        if (defaultView) defaultView.classList.add("hidden");

        // Update status
        const status = document.getElementById("front-status");
        if (status) {
          status.textContent = "Ready";
          status.className = "text-xs text-green-600 font-medium";
        }

        // Remove required styling
        const zone = document.getElementById("timesheet-upload-zone");
        if (zone) zone.classList.remove("required");

        UI.show(
          'Timesheet loaded. Tap "Auto-Extract Times" to scan.',
          "success",
        );
      } catch (err) {
        this.processedImage = this.currentImage;
        const preview = document.getElementById("preview-front");
        if (preview) {
          preview.src = this.currentImage;
          preview.classList.remove("hidden");
        }
      } finally {
        this.setProcessing(false);
      }
    };

    reader.onerror = () => {
      UI.show("Error reading image", "error");
      this.setProcessing(false);
    };

    reader.readAsDataURL(file);
  },

  async preprocessImage(imageDataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const maxWidth = CONFIG.MAX_IMAGE_WIDTH;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.filter = "contrast(1.3) brightness(1.05)";
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY));
        } catch (err) {
          resolve(imageDataUrl);
        }
      };

      img.onerror = () => resolve(imageDataUrl);
      img.src = imageDataUrl;
    });
  },

  setProcessing(processing) {
    const indicator = document.getElementById("image-processing-indicator");
    if (indicator) {
      indicator.classList.toggle("hidden", !processing);
    }
  },

  // ==========================================
  // DRAG & DROP
  // ==========================================

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add("active");
  },

  handleDragLeave(e) {
    e.currentTarget.classList.remove("active");
  },

  handleDrop(e, type) {
    e.preventDefault();
    e.currentTarget.classList.remove("active");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (type === "front") {
        // Create fake event
        this.handleFileSelect({ target: { files: [file] } });
      }
    }
  },

  // ==========================================
  // DOCUMENT HANDLING
  // ==========================================

  handleDocItemClick(docNum) {
    if (!this.currentDocs[docNum]) {
      document.getElementById(`file-doc-${docNum}`)?.click();
    }
  },

  async handleDocSelect(event, docNum) {
    event.stopPropagation();
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > CONFIG.MAX_DOCUMENT_SIZE) {
      UI.show("File too large (max 20MB)", "error");
      return;
    }

    // Update UI to loading
    const icon = document.getElementById(`doc-${docNum}-icon`);
    const status = document.getElementById(`doc-${docNum}-status`);

    if (icon) icon.className = "fas fa-spinner fa-spin text-primary";
    if (status) status.textContent = "Loading...";

    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentDocs[docNum] = {
        file: file,
        dataUrl: e.target.result,
        name: file.name,
        size: file.size,
        type: file.type,
        docName: DOCS.getName(docNum),
      };

      this.updateDocUI(docNum);
      this.updateDocCountBadge();
      UI.show(`${DOCS.getName(docNum)} added`, "success");
    };

    reader.onerror = () => {
      if (status) status.textContent = "Error";
      UI.show("Error reading file", "error");
    };

    reader.readAsDataURL(file);
  },

  updateDocUI(docNum) {
    const doc = this.currentDocs[docNum];
    if (!doc) return;

    const item = document.getElementById(`doc-${docNum}-item`);
    const icon = document.getElementById(`doc-${docNum}-icon`);
    const status = document.getElementById(`doc-${docNum}-status`);
    const preview = document.getElementById(`doc-${docNum}-preview`);
    const actions = document.getElementById(`doc-${docNum}-actions`);

    if (item) item.classList.add("has-file");
    if (icon) icon.className = "hidden";
    if (status) status.textContent = "Added";

    if (doc.type.startsWith("image/")) {
      if (preview) {
        preview.src = doc.dataUrl;
        preview.classList.remove("hidden");
      }
    } else {
      if (icon) {
        icon.className = "fas fa-file-pdf text-red-500 text-2xl";
        icon.classList.remove("hidden");
      }
    }

    if (actions) {
      actions.style.display = "flex";
    }
  },

  updateDocCountBadge() {
    const docs = Object.values(this.currentDocs).filter((d) => d !== null);
    const count = docs.length;
    const badge = document.getElementById("doc-count-badge");

    if (badge) {
      badge.textContent = `${count}/3`;
      if (count === 3) {
        badge.className =
          "text-xs text-white bg-green-500 px-2 py-1 rounded-full font-medium";
      } else {
        badge.className =
          "text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full font-medium";
      }
    }
  },

  viewDoc(docNum) {
    const doc = this.currentDocs[docNum];
    if (!doc) return;

    if (doc.type.startsWith("image/")) {
      UI.viewImage(
        doc.dataUrl,
        doc.name,
        doc.docName || DOCS.getName(docNum),
        doc,
      );
    } else {
      // Download PDF
      const link = document.createElement("a");
      link.href = doc.dataUrl;
      link.download = doc.name;
      link.click();
      UI.show("PDF download started", "success");
    }
  },

  async shareDoc(docNum) {
    const doc = this.currentDocs[docNum];
    if (!doc) return;

    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(doc.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], doc.name, { type: doc.type });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: doc.docName || DOCS.getName(docNum),
            text: `${doc.docName || DOCS.getName(docNum)} - ${doc.name}`,
            files: [file],
          });
          return;
        }
      } catch (e) {
        console.log("Native share failed, falling back");
      }
    }

    // Fallback download
    const link = document.createElement("a");
    link.href = doc.dataUrl;
    link.download = doc.name;
    link.click();
    UI.show("Document saved to downloads", "success");
  },

  removeDoc(docNum) {
    this.currentDocs[docNum] = null;

    const item = document.getElementById(`doc-${docNum}-item`);
    const icon = document.getElementById(`doc-${docNum}-icon`);
    const status = document.getElementById(`doc-${docNum}-status`);
    const preview = document.getElementById(`doc-${docNum}-preview`);
    const input = document.getElementById(`file-doc-${docNum}`);
    const actions = document.getElementById(`doc-${docNum}-actions`);

    if (item) item.classList.remove("has-file");
    if (icon) {
      icon.className = `fas ${DOCS.getIcon(docNum)} text-gray-400`;
      icon.classList.remove("hidden");
    }
    if (status) status.textContent = "Add";
    if (preview) {
      preview.src = "";
      preview.classList.add("hidden");
    }
    if (input) input.value = "";
    if (actions) actions.style.display = "none";

    this.updateDocCountBadge();
    UI.show("Document removed", "info");
  },

  // ==========================================
  // OCR PROCESSING
  // ==========================================

  async startOCR() {
    if (!this.processedImage && !this.currentImage) {
      UI.show("Timesheet photo is required", "error");
      const zone = document.getElementById("timesheet-upload-zone");
      if (zone) {
        zone.classList.add("required");
        zone.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (!API.hasKey()) {
      App.showGeminiKeyModal();
      return;
    }

    const imageToProcess = this.processedImage || this.currentImage;

    this.hideError();
    document.getElementById("scan-btn")?.classList.add("hidden");
    this.showProgress(true);

    try {
      const result = await this.performOCR(imageToProcess);
      this.autoDetectedData = this.convertToInternal(result);
      this.autoDetectedWeekEnding = this.autoDetectedData.weekEnding;

      // Update date if detected
      if (this.autoDetectedWeekEnding) {
        const dateSelect = document.getElementById("scan-date-select");
        if (dateSelect) {
          dateSelect.value = Utils.formatDateForInput(
            this.autoDetectedWeekEnding,
          );
          dateSelect.classList.add("auto-filled");
        }
        document
          .getElementById("auto-detected-badge")
          ?.classList.remove("hidden");
        this.updateWeekDisplay();
      }

      this.showProgress(false);
      this.showResults();

      const confidence =
        this.autoDetectedData.confidence === "high"
          ? "✅"
          : this.autoDetectedData.confidence === "medium"
            ? "⚠️"
            : "❓";
      UI.show(
        `${confidence} Extracted ${this.autoDetectedData.workingDays} days with Gemini AI`,
        "success",
      );
    } catch (err) {
      console.error("OCR Error:", err);
      this.showProgress(false);
      this.showError(err.message);
      document.getElementById("scan-btn")?.classList.remove("hidden");
    }
  },

  async performOCR(imageDataUrl) {
    const base64Image = imageDataUrl.split(",")[1];

    const prompt = `You are an expert OCR system specialized in extracting data from truck driver timesheets.

Analyze this timesheet image and extract:

1. WEEK ENDING date (top right, format DD-MM-YY)
2. For each day (SUN-SAT): Booking ON time, Booking OFF time, Location code

Times have 24-hour format (e.g., 0758, 2040).

Return ONLY JSON:
{
  "weekEnding": "DD-MM-YYYY",
  "days": {
    "SUN": {"onTime": "HH:MM", "offTime": "HH:MM", "location": "code"},
    "MON": {"onTime": "HH:MM", "offTime": "HH:MM", "location": "code"},
    "TUE": {"onTime": "HH:MM", "offTime": "HH:MM", "location": "code"},
    "WED": {"onTime": "HH:MM", "offTime": "HH:MM", "location": "code"},
    "THU": {"onTime": "HH:MM", "offTime": "HH:MM", "location": "code"},
    "FRI": {"onTime": "HH:MM", "offTime": "HH:MM", "location": "code"},
    "SAT": {"onTime": "HH:MM", "offTime": "HH:MM", "location": "code"}
  },
  "confidence": "high|medium|low"
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.OCR_TIMEOUT);

    try {
      const response = await fetch(
        `${CONFIG.GEMINI_API_URL}/${CONFIG.GEMINI_MODEL}:generateContent?key=${API.getKey()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: { mime_type: "image/jpeg", data: base64Image },
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `API error (${response.status})`,
        );
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;

      // Parse JSON
      let parsed;
      try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ||
          text.match(/```\s*([\s\S]*?)```/) || [null, text];
        parsed = JSON.parse(jsonMatch[1] || text);
      } catch {
        parsed = this.extractDataFromText(text);
      }

      return parsed;
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(
          "Request timed out. Please check your internet connection.",
        );
      }
      throw err;
    }
  },

  extractDataFromText(text) {
    const data = {
      weekEnding: null,
      days: {},
      confidence: "low",
    };

    const days = CONFIG.DAYS;
    days.forEach((day) => {
      data.days[day] = { onTime: null, offTime: null, location: null };
    });

    // Extract week ending
    const weekMatch =
      text.match(/weekEnding["\s:]+([^"\n,}]+)/i) ||
      text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
    if (weekMatch) data.weekEnding = weekMatch[1].trim();

    // Extract days
    days.forEach((day) => {
      const dayPattern = new RegExp(`${day}["\\s:]+{([^}]+)}`, "i");
      const dayMatch = text.match(dayPattern);

      if (dayMatch) {
        const content = dayMatch[1];
        const onMatch =
          content.match(/onTime["\s:]+([^"\n,}]+)/i) ||
          content.match(/(\d{2}:\d{2})/);
        const offMatch =
          content.match(/offTime["\s:]+([^"\n,}]+)/i) ||
          content.match(/(\d{2}:\d{2})/g);

        if (onMatch)
          data.days[day].onTime = onMatch[1].replace(/"/g, "").trim();
        if (offMatch) {
          const times = Array.isArray(offMatch) ? offMatch : [offMatch];
          data.days[day].offTime = times[times.length - 1]
            .replace(/"/g, "")
            .trim();
        }
      }
    });

    return data;
  },

  convertToInternal(geminiData) {
    const days = CONFIG.DAYS;
    const dayData = {};

    let firstWorkingDay = null;
    let totalHours = 0;
    let workingDays = 0;

    days.forEach((day) => {
      const geminiDay = geminiData.days?.[day] || {};
      const onTime = Utils.formatTime(geminiDay.onTime);
      const offTime = Utils.formatTime(geminiDay.offTime);
      const hasData = onTime && offTime;

      let hours = 0;
      if (hasData) {
        hours = Utils.calculateHoursBetween(onTime, offTime);
        totalHours += hours;
        workingDays++;
        if (!firstWorkingDay) firstWorkingDay = day;
      }

      dayData[day] = {
        day: day,
        onTime: onTime,
        offTime: offTime,
        hasData: hasData,
        hours: Math.round(hours * 10) / 10,
        location: geminiDay.location || null,
      };
    });

    // Parse week ending date
    let weekEndingDate = null;
    if (geminiData.weekEnding) {
      weekEndingDate = Utils.parseWeekEndingDate(geminiData.weekEnding);
    }

    return {
      days: dayData,
      firstWorkingDay: firstWorkingDay,
      totalHours: Math.round(totalHours * 10) / 10,
      workingDays: workingDays,
      weekEnding: weekEndingDate,
      confidence: geminiData.confidence || "medium",
      rawGeminiData: geminiData,
    };
  },

  // ==========================================
  // UI UPDATES
  // ==========================================

  updateWeekDisplay() {
    const dateInput = document.getElementById("scan-date-select");
    const infoEl = document.getElementById("selected-week-info");

    if (!dateInput?.value || !infoEl) return;

    const endDate = Utils.parseDate(dateInput.value);
    const startDate = Utils.getWeekStart(endDate);

    infoEl.textContent = `Week: ${Utils.formatWeekRange(startDate, endDate)}`;
  },

  showProgress(show) {
    const progress = document.getElementById("ocr-progress");
    if (progress) progress.classList.toggle("hidden", !show);
  },

  updateProgress(percentage, stage) {
    const bar = document.getElementById("ocr-progress-bar");
    const pct = document.getElementById("ocr-percentage");
    const stageText = document.getElementById("ocr-stage");
    const statusText = document.getElementById("ocr-status-text");

    if (bar) bar.style.width = percentage + "%";
    if (pct) pct.textContent = percentage + "%";
    if (stageText) stageText.textContent = stage;
    if (statusText) statusText.textContent = stage;
  },

  showError(message) {
    const error = document.getElementById("ocr-error");
    const msgEl = document.getElementById("error-message");

    if (error) error.classList.remove("hidden");
    if (msgEl) msgEl.textContent = message;

    // Update debug info
    const debugInfo = document.getElementById("ocr-debug-info");
    if (debugInfo) {
      debugInfo.textContent = `Error: ${message}`;
    }
  },

  hideError() {
    const error = document.getElementById("ocr-error");
    if (error) error.classList.add("hidden");
  },

  toggleDebugInfo() {
    const debugInfo = document.getElementById("ocr-debug-info");
    if (debugInfo) debugInfo.classList.toggle("hidden");
  },

  showResults() {
    const results = document.getElementById("auto-results");
    if (results) results.classList.remove("hidden");

    // Update summary
    const data = this.autoDetectedData;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    // Week ending
    if (data.weekEnding) {
      setText(
        "result-week-ending",
        data.weekEnding.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      );
    } else {
      setText("result-week-ending", "Not detected");
    }

    // Stats
    const workingDays = Object.values(data.days).filter(
      (d) => d.hasData,
    ).length;
    setText("result-working-days", workingDays + " days");
    setText("result-total-shifts", workingDays + " shifts");
    setText("result-total-hours", "~" + data.totalHours + "h");

    // Confidence badge
    const confidence =
      workingDays >= 3 ? "High" : workingDays >= 1 ? "Medium" : "Low";
    const badge = document.getElementById("confidence-badge");
    if (badge) {
      badge.textContent = confidence + " Confidence";
      badge.className =
        "text-xs px-2 py-1 rounded-full " +
        (confidence === "High"
          ? "bg-green-200 text-green-800"
          : confidence === "Medium"
            ? "bg-yellow-200 text-yellow-800"
            : "bg-red-200 text-red-800");
    }

    // Render grid and table
    this.renderDetectionGrid();
    this.renderCorrectionTable();
  },

  renderDetectionGrid() {
    const grid = document.getElementById("detection-grid");
    if (!grid) return;

    const days = CONFIG.DAYS;
    const dayLabels = CONFIG.DAYS_SHORT;

    grid.innerHTML = days
      .map((day, idx) => {
        const data = this.autoDetectedData.days[day];
        const isFirst = day === this.autoDetectedData.firstWorkingDay;

        let cellClass = "day-cell";
        if (data.hasData) cellClass += " has-data";
        if (isFirst) cellClass += " first-day";

        let content = `<div class="day-label ${isFirst ? "text-green-600" : ""}">${dayLabels[idx]}</div>`;

        if (data.hasData) {
          content += `<div class="time-on">${data.onTime || "--:--"}</div>`;
          content += `<div class="text-gray-400 text-[8px]">to</div>`;
          content += `<div class="text-blue-600 font-bold">${data.offTime || "--:--"}</div>`;
        } else {
          content += '<div class="text-gray-300">-</div>';
        }

        if (isFirst) {
          content += '<div class="first-day-badge">1st</div>';
        }

        return `<div class="${cellClass}">${content}</div>`;
      })
      .join("");
  },

  renderCorrectionTable() {
    const container = document.getElementById("correction-table");
    if (!container) return;

    const days = CONFIG.DAYS;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let html = "";

    days.forEach((day, idx) => {
      const data = this.autoDetectedData.days[day];
      if (!data.hasData && idx > 0) return; // Skip empty days except Sunday

      const isFirst = day === this.autoDetectedData.firstWorkingDay;

      html += `
                <div class="correction-row ${isFirst ? "highlighted" : ""} ${!data.hasData ? "opacity-50" : ""}">
                    <div class="correction-day-label ${isFirst ? "first-day" : ""}">
                        ${dayNames[idx]}${isFirst ? "*" : ""}
                    </div>
                    <div class="correction-input-group">
                        <label><span class="column-indicator on"></span>Booking ON</label>
                        <input type="time" class="correction-input ${data.onTime ? "auto-filled" : ""}" 
                            value="${data.onTime || ""}" 
                            onchange="Scan.updateDayTime('${day}', 'onTime', this.value)">
                    </div>
                    <div class="correction-input-group">
                        <label><span class="column-indicator off"></span>Booking OFF</label>
                        <input type="time" class="correction-input ${data.offTime ? "auto-filled" : ""}" 
                            value="${data.offTime || ""}" 
                            onchange="Scan.updateDayTime('${day}', 'offTime', this.value)">
                    </div>
                    <div class="correction-input-group">
                        <label>Hrs</label>
                        <input type="number" class="correction-input" 
                            value="${data.hours || ""}" step="0.5" min="0" max="24"
                            onchange="Scan.updateDayTime('${day}', 'hours', this.value)">
                    </div>
                </div>
            `;
    });

    container.innerHTML = html;
  },

  updateDayTime(day, field, value) {
    if (!this.autoDetectedData) return;

    const dayData = this.autoDetectedData.days[day];
    if (!dayData) return;

    if (field === "onTime") dayData.onTime = value || null;
    if (field === "offTime") dayData.offTime = value || null;
    if (field === "hours") dayData.hours = parseFloat(value) || 0;

    if (value) dayData.hasData = true;

    // Recalculate total
    let total = 0;
    Object.values(this.autoDetectedData.days).forEach((d) => {
      if (d.hours) total += d.hours;
    });
    this.autoDetectedData.totalHours = Math.round(total * 10) / 10;

    const totalEl = document.getElementById("result-total-hours");
    if (totalEl)
      totalEl.textContent = "~" + this.autoDetectedData.totalHours + "h";
  },

  // ==========================================
  // SAVE & RESET
  // ==========================================

  async confirmAndSave() {
    if (!this.autoDetectedData) return;

    const weekEnding = document.getElementById("scan-date-select")?.value;
    if (!weekEnding) {
      UI.show("Please select week ending date", "error");
      return;
    }

    const endDate = Utils.parseDate(weekEnding);
    const startDate = Utils.getWeekStart(endDate);

    // Build day data
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayKeys = CONFIG.DAYS;
    const dayData = [];
    let totalHours = 0;
    let longDays = 0;

    days.forEach((dayName, idx) => {
      const dayKey = dayKeys[idx];
      const detected = this.autoDetectedData.days[dayKey];

      let hours = 0;
      let start = "-";
      let end = "-";

      if (detected && detected.hasData) {
        start = detected.onTime || "-";
        end = detected.offTime || "-";
        hours = detected.hours || 0;

        if (hours === 0 && start !== "-" && end !== "-") {
          hours = Math.round(Utils.calculateHoursBetween(start, end) * 10) / 10;
        }

        totalHours += hours;
        if (hours > 10) longDays++;
      }

      dayData.push({
        day: dayName,
        hours: Math.round(hours * 10) / 10,
        start: start,
        end: end,
        rest: hours > 0 ? "11h" : "-",
        flag: hours > 10 ? "warning" : hours > 0 ? "ok" : "none",
      });
    });

    // Save image
    const timesheetId = Date.now().toString();
    const imageId = `${timesheetId}_front`;
    const imageToSave = this.processedImage || this.currentImage;
    await DB.saveImage(imageId, imageToSave);

    // Save documents
    for (let i = 1; i <= 3; i++) {
      const doc = this.currentDocs[i];
      if (doc) {
        const docId = `doc_${Auth.getCurrentUser().username}_${Utils.formatDateForInput(startDate)}_${i}_${Date.now()}`;
        await DB.saveDocument(docId, {
          weekStart: Utils.formatDateForInput(startDate),
          weekEnd: weekEnding,
          docNum: i,
          docName: DOCS.getName(i),
          filename: doc.name,
          fileType: doc.type,
          fileSize: doc.size,
          data: doc.dataUrl,
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    // Create timesheet record
    const timesheet = {
      id: parseInt(timesheetId),
      weekStart: Utils.formatDateForInput(startDate),
      weekEnd: weekEnding,
      weekRange: Utils.formatWeekRange(startDate, endDate),
      totalHours: Math.round(totalHours * 10) / 10,
      longDays,
      lowRestDays: 0,
      firstWorkingDay: this.autoDetectedData.firstWorkingDay,
      pattern: "standard",
      imageIds: { front: imageId },
      days: dayData,
      uploadedAt: new Date().toISOString(),
      ocrVersion: CONFIG.APP_VERSION,
      autoDetectedDate: this.autoDetectedWeekEnding
        ? Utils.formatDateForInput(this.autoDetectedWeekEnding)
        : null,
      archived: false,
    };

    DB.timesheets.add(Auth.getCurrentUser().username, timesheet);

    this.resetForm();
    document.getElementById("auto-results")?.classList.add("hidden");
    document.getElementById("scan-btn")?.classList.remove("hidden");

    Calendar.render();
    Calendar.updateStats();
    Calendar.renderRecent();

    const msg = this.autoDetectedData.firstWorkingDay
      ? `Saved! ${this.autoDetectedData.firstWorkingDay} start, ${totalHours.toFixed(1)}h total`
      : `Saved! ${totalHours.toFixed(1)}h total`;

    UI.show(msg, "success");
    App.switchView("dashboard");
  },

  resetForm() {
    this.currentImage = null;
    this.processedImage = null;
    this.autoDetectedData = null;
    this.autoDetectedWeekEnding = null;
    this.ocrAttempts = 0;

    // Reset documents
    for (let i = 1; i <= 3; i++) {
      this.currentDocs[i] = null;
      this.removeDoc(i);
    }

    // Reset timesheet upload
    const preview = document.getElementById("preview-front");
    const defaultView = document.getElementById("upload-front-default");
    const fileInput = document.getElementById("file-front");
    const status = document.getElementById("front-status");
    const zone = document.getElementById("timesheet-upload-zone");
    const dateSelect = document.getElementById("scan-date-select");
    const badge = document.getElementById("auto-detected-badge");

    if (preview) {
      preview.src = "";
      preview.classList.add("hidden");
    }
    if (defaultView) defaultView.classList.remove("hidden");
    if (fileInput) fileInput.value = "";
    if (status) {
      status.textContent = "Required";
      status.className = "text-xs text-red-500 font-medium";
    }
    if (zone) zone.classList.remove("required");
    if (dateSelect) {
      dateSelect.value = Utils.formatDateForInput(Utils.getWeekEnding());
      dateSelect.classList.remove("auto-filled");
    }
    if (badge) badge.classList.add("hidden");

    this.updateWeekDisplay();
  },

  retryOCR() {
    this.hideError();
    this.startOCR();
  },

  showManualEntryFallback() {
    this.hideError();
    document.getElementById("auto-results")?.classList.remove("hidden");

    // Create empty data structure
    const days = CONFIG.DAYS;
    const dayData = {};
    days.forEach((day) => {
      dayData[day] = {
        day: day,
        onTime: null,
        offTime: null,
        hasData: false,
        hours: 0,
      };
    });

    this.autoDetectedData = {
      days: dayData,
      firstWorkingDay: null,
      totalHours: 0,
      workingDays: 0,
      rawText: "MANUAL_ENTRY",
    };

    this.showResults();
    UI.show("OCR failed - please enter times manually", "error");
  },

  reprocessImage() {
    document.getElementById("auto-results")?.classList.add("hidden");
    document.getElementById("scan-btn")?.classList.remove("hidden");
    document
      .getElementById("scan-date-select")
      ?.classList.remove("auto-filled");
    document.getElementById("auto-detected-badge")?.classList.add("hidden");
    this.startOCR();
  },

  resetToAuto() {
    if (confirm("Reset all times to auto-detected values?")) {
      this.showResults();
      UI.show("Reset to auto-detected values", "info");
    }
  },
};

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Scan;
}
