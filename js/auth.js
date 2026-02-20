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

  /**
   * Initialize authentication
   */
  async init() {
    // Display version
    const versionEl = document.getElementById("version-display");
    if (versionEl) versionEl.textContent = `v${CONFIG.APP_VERSION}`;

    // Populate user select
    this.populateUserSelect();

    // Check biometric availability
    this.biometricAvailable = await this.isWebAuthnSupported();

    // Setup event listeners
    this.setupEventListeners();

    // Attempt auto-login
    await this.attemptAutoLogin();
  },

  /**
   * Check if WebAuthn is supported
   */
  async isWebAuthnSupported() {
    if (!window.PublicKeyCredential) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
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
  },

  populateUserSelect() {
    const select = document.getElementById("user-select");
    if (!select) return;

    const users = DB.users.getAll();
    select.innerHTML =
      '<option value="">-- Select User --</option>' +
      users
        .map((u) => `<option value="${u.username}">${u.username}</option>`)
        .join("");

    // If only one user, auto-select
    if (users.length === 1) {
      select.value = users[0].username;
      const pinSection = document.getElementById("pin-section");
      if (pinSection) pinSection.classList.remove("hidden");
    }
  },

  /**
   * Login with PIN
   */
  loginWithPin() {
    const username = document.getElementById("user-select")?.value;
    const pin = document.getElementById("pin-input")?.value;

    if (!username) {
      UI.showToast("Please select a user", "error");
      return;
    }

    if (!pin || pin.length !== 4) {
      UI.showToast("Enter 4-digit PIN", "error");
      return;
    }

    if (!DB.users.validatePin(username, pin)) {
      UI.showToast("Invalid PIN", "error");
      const pinInput = document.getElementById("pin-input");
      if (pinInput) pinInput.value = "";
      return;
    }

    const user = DB.users.get(username);
    this.completeLogin(user, false);
  },

  /**
   * Complete login process
   */
  completeLogin(user, fromBiometric = false) {
    this.currentUser = user;
    Settings.lastLoggedInUser = user.username;

    // Check biometric status
    this.checkBiometricStatus();

    // Notify app of successful login
    App.onLoginSuccess(user, fromBiometric);
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
    if (typeof Scan !== "undefined") Scan.resetForm();
    if (typeof VOR !== "undefined") VOR.resetForm();

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
  },

  /**
   * Show create user form
   */
  showCreateUser() {
    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-user-form");

    if (loginForm) loginForm.classList.add("hidden");
    if (createForm) createForm.classList.remove("hidden");
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
  },

  /**
   * Create new user
   */
  createUser() {
    const username = document.getElementById("new-username")?.value.trim();
    const pin = document.getElementById("new-pin")?.value;
    const confirmPin = document.getElementById("confirm-pin")?.value;

    // Validation
    if (!username) {
      UI.showToast("Enter driver name", "error");
      return;
    }

    if (DB.users.exists(username)) {
      UI.showToast("User already exists", "error");
      return;
    }

    if (!pin || pin.length !== 4) {
      UI.showToast("PIN must be 4 digits", "error");
      return;
    }

    if (pin !== confirmPin) {
      UI.showToast("PINs do not match", "error");
      return;
    }

    // Create user
    const newUser = {
      username,
      pin: Utils.hashPin(pin),
      created: new Date().toISOString(),
    };

    DB.users.add(newUser);
    this.userJustCreated = newUser;

    UI.showToast("Driver created successfully", "success");

    // Check for biometric setup
    if (this.biometricAvailable) {
      this.showBiometricSetupPrompt();
    } else {
      this.completeLogin(newUser, false);
    }
  },

  /**
   * Attempt auto-login with biometric
   */
  async attemptAutoLogin() {
    if (this.autoLoginAttempted) return;
    this.autoLoginAttempted = true;

    const users = DB.users.getAll();
    if (users.length === 0) return;

    const lastUser = Settings.lastLoggedInUser;
    const usernameToTry =
      lastUser || (users.length === 1 ? users[0].username : null);

    if (!usernameToTry) {
      this.updateBiometricLoginButton();
      return;
    }

    // Check if biometric is enabled for this user
    const biometricEnabled =
      localStorage.getItem(`biometric_${usernameToTry}`) === "true";
    const hasCredential = await DB.getBiometricCredential(usernameToTry);

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
    const deviceInfo = Utils.getDeviceInfo();

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(username);

    const options = {
      challenge: challenge,
      rp: {
        name: CONFIG.APP_NAME,
        id: window.location.hostname,
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

    const credential = await navigator.credentials.create({
      publicKey: options,
    });

    if (!credential) {
      throw new Error("Biometric registration cancelled");
    }

    await DB.saveBiometricCredential(username, credential);
    return credential;
  },

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(username, isAutoLogin = false) {
    const storedCred = await DB.getBiometricCredential(username);
    if (!storedCred) {
      throw new Error("No biometric credential found");
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

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
      rpId: window.location.hostname,
      ...(isAutoLogin && { hints: ["hybrid"] }),
    };

    const assertion = await navigator.credentials.get({ publicKey: options });

    if (!assertion) {
      throw new Error("Biometric authentication cancelled");
    }

    await DB.updateCredentialLastUsed(username);
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

    const deviceInfo = Utils.getDeviceInfo();

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
    const deviceInfo = Utils.getDeviceInfo();

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
      const user = DB.users.get(username);
      if (user) {
        this.hideAutoLoginScreen();
        this.completeLogin(user, true);
      }
    } catch (error) {
      this.hideAutoLoginScreen();
      UI.showToast("Authentication failed. Please use PIN.", "error");
    }
  },

  updateBiometricLoginButton() {
    const btn = document.getElementById("biometric-quick-login-btn");
    const text = document.getElementById("biometric-login-text");

    if (!this.biometricAvailable || !btn) {
      if (btn) btn.classList.add("hidden");
      return;
    }

    const deviceInfo = Utils.getDeviceInfo();
    if (text) text.textContent = `Login with ${deviceInfo.platform}`;
    btn.classList.remove("hidden");
  },

  async triggerFromLogin() {
    const username =
      document.getElementById("user-select")?.value ||
      Settings.lastLoggedInUser;
    if (!username) {
      UI.showToast("Please select a user first", "error");
      return;
    }

    this.showAutoLoginScreen(username);

    try {
      await this.authenticateWithBiometric(username, false);
      const user = DB.users.get(username);
      if (user) {
        this.hideAutoLoginScreen();
        this.completeLogin(user, true);
      }
    } catch (error) {
      this.hideAutoLoginScreen();
      UI.showToast("Biometric authentication failed. Please use PIN.", "error");
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

    const deviceInfo = Utils.getDeviceInfo();

    if (deviceInfo.hasFaceID) {
      if (icon) icon.className = "fas fa-smile";
      if (title) title.textContent = "Enable Face ID?";
      if (btn) btn.innerHTML = '<i class="fas fa-smile"></i> Enable Face ID';
    } else if (deviceInfo.isApple) {
      if (icon) icon.className = "fas fa-fingerprint";
      if (title) title.textContent = "Enable Touch ID?";
      if (btn)
        btn.innerHTML = '<i class="fas fa-fingerprint"></i> Enable Touch ID';
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
        btn.innerHTML = '<i class="fas fa-fingerprint"></i> Enable Face ID';
        btn.disabled = false;
      }
      UI.showToast("Setup failed. You can enable later in settings.", "error");
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

      Settings.closeBiometricSetupModal();
      Settings.updateBiometricSettingsUI();
      UI.showToast(`${Utils.getDeviceInfo().platform} enabled successfully!`);
    } catch (error) {
      console.error("Setup error:", error);
      UI.showToast("Setup failed. Please try again.", "error");
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
