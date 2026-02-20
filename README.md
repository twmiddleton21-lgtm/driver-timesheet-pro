# 🚛 Driver Timesheet Pro

A professional PWA (Progressive Web App) for truck drivers to track timesheets, manage documents, and report vehicle defects with AI-powered OCR.

# [🚀 CLICK HERE TO OPEN APP](https://twmiddleton21-lgtm.github.io/driver-timesheet-pro/)

![Version](https://img.shields.io/badge/version-5.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

## ✨ Features

### 📊 Timesheet Management

- **AI-Powered OCR** - Automatically extract times from photos using Google Gemini AI
- **Week Calendar View** - Visual calendar showing worked days, documents, and VOR reports
- **Smart Detection** - Auto-detects week ending dates and working patterns
- **Manual Correction** - Easy editing of extracted times before saving

### 📄 Document Storage

- **3 Additional Uploads** - Store fuel receipts, circle check sheets, and extra timesheets
- **No OCR Required** - Documents saved as-is for your records
- **Full-Screen Viewer** - Tap to view documents in detail
- **Share Functionality** - Export documents via native share or download

### ⚠️ VOR Defect Reporting

- **Vehicle Off Road Reports** - Log defects with photos and details
- **AI Extraction** - Automatically reads defect numbers, dates, and descriptions
- **Searchable History** - Find reports by defect number or registration
- **Photo Evidence** - Attach main and additional photos per report

### 🔐 Biometric Authentication

- **Face ID / Touch ID** - Secure, fast login on supported devices
- **WebAuthn Standard** - Uses device's hardware security module
- **Privacy First** - Biometric data never leaves your device
- **PIN Fallback** - 4-digit PIN backup for all devices

### 🎨 Modern UI

- **Dark Mode** - Easy on the eyes during night shifts
- **Responsive Design** - Works on phones, tablets, and desktops
- **Touch Optimized** - Large buttons and swipe-friendly interface
- **Offline First** - Works without internet, syncs when connected

## 🚀 Quick Start

### For Drivers (End Users)

1. **Install the App**
   - Visit: `https://yourusername.github.io/driver-timesheet-pro/`
   - Tap "Add to Home Screen" when prompted
   - Or use browser menu → Install App

2. **Create Account**
   - Open the app
   - Tap "Create New Driver"
   - Enter name and 4-digit PIN
   - Enable Face ID/Touch ID when prompted

3. **Scan First Timesheet**
   - Tap the **+** button
   - Take photo of timesheet
   - Tap "Auto-Extract Times"
   - Review and correct if needed
   - Tap "Save All"

4. **Add Documents** (Optional)
   - Tap document slots below timesheet
   - Select or capture photos
   - Documents save automatically

### For Developers

```bash
# Clone repository
git clone https://github.com/yourusername/driver-timesheet-pro.git

# Navigate to project
cd driver-timesheet-pro

# Serve locally (Python 3)
python -m http.server 8000

# Or with Node.js
npx serve .
```
