/**
 * auth.js - Authentication Module
 * User management, login, and biometric authentication
 */

const Auth = {
  currentUser: null,
  biometricAvailable: false,
  biometricEnabled: false,
  autoLoginAttempted: false,
  userJustCreated: null,
  _quickAuthUser: null,
  _initComplete: false,

  /**
   * Initialize authentication
   */
  async init() {
    console.log("🔐 Auth initializing...");

    // Wait for DOM to be fully loaded
    if (document.readyState === "loading") {
      await new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", resolve, { once: true });
      });
    }

    // Display version
    const versionEl = document.getElementById("version-display");
    if (versionEl && typeof CONFIG !== "undefined") {
      versionEl.textContent = `v${CONFIG.APP_VERSION}`;
    }

    // DB should already be initialized by App.init(), but wait briefly to be safe
    let attempts = 0;
    while (attempts < 10) {
      if (typeof DB !== "undefined" && DB.users) {
        console.log("✅ DB is ready");
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    if (typeof DB === "undefined" || !DB.users) {
      console.error("❌ DB not available after waiting");
    }

    // Small delay to ensure DOM is fully rendered
    await new Promise((r) => setTimeout(r, 50));

    this.populateUserSelect();

    // Check biometric availability
    this.biometricAvailable = await this.isWebAuthnSupported();

    // Setup event listeners
    this.setupEventListeners();

    // Attempt auto-login
    await this.attemptAutoLogin();

    this._initComplete = true;
    console.log(
      "🔐 Auth initialized, biometric available:",
      this.biometricAvailable,
    );

    return Promise.resolve();
  },

  /**
   * Check if WebAuthn is supported
   */
  async isWebAuthnSupported() {
    if (!window.PublicKeyCredential) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      console.warn("WebAuthn check failed:", e);
      return false;
    }
  },

  setupEventListeners() {
    // User select change
    const userSelect = document.getElementById("user-select");
    if (userSelect) {
      userSelect.addEventListener("change", (e) => {
        const pinSection = document.getElementById("pin-section");
        if (pinSection) {
          pinSection.classList.toggle("hidden", !e.target.value);
        }
        this.updateBiometricLoginButton();
      });
    }

    // PIN input enter key
    const pinInput = document.getElementById("pin-input");
    if (pinInput) {
      pinInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.loginWithPin();
      });
    }

    // New PIN inputs - auto-focus next
    const newPin = document.getElementById("new-pin");
    const confirmPin = document.getElementById("confirm-pin");

    if (newPin && confirmPin) {
      newPin.addEventListener("input", (e) => {
        if (e.target.value.length === 4) {
          confirmPin.focus();
        }
      });

      confirmPin.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.createUser();
        }
      });
    }
  },

  populateUserSelect() {
    const select = document.getElementById("user-select");
    if (!select) {
      console.error("❌ user-select element not found in DOM");
      return;
    }

    // Ensure DB is available
    if (typeof DB === "undefined" || !DB.users) {
      console.error("❌ DB not initialized");
      select.innerHTML = '<option value="">-- Database Error --</option>';
      return;
    }

    try {
      const users = DB.users.getAll();
      console.log(
        "👥 Found users:",
        users.length,
        users.map((u) => u.username),
      );

      // Force rebuild the select options
      select.innerHTML = '<option value="">-- Select User --</option>';

      users.forEach((user) => {
        const option = document.createElement("option");
        option.value = user.username;
        option.textContent = user.username;
        select.appendChild(option);
      });

      // If only one user, auto-select
      if (users.length === 1) {
        select.value = users[0].username;
        const pinSection = document.getElementById("pin-section");
        if (pinSection) pinSection.classList.remove("hidden");
        this.updateBiometricLoginButton();
      }

      console.log("✅ Dropdown populated with", users.length, "users");
    } catch (error) {
      console.error("❌ Error populating users:", error);
      select.innerHTML = '<option value="">-- Error Loading Users --</option>';
    }
  },

  /**
   * Login with PIN
   */
  loginWithPin() {
    const username = document.getElementById("user-select")?.value;
    const pin = document.getElementById("pin-input")?.value;

    if (!username) {
      if (typeof UI !== "undefined") {
        UI.showToast("Please select a user", "error");
      } else {
        alert("Please select a user");
      }
      return;
    }

    if (!pin || pin.length !== 4) {
      if (typeof UI !== "undefined") {
        UI.showToast("Enter 4-digit PIN", "error");
      } else {
        alert("Enter 4-digit PIN");
      }
      return;
    }

    // Validate PIN against stored hash
    if (typeof DB === "undefined" || !DB.users.validatePin) {
      console.error("❌ DB validation not available");
      return;
    }

    if (!DB.users.validatePin(username, pin)) {
      if (typeof UI !== "undefined") {
        UI.showToast("Invalid PIN", "error");
      } else {
        alert("Invalid PIN");
      }
      const pinInput = document.getElementById("pin-input");
      if (pinInput) {
        pinInput.value = "";
        pinInput.focus();
      }
      return;
    }

    const user = DB.users.get(username);
    if (user) {
      this.completeLogin(user, false);
    } else {
      console.error("❌ User not found after validation");
      if (typeof UI !== "undefined") {
        UI.showToast("Login error - user not found", "error");
      }
    }
  },

  /**
   * Complete login process
   */
  completeLogin(user, fromBiometric = false) {
    console.log(
      "✅ Login complete for:",
      user.username,
      "Biometric:",
      fromBiometric,
    );

    this.currentUser = user;

    // Store last logged in user
    if (
      typeof Settings !== "undefined" &&
      Settings.lastLoggedInUser !== undefined
    ) {
      Settings.lastLoggedInUser = user.username;
    } else {
      localStorage.setItem("lastLoggedInUser", user.username);
    }

    // Check biometric status
    this.checkBiometricStatus();

    // Notify app of successful login
    if (typeof App !== "undefined" && App.onLoginSuccess) {
      App.onLoginSuccess(user, fromBiometric);
    } else {
      // Fallback if App not loaded
      this.showMainApp();
    }
  },

  /**
   * Show main app (fallback)
   */
  showMainApp() {
    const authScreen = document.getElementById("auth-screen");
    const mainApp = document.getElementById("main-app");

    if (authScreen) authScreen.classList.add("hidden");
    if (mainApp) mainApp.classList.remove("hidden");

    if (typeof UI !== "undefined" && UI.showToast) {
      UI.showToast(`Welcome, ${this.currentUser?.username}!`, "success");
    }
  },

  /**
   * Logout
   */
  logout() {
    console.log("👋 Logging out...");

    this.currentUser = null;
    this.biometricEnabled = false;
    this.autoLoginAttempted = false;

    // Reset forms
    if (typeof Scan !== "undefined" && Scan.resetForm) Scan.resetForm();
    if (typeof VOR !== "undefined" && VOR.resetForm) VOR.resetForm();

    // Show auth screen
    const authScreen = document.getElementById("auth-screen");
    const mainApp = document.getElementById("main-app");
    const pinSection = document.getElementById("pin-section");
    const pinInput = document.getElementById("pin-input");
    const userSelect = document.getElementById("user-select");

    if (mainApp) mainApp.classList.add("hidden");
    if (authScreen) authScreen.classList.remove("hidden");
    if (pinSection) pinSection.classList.add("hidden");
    if (pinInput) pinInput.value = "";
    if (userSelect) userSelect.value = "";

    this.updateBiometricLoginButton();

    // Repopulate user list
    this.populateUserSelect();
  },

  /**
   * Show create user form
   */
  showCreateUser() {
    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-user-form");

    if (loginForm) loginForm.classList.add("hidden");
    if (createForm) createForm.classList.remove("hidden");

    // Focus on username input
    setTimeout(() => {
      const usernameInput = document.getElementById("new-username");
      if (usernameInput) usernameInput.focus();
    }, 100);
  },

  /**
   * Hide create user form
   */
  hideCreateUser() {
    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-user-form");

    if (createForm) createForm.classList.add("hidden");
    if (loginForm) loginForm.classList.remove("hidden");

    // Reset state
    this.userJustCreated = null;

    // Clear inputs
    const username = document.getElementById("new-username");
    const newPin = document.getElementById("new-pin");
    const confirmPin = document.getElementById("confirm-pin");
    if (username) username.value = "";
    if (newPin) newPin.value = "";
    if (confirmPin) confirmPin.value = "";

    // Repopulate user select in case new user was added
    this.populateUserSelect();
  },

  /**
   * Create new user - FIXED VERSION
   */
  createUser() {
    console.log("📝 Starting user creation...");

    const usernameInput = document.getElementById("new-username");
    const newPinInput = document.getElementById("new-pin");
    const confirmPinInput = document.getElementById("confirm-pin");

    const username = usernameInput?.value.trim();
    const pin = newPinInput?.value;
    const confirmPin = confirmPinInput?.value;

    console.log("Username:", username, "PIN length:", pin?.length);

    // Validation
    if (!username) {
      console.log("❌ Validation failed: no username");
      if (typeof UI !== "undefined") {
        UI.showToast("Enter driver name", "error");
      } else {
        alert("Enter driver name");
      }
      if (usernameInput) usernameInput.focus();
      return;
    }

    // Check if DB is available
    if (typeof DB === "undefined" || !DB.users) {
      console.error("❌ Database not available");
      if (typeof UI !== "undefined") {
        UI.showToast("Database error - cannot create user", "error");
      } else {
        alert("Database error - cannot create user");
      }
      return;
    }

    if (DB.users.exists(username)) {
      console.log("❌ User already exists:", username);
      if (typeof UI !== "undefined") {
        UI.showToast("User already exists", "error");
      } else {
        alert("User already exists");
      }
      if (usernameInput) usernameInput.focus();
      return;
    }

    if (!pin || pin.length !== 4) {
      console.log("❌ PIN validation failed");
      if (typeof UI !== "undefined") {
        UI.showToast("PIN must be 4 digits", "error");
      } else {
        alert("PIN must be 4 digits");
      }
      if (newPinInput) newPinInput.focus();
      return;
    }

    if (pin !== confirmPin) {
      console.log("❌ PINs don't match");
      if (typeof UI !== "undefined") {
        UI.showToast("PINs do not match", "error");
      } else {
        alert("PINs do not match");
      }
      if (confirmPinInput) confirmPinInput.value = "";
      if (confirmPinInput) confirmPinInput.focus();
      return;
    }

    // Hash the PIN
    let hashedPin;
    if (typeof Utils !== "undefined" && Utils.hashPin) {
      hashedPin = Utils.hashPin(pin);
      console.log("PIN hashed successfully");
    } else {
      // Fallback simple hash if Utils not available
      console.warn("⚠️ Utils.hashPin not available, using fallback");
      hashedPin = btoa(pin); // Basic encoding - NOT for production!
    }

    // Create user object
    const newUser = {
      username,
      pin: hashedPin,
      created: new Date().toISOString(),
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };

    console.log("💾 Saving user to DB:", newUser.username);

    try {
      // Save to database
      const saved = DB.users.add(newUser);

      if (!saved) {
        throw new Error("DB.users.add returned null or undefined");
      }

      this.userJustCreated = saved;

      if (typeof UI !== "undefined") {
        UI.showToast("Driver created successfully", "success");
      } else {
        console.log("✅ User created successfully");
      }

      console.log("✅ User created:", saved.username);

      // Check for biometric setup
      if (this.biometricAvailable) {
        console.log("🔐 Showing biometric setup prompt");
        this.showBiometricSetupPrompt();
      } else {
        console.log("📱 Biometric not available, completing login");
        this.completeLogin(saved, false);
      }
    } catch (error) {
      console.error("❌ Error creating user:", error);
      if (typeof UI !== "undefined") {
        UI.showToast("Failed to create user: " + error.message, "error");
      } else {
        alert("Failed to create user: " + error.message);
      }
    }
  },

  /**
   * Attempt auto-login with biometric
   */
  async attemptAutoLogin() {
    if (this.autoLoginAttempted) return;
    this.autoLoginAttempted = true;

    if (typeof DB === "undefined" || !DB.users) {
      console.warn("⚠️ DB not available for auto-login");
      return;
    }

    const users = DB.users.getAll();
    if (users.length === 0) {
      console.log("ℹ️ No users for auto-login");
      return;
    }

    const lastUser =
      typeof Settings !== "undefined"
        ? Settings.lastLoggedInUser
        : localStorage.getItem("lastLoggedInUser");
    const usernameToTry =
      lastUser || (users.length === 1 ? users[0].username : null);

    if (!usernameToTry) {
      this.updateBiometricLoginButton();
      return;
    }

    // Check if biometric is enabled for this user
    const biometricEnabled =
      localStorage.getItem(`biometric_${usernameToTry}`) === "true";
    const hasCredential =
      typeof DB.getBiometricCredential === "function"
        ? await DB.getBiometricCredential(usernameToTry)
        : false;

    if (!biometricEnabled || !hasCredential || !this.biometricAvailable) {
      this.updateBiometricLoginButton();
      return;
    }

    // Show auto-login screen
    this.showAutoLoginScreen(usernameToTry);

    // Small delay for UI
    await new Promise((r) => setTimeout(r, 300));

    try {
      await this.authenticateWithBiometric(usernameToTry, true);
      const user = DB.users.get(usernameToTry);
      if (user) {
        this.hideAutoLoginScreen();
        this.completeLogin(user, true);
      }
    } catch (error) {
      console.log("Auto-login failed:", error);
      this.hideAutoLoginScreen();

      if (error.name === "NotAllowedError") {
        this.showQuickAuthButton(usernameToTry);
      } else {
        this.updateBiometricLoginButton();
      }
    }
  },

  /**
   * Register biometric credential
   */
  async registerBiometric(username) {
    const deviceInfo =
      typeof Utils !== "undefined" && Utils.getDeviceInfo
        ? Utils.getDeviceInfo()
        : {
            platform: "Biometric",
            hasFaceID: false,
            isApple: /iPhone|iPad|Mac/.test(navigator.userAgent),
          };

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(username);

    const rpId = window.location.hostname || "localhost";

    const options = {
      challenge: challenge,
      rp: {
        name:
          typeof CONFIG !== "undefined"
            ? CONFIG.APP_NAME
            : "Driver Timesheet Pro",
        id: rpId,
      },
      user: {
        id: userId,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required",
        requireResidentKey: true,
      },
      attestation: "none",
      extensions: { credProps: true },
    };

    try {
      const credential = await navigator.credentials.create({
        publicKey: options,
      });

      if (!credential) {
        throw new Error("Biometric registration cancelled");
      }

      if (typeof DB.saveBiometricCredential === "function") {
        await DB.saveBiometricCredential(username, credential);
      } else {
        console.warn("⚠️ DB.saveBiometricCredential not available");
        // Store minimal info in localStorage as fallback
        localStorage.setItem(
          `biometric_cred_${username}`,
          JSON.stringify({
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
          }),
        );
      }

      return credential;
    } catch (error) {
      console.error("Biometric registration error:", error);
      throw error;
    }
  },

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(username, isAutoLogin = false) {
    let storedCred;

    if (typeof DB.getBiometricCredential === "function") {
      storedCred = await DB.getBiometricCredential(username);
    } else {
      // Fallback to localStorage
      const credData = localStorage.getItem(`biometric_cred_${username}`);
      if (credData) {
        storedCred = JSON.parse(credData);
      }
    }

    if (!storedCred) {
      throw new Error("No biometric credential found");
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const rpId = window.location.hostname || "localhost";

    const options = {
      challenge: challenge,
      allowCredentials: [
        {
          id: new Uint8Array(storedCred.rawId),
          type: "public-key",
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      rpId: rpId,
      ...(isAutoLogin && { hints: ["hybrid"] }),
    };

    const assertion = await navigator.credentials.get({ publicKey: options });

    if (!assertion) {
      throw new Error("Biometric authentication cancelled");
    }

    if (typeof DB.updateCredentialLastUsed === "function") {
      await DB.updateCredentialLastUsed(username);
    }

    return true;
  },

  /**
   * Check biometric status
   */
  async checkBiometricStatus() {
    if (!this.currentUser) return;

    this.biometricEnabled =
      localStorage.getItem(`biometric_${this.currentUser.username}`) === "true";
  },

  // ==========================================
  // BIOMETRIC UI
  // ==========================================

  showAutoLoginScreen(username) {
    const screen = document.getElementById("auto-login-screen");
    const text = document.getElementById("auto-login-text");
    const subtext = document.getElementById("auto-login-subtext");
    const icon = document.getElementById("auto-login-icon");

    const deviceInfo =
      typeof Utils !== "undefined" && Utils.getDeviceInfo
        ? Utils.getDeviceInfo()
        : { platform: "Biometric", hasFaceID: false };

    if (text) text.textContent = `Welcome, ${username}`;
    if (subtext)
      subtext.textContent = deviceInfo.hasFaceID
        ? "Use Face ID to unlock"
        : "Use Touch ID to unlock";

    if (icon) {
      icon.innerHTML = deviceInfo.hasFaceID
        ? '<i class="fas fa-smile"></i>'
        : '<i class="fas fa-fingerprint"></i>';
    }

    if (screen) screen.classList.remove("hidden");
  },

  hideAutoLoginScreen() {
    const screen = document.getElementById("auto-login-screen");
    if (screen) screen.classList.add("hidden");
    this.hideQuickAuthButton();
  },

  showQuickAuthButton(username) {
    const btn = document.getElementById("quick-auth-btn");
    const text = document.getElementById("quick-auth-text");
    const deviceInfo =
      typeof Utils !== "undefined" && Utils.getDeviceInfo
        ? Utils.getDeviceInfo()
        : { platform: "Biometric" };

    if (text) text.textContent = `Tap to unlock with ${deviceInfo.platform}`;
    if (btn) btn.classList.remove("hidden");

    this._quickAuthUser = username;
  },

  hideQuickAuthButton() {
    const btn = document.getElementById("quick-auth-btn");
    if (btn) btn.classList.add("hidden");
  },

  async triggerQuickAuth() {
    const username = this._quickAuthUser;
    if (!username) return;

    this.hideQuickAuthButton();
    this.showAutoLoginScreen(username);

    try {
      await this.authenticateWithBiometric(username, false);
      const user =
        typeof DB !== "undefined" && DB.users ? DB.users.get(username) : null;
      if (user) {
        this.hideAutoLoginScreen();
        this.completeLogin(user, true);
      }
    } catch (error) {
      this.hideAutoLoginScreen();
      if (typeof UI !== "undefined") {
        UI.showToast("Authentication failed. Please use PIN.", "error");
      } else {
        alert("Authentication failed. Please use PIN.");
      }
    }
  },

  updateBiometricLoginButton() {
    const btn = document.getElementById("biometric-quick-login-btn");
    const text = document.getElementById("biometric-login-text");

    if (!this.biometricAvailable || !btn) {
      if (btn) btn.classList.add("hidden");
      return;
    }

    const deviceInfo =
      typeof Utils !== "undefined" && Utils.getDeviceInfo
        ? Utils.getDeviceInfo()
        : { platform: "Biometric" };

    if (text) text.textContent = `Login with ${deviceInfo.platform}`;
    btn.classList.remove("hidden");
  },

  async triggerFromLogin() {
    const username =
      document.getElementById("user-select")?.value ||
      (typeof Settings !== "undefined"
        ? Settings.lastLoggedInUser
        : localStorage.getItem("lastLoggedInUser"));

    if (!username) {
      if (typeof UI !== "undefined") {
        UI.showToast("Please select a user first", "error");
      } else {
        alert("Please select a user first");
      }
      return;
    }

    this.showAutoLoginScreen(username);

    try {
      await this.authenticateWithBiometric(username, false);
      const user =
        typeof DB !== "undefined" && DB.users ? DB.users.get(username) : null;
      if (user) {
        this.hideAutoLoginScreen();
        this.completeLogin(user, true);
      }
    } catch (error) {
      this.hideAutoLoginScreen();
      if (typeof UI !== "undefined") {
        UI.showToast(
          "Biometric authentication failed. Please use PIN.",
          "error",
        );
      } else {
        alert("Biometric authentication failed. Please use PIN.");
      }
    }
  },

  cancelAutoLogin() {
    this.hideAutoLoginScreen();
  },

  // ==========================================
  // BIOMETRIC SETUP PROMPTS
  // ==========================================

  showBiometricSetupPrompt() {
    const prompt = document.getElementById("biometric-setup-prompt");
    const icon = prompt?.querySelector(".biometric-prompt-icon i");
    const title = prompt?.querySelector(".biometric-prompt-title");
    const btn = prompt?.querySelector(".biometric-prompt-btn.primary");

    const deviceInfo =
      typeof Utils !== "undefined" && Utils.getDeviceInfo
        ? Utils.getDeviceInfo()
        : {
            hasFaceID: false,
            isApple: /iPhone|iPad|Mac/.test(navigator.userAgent),
          };

    if (deviceInfo.hasFaceID) {
      if (icon) icon.className = "fas fa-smile";
      if (title) title.textContent = "Enable Face ID?";
      if (btn) btn.innerHTML = '<i class="fas fa-smile"></i> Enable Face ID';
    } else if (deviceInfo.isApple) {
      if (icon) icon.className = "fas fa-fingerprint";
      if (title) title.textContent = "Enable Touch ID?";
      if (btn)
        btn.innerHTML = '<i class="fas fa-fingerprint"></i> Enable Touch ID';
    } else {
      if (icon) icon.className = "fas fa-fingerprint";
      if (title) title.textContent = "Enable Biometric Login?";
      if (btn)
        btn.innerHTML = '<i class="fas fa-fingerprint"></i> Enable Biometric';
    }

    if (prompt) prompt.classList.remove("hidden");
  },

  hideBiometricSetupPrompt() {
    const prompt = document.getElementById("biometric-setup-prompt");
    if (prompt) prompt.classList.add("hidden");
  },

  async enableFromPrompt() {
    if (!this.userJustCreated) {
      this.hideBiometricSetupPrompt();
      return;
    }

    const btn = document.querySelector(
      "#biometric-setup-prompt .biometric-prompt-btn.primary",
    );
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';
      btn.disabled = true;
    }

    try {
      await this.registerBiometric(this.userJustCreated.username);
      localStorage.setItem(
        `biometric_${this.userJustCreated.username}`,
        "true",
      );

      this.hideBiometricSetupPrompt();
      this.completeLogin(this.userJustCreated, true);
    } catch (error) {
      console.error("Setup error:", error);
      if (btn) {
        const deviceInfo =
          typeof Utils !== "undefined" && Utils.getDeviceInfo
            ? Utils.getDeviceInfo()
            : { hasFaceID: false };
        btn.innerHTML = deviceInfo.hasFaceID
          ? '<i class="fas fa-smile"></i> Enable Face ID'
          : '<i class="fas fa-fingerprint"></i> Enable Face ID';
        btn.disabled = false;
      }
      if (typeof UI !== "undefined") {
        UI.showToast(
          "Setup failed. You can enable later in settings.",
          "error",
        );
      }
      // Still complete login even if biometric fails
      this.completeLogin(this.userJustCreated, false);
    }

    this.userJustCreated = null;
  },

  skipSetup() {
    this.hideBiometricSetupPrompt();
    if (this.userJustCreated) {
      this.completeLogin(this.userJustCreated, false);
      this.userJustCreated = null;
    }
  },

  async startBiometricRegistration() {
    const btn = document.getElementById("start-biometric-setup-btn");
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';
      btn.disabled = true;
    }

    try {
      if (!this.currentUser) throw new Error("No user logged in");

      await this.registerBiometric(this.currentUser.username);
      localStorage.setItem(`biometric_${this.currentUser.username}`, "true");
      this.biometricEnabled = true;

      if (
        typeof Settings !== "undefined" &&
        Settings.closeBiometricSetupModal
      ) {
        Settings.closeBiometricSetupModal();
      }
      if (
        typeof Settings !== "undefined" &&
        Settings.updateBiometricSettingsUI
      ) {
        Settings.updateBiometricSettingsUI();
      }
      if (typeof UI !== "undefined") {
        const deviceInfo =
          typeof Utils !== "undefined" && Utils.getDeviceInfo
            ? Utils.getDeviceInfo()
            : { platform: "Biometric" };
        UI.showToast(`${deviceInfo.platform} enabled successfully!`);
      }
    } catch (error) {
      console.error("Setup error:", error);
      if (typeof UI !== "undefined") {
        UI.showToast("Setup failed. Please try again.", "error");
      }
      if (btn) {
        btn.innerHTML = '<i class="fas fa-fingerprint"></i> Set Up Now';
        btn.disabled = false;
      }
    }
  },

  // ==========================================
  // GETTERS
  // ==========================================

  getCurrentUser() {
    return this.currentUser;
  },

  isLoggedIn() {
    return !!this.currentUser;
  },
};

// Expose to window for global access
window.Auth = Auth;
