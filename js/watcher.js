// watcher.js
// Watches for DOM and settings changes to update UI and controls in AI Studio.

(function() {
    'use strict';

    // Element Watcher Module
    // ===================================================
    window.ElementWatcher = {
        observer: null,
        debounceTimer: null,

        // Map logical UI areas to their corresponding update functions
        uiUpdateFunctions: {
            layout: () => window.UI?.applyLayoutRules(), // Covers sidebars, header, toolbar, input fix
            heading: () => window.UI?.updateHeadingText(),
            promptChips: () => window.UI?.updatePromptChipsVisibility(),
            turnFooters: () => window.UI?.updateTurnFooterVisibility(),
            placeholder: () => window.UI?.updateInputPlaceholder(),
        },

        // Debounced function to handle DOM changes
        handleDomChange() {
            if (!window.UI || !window.State?.settings) return;

            // Ensure the InputLagFix button/modal logic runs if elements appear
            if (window.InputLagFix && typeof window.InputLagFix.init === 'function') {
                window.InputLagFix.init();
            }

            // --- START: Input Lag Fix Button Visibility Control ---
            try {
                const triggerButton = document.getElementById('adv-modal-trigger-btn');
                if (triggerButton) {
                    // Check if the zero-state wrapper exists OR if there are no chat turns yet
                    const isZeroState = !!document.querySelector('.zero-state-wrapper');
                    const hasChatTurns = !!document.querySelector('ms-chat-turn'); // Check if any chat turns exist

                    // Determine if the button should be visible
                    const shouldBeVisible = !isZeroState && hasChatTurns;

                    // Toggle the visibility class based on the state
                    triggerButton.classList.toggle('eic-visible', shouldBeVisible);

                    // Optional cleanup of the default hidden class once visibility is managed
                    if (shouldBeVisible) {
                        triggerButton.classList.remove('eic-hidden-by-default');
                    }

                    // --- Ensure our icon is first in the button container ---
                    // Find the wrapper and its parent container
                    const buttonWrapper = triggerButton.closest('.button-wrapper');
                    const parentContainer = buttonWrapper?.parentElement;
                    if (buttonWrapper && parentContainer && parentContainer.children[0] !== buttonWrapper) {
                        parentContainer.insertBefore(buttonWrapper, parentContainer.firstChild);
                    }
                } else {
                    // If button isn't found, InputLagFix.init() should try to create it on next run
                    // This check prevents errors if InputLagFix hasn't loaded yet
                    if (window.InputLagFix && typeof window.InputLagFix.init === 'function') {
                        window.InputLagFix.init();
                    }
                }
            } catch (error) {
                console.error("AC Script: Error controlling InputLagFix button visibility:", error);
            }
            // --- END: Input Lag Fix Button Visibility Control ---

            // Always call all UI update functions on DOM change
            window.UI.applyLayoutRules();
            window.UI.updateHeadingText();
            window.UI.updatePromptChipsVisibility();
            window.UI.updateTurnFooterVisibility();
            window.UI.updateInputPlaceholder();

            // --- START: Disclaimer Text Modification ---
            try {
                const disclaimerSpan = document.querySelector('.disclaimer-container span.disclaimer');
                if (disclaimerSpan) {
                    const newDisclaimerText = "This reality is for testing only. No production use.";
                    // Only update if the text is different to avoid unnecessary changes
                    if (disclaimerSpan.textContent.trim() !== newDisclaimerText) {
                        console.log("AC Script: Updating disclaimer text."); // Optional log
                        disclaimerSpan.textContent = newDisclaimerText;
                    }
                }
            } catch (error) {
                console.error("AC Script: Error modifying disclaimer text:", error);
            }
            // --- END: Disclaimer Text Modification ---

            if (window.UI) {
                window.UI.applyChatVisibilityRules();
            }
            // Update slider max if popup is open
            // Use classList.contains for reliability, as display might be handled by transitions
            if (window.State.popupElement?.classList.contains('visible')) {
                try {
                    const chatContainer = document.querySelector(window.Config.selectors.chatContainer);
                    if (chatContainer) {
                        const aiTurns = chatContainer.querySelectorAll(window.Config.selectors.aiTurn);
                        const maxExchanges = aiTurns.length > 0 ? aiTurns.length : 1;
                        const slider = window.State.popupElement.querySelector('#num-turns-slider');
                        const valueDisplay = window.State.popupElement.querySelector('#num-turns-value');
                        if (slider && valueDisplay) {
                            if (parseInt(slider.max) !== maxExchanges) {
                                // console.log(`AC Script: Updating slider max from ${slider.max} to ${maxExchanges}`);
                                slider.max = maxExchanges;
                            }
                            let currentValue = parseInt(slider.value);
                            if (currentValue > maxExchanges) {
                                // console.log(`AC Script: Capping slider value from ${currentValue} to ${maxExchanges}`);
                                slider.value = maxExchanges;
                                // Only update value display if NOT in VIBE mode and limiting is ON
                                if (!window.State.isVibeModeActive && window.State.settings.limitHistory) {
                                    valueDisplay.textContent = maxExchanges;
                                }
                                // Update the actual setting if it was capped
                                if (window.State.settings.numTurnsToShow !== maxExchanges) {
                                    // Use setTimeout to avoid potential conflicts if called during another update cycle
                                    setTimeout(() => Settings.update('numTurnsToShow', maxExchanges), 0);
                                }
                            }
                        }
                    }
                } catch (error) {}
            }
        },

        start() {
            if (this.observer) return; // Already started
            if (!window.UI || !window.State?.settings) {
                // Retry starting after a short delay if UI/State aren't ready
                setTimeout(() => this.start(), 500);
                return;
            }

            // --- Setup Mutation Observer ---
            this.observer = new MutationObserver(() => {
                // Debounce the handler
                clearTimeout(this.debounceTimer);
                // Use a reasonable debounce time (e.g., 150-250ms)
                this.debounceTimer = setTimeout(() => this.handleDomChange(), 200);
            });

            // Observe the body for subtree and child list changes
            // Important: Start observing *before* the initial call to handleDomChange
            this.observer.observe(document.body, { childList: true, subtree: true });

            // --- Initial UI Application ---
            // Call handler once shortly after starting observer to catch initial state
            // This ensures elements potentially added *during* script load are handled.
            setTimeout(() => this.handleDomChange(), 50); // Small delay after observer starts

        },

        stop() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }
        }
    };

})();
