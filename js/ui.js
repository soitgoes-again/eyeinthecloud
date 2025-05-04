// ==UserScript==
// @name         AI Studio - UI Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  UI Control Module for AI Studio Advanced Control Suite
// @author       You & Gemini
// @match        https://aistudio.google.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // UI Control Module
    // ===================================================
    window.UI = {
        applyChatVisibilityRules() {
            const chatContainer = document.querySelector(window.Config.selectors.chatContainer);
            if (!chatContainer) {
                return; // Exit if container not found
            }
            const allUserTurns = Array.from(chatContainer.querySelectorAll(window.Config.selectors.userTurn));
            const allAiTurns = Array.from(chatContainer.querySelectorAll(window.Config.selectors.aiTurn));
            const allTurns = Array.from(chatContainer.querySelectorAll(
                `${window.Config.selectors.userTurn}, ${window.Config.selectors.aiTurn}`
            ));
            let turnsToShow = [];
            let localDidHideSomething = false;
            const setDisplay = (element, visible) => {
                const targetDisplay = visible ? '' : 'none';
                if (element.style.display !== targetDisplay) {
                    element.style.display = targetDisplay;
                }
            };
            const limitEnabled = window.State.settings.limitHistory;
            const numExchangesToShow = window.State.settings.numTurnsToShow;

            if (!limitEnabled) {
                allTurns.forEach(turn => setDisplay(turn, true));
                localDidHideSomething = false;
            } else {
                if (numExchangesToShow <= 0) {
                    allTurns.forEach(turn => setDisplay(turn, true));
                    localDidHideSomething = false;
                } else {
                    // Robust: Show last N AI turns and their preceding user turns
                    const aiTurns = Array.from(chatContainer.querySelectorAll(window.Config.selectors.aiTurn));
                    const recentAiTurns = aiTurns.slice(-numExchangesToShow);
                    const turnElementsSet = new Set();
                    recentAiTurns.forEach(aiTurn => {
                        turnElementsSet.add(aiTurn);
                        // Find the immediately preceding user turn, if any
                        let previousElement = aiTurn.previousElementSibling;
                        while(previousElement && !previousElement.matches(window.Config.selectors.userTurn) && !previousElement.matches(window.Config.selectors.aiTurn)) {
                            previousElement = previousElement.previousElementSibling;
                        }
                        if (previousElement && previousElement.matches(window.Config.selectors.userTurn)) {
                            turnElementsSet.add(previousElement);
                        }
                    });
                    // Edge case: No AI turns, but user turns exist
                    if (aiTurns.length === 0 && numExchangesToShow >= 1) {
                        const userTurns = Array.from(chatContainer.querySelectorAll(window.Config.selectors.userTurn));
                        if (userTurns.length > 0) {
                            turnElementsSet.add(userTurns[userTurns.length - 1]);
                        }
                    }
                    allTurns.forEach(turn => {
                        const shouldBeVisible = turnElementsSet.has(turn);
                        setDisplay(turn, shouldBeVisible);
                        if (!shouldBeVisible) localDidHideSomething = true;
                    });
                }
            }
            if (window.State.isCurrentlyHidden !== localDidHideSomething) {
                window.State.isCurrentlyHidden = localDidHideSomething;
                if (window.Button && typeof window.Button.updateAppearance === 'function') {
                    window.Button.updateAppearance();
                }
            }
        },
        updateHeadingText() {
            const heading = document.querySelector('h1.gradient-text');
            if (heading && window.State?.settings) {
                heading.textContent = window.State.settings.headingText;
            }
        },
        updatePromptChipsVisibility() {
            const chips = document.querySelector('.chips-container');
            if (chips && window.State?.settings) {
                chips.style.display = window.State.settings.hidePromptChips ? 'none' : '';
            }
        },
        updateInputPlaceholder() {
            const overlay = document.querySelector('.placeholder-overlay');
            if (overlay) {
                overlay.textContent = 'If I tried to write a million words a day...';
            }
        },
        updateTurnFooterVisibility() {
            if (!window.State?.settings) return;

            const footers = document.querySelectorAll('.turn-footer');
            if (footers.length === 0) {
                return;
            }
            const shouldHide = window.State.settings.hideFeedbackButtons;
            footers.forEach(footer => {
                footer.style.display = shouldHide ? 'none' : '';
            });
        },
        applyLayoutRules() {
            const layoutContainer = document.querySelector(window.Config.selectors.overallLayout);
            if (!layoutContainer || !window.State?.settings) {
                return;
            }
            const shouldHideSidebars = window.State.settings.hideSidebars;
            const shouldHideHeader = window.State.settings.hideHeader;
            const shouldHideToolbar = window.State.settings.hideToolbar;
            layoutContainer.classList.toggle(`${window.Config.classes.layoutHide}-sidebars`, shouldHideSidebars);
            layoutContainer.classList.toggle(`${window.Config.classes.layoutHide}-header`, shouldHideHeader);
            layoutContainer.classList.toggle(`${window.Config.classes.layoutHide}-toolbar`, shouldHideToolbar);
            if (window.State.popupElement?.style.display === 'block' && window.Popup) {
                window.Popup.updateUIState();
            }
        }
    };

})();