/**
 * DRIVER TIMESHEET PRO - VOR (Vehicle Off Road)
 * Defect reporting and management
 */

const VOR = {
  // State
  currentImage: null,
  processedImage: null,
  additionalImage: null,
  autoDetectedData: null,

  // ==========================================
  // INITIALIZATION
  // ==========================================

  init() {
    console.log("🚛 VOR initialized");
    this.setupEventListeners();
    this.resetForm();
    return Promise.resolve();
  },

  setupEventListeners() {
    // Date input
    const dateSelect = document.getElementById("vor-date-select");
    if (dateSelect) {
      dateSelect.value = Utils.formatDateForInput(new Date());
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

    this.setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        this.currentImage = e.target.result;
        this.processedImage = await this.preprocessImage(this.currentImage);

        this.updateImagePreview(
          "vor-preview-main",
          "vor-upload-default",
          this.processedImage,
        );
        this.updateStatus("vor-photo-status", "Ready", "ready");

        UI.show(
          'Defect photo loaded. Tap "Scan Defect Report" to extract.',
          "success",
        );
      } catch (err) {
        this.processedImage = this.currentImage;
        this.updateImagePreview(
          "vor-preview-main",
          "vor-upload-default",
          this.currentImage,
        );
      } finally {
        this.setLoading(false);
      }
    };

    reader.onerror = () => {
      UI.show("Error reading image", "error");
      this.setLoading(false);
    };

    reader.readAsDataURL(file);
  },

  handleAdditionalSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > CONFIG.MAX_IMAGE_SIZE) {
      UI.show("Image too large (max 10MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.additionalImage = e.target.result;
      this.updateImagePreview(
        "vor-preview-additional",
        "vor-additional-default",
        this.additionalImage,
      );
      this.updateStatus("vor-additional-status", "Added", "ready");
      UI.show("Additional photo added", "success");
    };

    reader.readAsDataURL(file);
  },

  async preprocessImage(imageDataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
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
      };

      img.onerror = () => resolve(imageDataUrl);
      img.src = imageDataUrl;
    });
  },

  updateImagePreview(imgId, defaultId, src) {
    const img = document.getElementById(imgId);
    const def = document.getElementById(defaultId);

    if (img) {
      img.src = src;
      img.classList.remove("hidden");
    }
    if (def) def.classList.add("hidden");
  },

  updateStatus(statusId, text, type) {
    const el = document.getElementById(statusId);
    if (!el) return;

    el.textContent = text;
    el.className =
      "text-xs font-medium " +
      (type === "ready" ? "text-orange-600" : "text-red-500");
  },

  setLoading(loading) {
    const indicator = document.getElementById("vor-processing-indicator");
    if (indicator) {
      indicator.classList.toggle("hidden", !loading);
    }
  },

  // ==========================================
  // OCR PROCESSING
  // ==========================================

  async startOCR() {
    if (!this.processedImage && !this.currentImage) {
      UI.show("Defect photo is required", "error");
      return;
    }

    if (!API.hasKey()) {
      App.showGeminiKeyModal();
      return;
    }

    const imageToProcess = this.processedImage || this.currentImage;

    this.hideError();
    this.showProgress(true);

    try {
      const result = await this.performOCR(imageToProcess);
      this.autoDetectedData = result;

      this.populateForm(result);
      this.showResults();

      const filledFields = [
        result.defectNumber,
        result.date,
        result.time,
        result.regNumber,
        result.natureOfDefect,
      ].filter((f) => f).length;

      UI.show(
        `✅ Extracted ${filledFields}/5 fields with Gemini AI`,
        "success",
      );
    } catch (err) {
      console.error("VOR OCR Error:", err);
      this.showError(err.message);
    } finally {
      this.showProgress(false);
    }
  },

  async performOCR(imageDataUrl) {
    const base64Image = imageDataUrl.split(",")[1];

    const prompt = `You are an expert OCR system specialized in extracting data from Vehicle Defect Reports (VDR) and VOR (Vehicle Off Road) forms.

Analyze this defect report image and extract the following information:

1. DEFECT NUMBER (usually starts with "No" or just a number, e.g., "092018")
2. DATE (format DD-MM-YY or similar)
3. TIME (24-hour format, e.g., "16:00")
4. REG/TRAILER NUMBER (vehicle registration, e.g., "WU69 XDY")
5. NATURE OF DEFECT (description of the problem)

Return ONLY a JSON object in this exact format:
{
  "defectNumber": "string or null",
  "date": "DD-MM-YYYY or null",
  "time": "HH:MM or null",
  "regNumber": "string or null",
  "natureOfDefect": "string or null",
  "confidence": "high|medium|low"
}`;

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
                { inline_data: { mime_type: "image/jpeg", data: base64Image } },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OCR request failed");
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || [null, text];
      parsed = JSON.parse(jsonMatch[1] || text);
    } catch {
      parsed = this.extractDataFromText(text);
    }

    return parsed;
  },

  extractDataFromText(text) {
    const data = {
      defectNumber: null,
      date: null,
      time: null,
      regNumber: null,
      natureOfDefect: null,
      confidence: "low",
    };

    const defectMatch =
      text.match(/defectNumber["\s:]+([^"\n,}]+)/i) || text.match(/(\d{5,6})/);
    if (defectMatch) data.defectNumber = defectMatch[1].trim();

    const dateMatch =
      text.match(/date["\s:]+([^"\n,}]+)/i) ||
      text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
    if (dateMatch) data.date = dateMatch[1].trim();

    const timeMatch =
      text.match(/time["\s:]+([^"\n,}]+)/i) || text.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) data.time = timeMatch[1].trim();

    const regMatch =
      text.match(/regNumber["\s:]+([^"\n,}]+)/i) ||
      text.match(/([A-Z]{2}\d{2}\s*[A-Z]{3})/i);
    if (regMatch) data.regNumber = regMatch[1].trim();

    const natureMatch = text.match(/natureOfDefect["\s:]+([^"\n}]+)/i);
    if (natureMatch) data.natureOfDefect = natureMatch[1].trim();

    return data;
  },

  // ==========================================
  // FORM HANDLING
  // ==========================================

  populateForm(data) {
    // Defect number
    const defectEl = document.getElementById("vor-defect-number");
    if (data.defectNumber && defectEl) {
      defectEl.value = data.defectNumber;
      defectEl.classList.add("auto-filled");
      this.showBadge("vor-defect-number-badge");
    }

    // Date
    if (data.date) {
      const parsedDate = Utils.parseVORDate(data.date);
      if (parsedDate) {
        const dateEl = document.getElementById("vor-date-select");
        if (dateEl) {
          dateEl.value = Utils.formatDateForInput(parsedDate);
          dateEl.classList.add("auto-filled");
          this.showBadge("vor-auto-detected-badge");
        }
      }
    }

    // Time
    const timeEl = document.getElementById("vor-time");
    if (data.time && timeEl) {
      timeEl.value = data.time;
      timeEl.classList.add("auto-filled");
      this.showBadge("vor-time-badge");
    }

    // Reg number
    const regEl = document.getElementById("vor-reg-number");
    if (data.regNumber && regEl) {
      regEl.value = data.regNumber.toUpperCase();
      regEl.classList.add("auto-filled");
      this.showBadge("vor-reg-badge");
    }

    // Nature of defect
    const natureEl = document.getElementById("vor-nature");
    if (data.natureOfDefect && natureEl) {
      natureEl.value = data.natureOfDefect;
      natureEl.classList.add("auto-filled");
      this.showBadge("vor-nature-badge");
    }
  },

  showBadge(badgeId) {
    const badge = document.getElementById(badgeId);
    if (badge) badge.classList.remove("hidden");
  },

  // ==========================================
  // UI UPDATES
  // ==========================================

  showProgress(show) {
    const progress = document.getElementById("vor-ocr-progress");
    const scanBtn = document.getElementById("vor-scan-btn");

    if (progress) progress.classList.toggle("hidden", !show);
    if (scanBtn) scanBtn.classList.toggle("hidden", show);
  },

  showError(message) {
    const error = document.getElementById("vor-ocr-error");
    const msgEl = document.getElementById("vor-error-message");

    if (error) error.classList.remove("hidden");
    if (msgEl) msgEl.textContent = message;

    const scanBtn = document.getElementById("vor-scan-btn");
    if (scanBtn) scanBtn.classList.remove("hidden");
  },

  hideError() {
    const error = document.getElementById("vor-ocr-error");
    if (error) error.classList.add("hidden");
  },

  showResults() {
    const results = document.getElementById("vor-auto-results");
    const saveBtn = document.getElementById("vor-save-btn");
    const data = this.autoDetectedData || {};

    if (results) results.classList.remove("hidden");
    if (saveBtn) saveBtn.classList.remove("hidden");

    // Populate result display
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || "--";
    };

    setText("vor-result-defect-number", data.defectNumber);
    setText("vor-result-date", data.date);
    setText("vor-result-time", data.time);
    setText(
      "vor-result-reg",
      data.regNumber ? data.regNumber.toUpperCase() : null,
    );

    // Confidence badge
    const filledFields = [
      data.defectNumber,
      data.date,
      data.time,
      data.regNumber,
      data.natureOfDefect,
    ].filter((f) => f).length;
    const confidence =
      filledFields >= 4 ? "High" : filledFields >= 2 ? "Medium" : "Low";

    const badge = document.getElementById("vor-confidence-badge");
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
  },

  // ==========================================
  // SAVE & RESET
  // ==========================================

  async saveReport() {
    const defectNumber = document
      .getElementById("vor-defect-number")
      ?.value.trim();
    const date = document.getElementById("vor-date-select")?.value;
    const time = document.getElementById("vor-time")?.value;
    const regNumber = document
      .getElementById("vor-reg-number")
      ?.value.trim()
      .toUpperCase();
    const nature = document.getElementById("vor-nature")?.value.trim();

    if (!defectNumber) {
      UI.show("Defect number is required", "error");
      return;
    }
    if (!date) {
      UI.show("Date is required", "error");
      return;
    }

    const username = Auth.getCurrentUser()?.username;
    const vorId = `vor_${username}_${Date.now()}`;

    // Save images
    let mainImageId = null;
    let additionalImageId = null;

    if (this.processedImage || this.currentImage) {
      mainImageId = `${vorId}_main`;
      await DB.saveImage(mainImageId, this.processedImage || this.currentImage);
    }

    if (this.additionalImage) {
      additionalImageId = `${vorId}_additional`;
      await DB.saveImage(additionalImageId, this.additionalImage);
    }

    // Save report
    const report = {
      id: vorId,
      username,
      defectNumber,
      date,
      time: time || null,
      regNumber: regNumber || null,
      natureOfDefect: nature || null,
      mainImageId,
      additionalImageId,
      createdAt: new Date().toISOString(),
      ocrData: this.autoDetectedData,
    };

    await DB.saveVORReport(report);

    this.resetForm();
    UI.show(`VOR Report #${defectNumber} saved successfully`, "success");
    App.switchView("history");
  },

  resetForm() {
    this.currentImage = null;
    this.processedImage = null;
    this.additionalImage = null;
    this.autoDetectedData = null;

    // Clear inputs
    const inputs = [
      "vor-defect-number",
      "vor-time",
      "vor-reg-number",
      "vor-nature",
    ];
    inputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = "";
        el.classList.remove("auto-filled");
      }
    });

    // Reset date to today
    const dateEl = document.getElementById("vor-date-select");
    if (dateEl) {
      dateEl.value = Utils.formatDateForInput(new Date());
      dateEl.classList.remove("auto-filled");
    }

    // Hide badges
    const badges = [
      "vor-defect-number-badge",
      "vor-auto-detected-badge",
      "vor-time-badge",
      "vor-reg-badge",
      "vor-nature-badge",
    ];
    badges.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    // Reset image previews
    this.resetImagePreview(
      "vor-preview-main",
      "vor-upload-default",
      "vor-photo-status",
    );
    this.resetImagePreview(
      "vor-preview-additional",
      "vor-additional-default",
      "vor-additional-status",
    );

    // Hide results
    const results = document.getElementById("vor-auto-results");
    const saveBtn = document.getElementById("vor-save-btn");
    const scanBtn = document.getElementById("vor-scan-btn");

    if (results) results.classList.add("hidden");
    if (saveBtn) saveBtn.classList.add("hidden");
    if (scanBtn) scanBtn.classList.remove("hidden");
  },

  resetImagePreview(imgId, defaultId, statusId) {
    const img = document.getElementById(imgId);
    const def = document.getElementById(defaultId);
    const status = document.getElementById(statusId);

    if (img) {
      img.src = "";
      img.classList.add("hidden");
    }
    if (def) def.classList.remove("hidden");
    if (status) {
      status.textContent = statusId.includes("additional")
        ? "Optional"
        : "Required";
      status.className =
        "text-xs font-medium " +
        (statusId.includes("additional") ? "text-gray-400" : "text-red-500");
    }
  },

  retryOCR() {
    this.hideError();
    this.startOCR();
  },

  showManualEntry() {
    this.hideError();
    document.getElementById("vor-auto-results")?.classList.remove("hidden");
    document.getElementById("vor-save-btn")?.classList.remove("hidden");
  },
};

// Export for modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = VOR;
}
