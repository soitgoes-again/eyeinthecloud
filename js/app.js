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
                    } else {
                        // Handle failure to load CUSTOM_CSS resource
                    }
                } catch (e) {
                    // Handle error injecting base styles
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
                
                this.themeManagerInitialized = true; // Mark as initialized HERE
                
                // --- *** APPLY SAVED THEME ON LOAD *** ---
                const savedTheme = window.State.settings.activeTheme; // Get loaded theme pref
                
                if (savedTheme && typeof window.ThemeManager.applyTheme === 'function') {
                    try {
                        // Apply the saved theme
                        window.ThemeManager.applyTheme(savedTheme);
                        // Note: applyTheme now handles saving this state again via Settings.update,
                        // which is slightly redundant on load but harmless.
                    } catch (error) {
                        // Handle error applying saved theme
                        // Optionally clear the bad setting if apply fails
                        // window.Settings.update('activeTheme', null);
                    }
                } else if (savedTheme) {
                    // Handle inability to apply saved theme
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