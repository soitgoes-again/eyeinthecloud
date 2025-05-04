// ==UserScript==
// @name         Eye in the Cloud - A Google AI Studio Focused Experience
// @namespace    https://github.com/soitgoes-again/eyeinthecloud
// @version      0.369
// @description  Get focused by hiding the clutter, hide chat history, lag free text box, VIBE Mode, and themes!
// @author       so it goes...again
// @match        https://aistudio.google.com/*
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    let baseStylesInjected = false;

    // Application Initialization
    // ===================================================
    window.App = {
        themeManagerInitialized: false, // Track theme init
        customStyleElement: null, // To store the custom style element
        async init() {
            await window.Settings.load();

            // Inject Custom CSS FIRST
            if (!baseStylesInjected) {
                try {
                    const customCSSText = GM_getResourceText('CUSTOM_CSS');
                    if (customCSSText) {
                        this.customStyleElement = GM_addStyle(customCSSText);
                        baseStylesInjected = true;
                        console.log("AC Script: Custom component styles injected.");
                    } else {
                        console.error("AC Script: Failed to load CUSTOM_CSS resource!");
                    }
                } catch (e) {
                    console.error("AC Script: Error injecting base styles:", e);
                }
            }

            window.Styles.addCoreStyles();
            // Register menu command only if Popup.toggle is available
            if (window.Popup && typeof window.Popup.toggle === 'function') {
                GM_registerMenuCommand('Adv. Control Settings (AI Studio)', window.Popup.toggle);
            }
            
            // Initialize Theme Manager if available
            if (!this.themeManagerInitialized && window.ThemeManager) {
                window.ThemeManager.loadThemes();
                
                console.log("[App] ThemeManager initialized.");
                this.themeManagerInitialized = true; // Mark as initialized HERE
                
                // --- *** APPLY SAVED THEME ON LOAD *** ---
                const savedTheme = window.State.settings.activeTheme; // Get loaded theme pref
                
                if (savedTheme && typeof window.ThemeManager.applyTheme === 'function') {
                    console.log(`[App] Applying saved theme: ${savedTheme}`);
                    try {
                        // Apply the saved theme
                        window.ThemeManager.applyTheme(savedTheme);
                        // Note: applyTheme now handles saving this state again via Settings.update,
                        // which is slightly redundant on load but harmless.
                        console.log(`[App] Applied saved theme '${savedTheme}'.`);
                    } catch (error) {
                        console.error(`[App] Error applying saved theme '${savedTheme}':`, error);
                        // Optionally clear the bad setting if apply fails
                        // window.Settings.update('activeTheme', null);
                    }
                } else if (savedTheme) {
                    console.warn(`[App] Could not apply saved theme '${savedTheme}'. ThemeManager.applyTheme not available?`);
                }
                // --- *** END OF APPLY SAVED THEME *** ---
            }
            
            this.initializeProgressively();
        },
        initializeProgressively() {
            // Only initialize other modules, not the button
            const chatContainer = document.querySelector(window.Config.selectors.chatContainer);
            if (chatContainer) {
                window.UI.applyChatVisibilityRules();
            }
            const layoutContainer = document.querySelector(window.Config.selectors.overallLayout);
            if (layoutContainer) {
                window.UI.applyLayoutRules();
            }
            if (window.ElementWatcher) window.ElementWatcher.start(); 
        }
    };

    // --- SINGLE Point of Button Creation ---
    function createToggleButton() {
        if (window.Button && typeof window.Button.create === 'function') {
            window.Button.create();
        }
    }
    // Create the toggle button immediately or on DOMContentLoaded
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', createToggleButton);
    } else {
        createToggleButton();
    }

    // --- Initialize the App ---
    if (window.App) {
        window.App.init();
    }

})();