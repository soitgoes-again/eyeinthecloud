// shared.js
// Shared configuration, state, and settings logic for AI Studio Advanced Control Suite.

window.Config = {
    selectors: {
        leftSidebar: 'ms-navbar',
        rightSidebar: 'ms-right-side-panel',
        header: 'ms-header-root',
        toolbar: 'ms-toolbar',
        chatInput: 'textarea[aria-label="Type something"]',
        runButton: 'button.run-button[aria-label="Run"]',
        overallLayout: 'body > app-root > ms-app > div',
        chatContainer: 'ms-autoscroll-container',
        userTurn: 'ms-chat-turn:has([data-turn-role="User"])',
        aiTurn: 'ms-chat-turn:has([data-turn-role="Model"])',
        buttonContainer: 'div.right-side'
    },
    ids: {
        scriptButton: 'advanced-control-toggle-button',
        popup: 'advanced-control-popup',
        fakeInput: 'advanced-control-fake-input',
        fakeRunButton: 'advanced-control-fake-run-button'
    },
    classes: {
        layoutHide: 'adv-controls-hide-ui'
    },
    settingsKey: 'aiStudioAdvancedControlSettings_v4',
    defaultSettings: {
        limitHistory: false,
        numTurnsToShow: 2,
        hideSidebars: false,
        hideHeader: false,
        hideToolbar: false,
        headingText: 'Eye in the Cloud',
        showPromptChips: false,
        hidePromptChips: false,
        hideFeedbackButtons: false,
        activeTheme: null  // Add activeTheme setting with null default (no theme)
        // Note: isVibeModeActive and preVibeSettings are NOT persisted intentionally.
        // Vibe mode is transient and should reset on page load/script reload.
    },
    icons: {
        visible: 'visibility',
        hidden: 'visibility_off'
    }
};

window.State = {
    settings: { ...window.Config.defaultSettings },
    isVibeModeActive: false, // New state for VIBE mode
    activeTheme: null, // 'dos', 'nature', or null
    themeCSS: {}, // Store loaded theme CSS strings { dos: "...", nature: "..." }
    preVibeSettings: null,   // New state to store settings before VIBE mode
    isCurrentlyHidden: false,
    scriptToggleButton: null,
    popupElement: null,
    chatObserver: null,
    debounceTimer: null,
    realChatInput: null,
    realRunButton: null,
    fakeChatInput: null
};

window.Settings = {
    async load() {
        const storedSettings = await GM_getValue(window.Config.settingsKey, window.Config.defaultSettings);
        window.State.settings = { ...window.Config.defaultSettings, ...storedSettings };
        window.State.isCurrentlyHidden = false;
    },
    async save() {
        // Save all settings, not just a subset
        await GM_setValue(window.Config.settingsKey, { ...window.State.settings });
    },
    update(key, value) {
        if (window.State.settings[key] === value) return;
        window.State.settings[key] = value;

        let needsChatRules = false;
        let needsLayoutRules = false;

        // Determine necessary updates based on the changed key
        if (key === 'numTurnsToShow' || key === 'limitHistory') {
            needsChatRules = true;
        } else if (key === 'hideSidebars' || key === 'hideHeader' || key === 'hideToolbar') {
            needsLayoutRules = true;
        }
        // No specific flags needed for headingText, hidePromptChips, hideFeedbackButtons as they are called directly below

        this.save(); // Save the updated settings

        // Apply necessary UI updates immediately
        // Debounce UI updates slightly if multiple settings change rapidly (like in Vibe mode restore)
        clearTimeout(window.State.uiUpdateDebounceTimer);
        window.State.uiUpdateDebounceTimer = setTimeout(() => {
            if (needsLayoutRules && window.UI) {
                window.UI.applyLayoutRules();
            }
            if (needsChatRules && window.UI) {
                window.UI.applyChatVisibilityRules(); // No need for extra delay here now
            }
            // --- Direct UI updates for specific settings ---
            if (key === 'headingText') {
                window.UI?.updateHeadingText();
            }
            if (key === 'hidePromptChips') {
                window.UI?.updatePromptChipsVisibility();
            }
            if (key === 'hideFeedbackButtons') {
                window.UI?.updateTurnFooterVisibility();
            }
            // Update popup UI if it's open
            if (window.State.popupElement?.classList.contains('visible') && window.Popup) {
                window.Popup.updateUIState();
            }
        }, 50); // Apply a small debounce
    },
    batchUpdate(settingsToUpdate) {
        let needsChatRules = false;
        let needsLayoutRules = false;
        let updated = false;

        for (const key in settingsToUpdate) {
            if (window.State.settings.hasOwnProperty(key) && window.State.settings[key] !== settingsToUpdate[key]) {
                window.State.settings[key] = settingsToUpdate[key];
                updated = true;
                if (key === 'numTurnsToShow' || key === 'limitHistory') {
                    needsChatRules = true;
                } else if (key === 'hideSidebars' || key === 'hideHeader' || key === 'hideToolbar') {
                    needsLayoutRules = true;
                }
                // Check other keys if they have direct UI updates needed within the batch logic if necessary
            }
        }

        if (!updated) return;

        this.save(); // Save the updated settings

        // Apply necessary UI updates immediately
        clearTimeout(window.State.uiUpdateDebounceTimer);
        window.State.uiUpdateDebounceTimer = setTimeout(() => {
            if (needsLayoutRules && window.UI) {
                window.UI.applyLayoutRules();
            }
            if (needsChatRules && window.UI) {
                window.UI.applyChatVisibilityRules();
            }
            // --- Direct UI updates for specific settings ---
            if (settingsToUpdate.hasOwnProperty('headingText')) {
                window.UI?.updateHeadingText();
            }
            if (settingsToUpdate.hasOwnProperty('hidePromptChips')) {
                window.UI?.updatePromptChipsVisibility();
            }
            if (settingsToUpdate.hasOwnProperty('hideFeedbackButtons')) {
                window.UI?.updateTurnFooterVisibility();
            }
            // Update popup UI if it's open
            if (window.State.popupElement?.classList.contains('visible') && window.Popup) {
                window.Popup.updateUIState();
            }
        }, 50);
    }
};
