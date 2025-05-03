// ==UserScript==
// @name         Eye in the Cloud - A Google AI Studio Focused Experience
// @namespace    http://tampermonkey.net/
// @version      0.369
// @description  Get focused by hiding the clutter, hide chat history, lag free text box, VIBE Mode, and themes!
// @author       so it goes...again
// @match        https://aistudio.google.com/*
// @resource     CUSTOM_CSS file:///d:/scripts/eyeinthecloud/css/custom.css
// @resource     DOS_THEME_CSS file:///d:/scripts/eyeinthecloud/css/theme.dos.css
// @resource     NATURE_THEME_CSS file:///d:/scripts/eyeinthecloud/css/theme.nature.css
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @run-at       document-idle
// @require      file:///d:/scripts/eyeinthecloud/js/shared.js
// @require      file:///d:/scripts/eyeinthecloud/js/styles.js
// @require      file:///d:/scripts/eyeinthecloud/js/dom.js
// @require      file:///d:/scripts/eyeinthecloud/js/inputfix.js
// @require      file:///d:/scripts/eyeinthecloud/js/popup.js
// @require      file:///d:/scripts/eyeinthecloud/js/thememanager.js
// @require      file:///d:/scripts/eyeinthecloud/js/ui.js
// @require      file:///d:/scripts/eyeinthecloud/js/button.js
// @require      file:///d:/scripts/eyeinthecloud/js/watcher.js
// @require      file:///d:/scripts/eyeinthecloud/js/app.js
// ==/UserScript==

(function() {
    'use strict';

    // Styles Module (Placeholder - implementation in eyeinthecloud.styles.js)
    // ===================================================
    window.Styles = {
        addCoreStyles() {
            if (window.coreStyles) {
                GM_addStyle(window.coreStyles);
            }
        },
        addPopupStyles() {
            console.log("AC Script: Attempting to add popup styles. Already added?", window.eyeinthecloudRemainingStylesAdded); // <-- Add log
            if (window.eyeinthecloudRemainingStylesAdded) return;
            window.eyeinthecloudRemainingStylesAdded = true;
            if (window.popupStyles && typeof window.popupStyles === 'function') {
                console.log("AC Script: Injecting dynamic popup styles now."); // <-- Add log
                GM_addStyle(window.popupStyles(window.Config));
            } else {
                console.warn("AC Script: window.popupStyles not found or not a function."); // <-- Add log
            }
        }
    };

    // Initialize the application
    if (window.App) {
        window.App.init();
    }

})();
