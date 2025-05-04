// popup.js
// Popup dialog and settings UI for AI Studio Advanced Control Suite.

window.Popup = {
    /**
     * Create the settings popup
     */
    create() {
        if (document.getElementById(Config.ids.popup)) {
            State.popupElement = document.getElementById(Config.ids.popup);
            return;
        }
        // Create the popup element
        State.popupElement = window.DOM.createElement('div', { id: Config.ids.popup });
        // Build the popup header
        const headerDiv = window.DOM.createElement('div', { className: 'popup-header' });
        // --- Editable Title Display ---
        const titleDisplay = window.DOM.createElement('div', {
            id: 'popup-editable-title',
            className: 'popup-title popup-editable-title',
            textContent: State.settings.headingText || 'Eye in the Cloud',
            title: 'Click to edit title',
            tabindex: '0',
            style: 'cursor: text;',
            events: {
                click: (e) => window.Popup.enterEditTitleMode(e.target),
                focus: (e) => window.Popup.enterEditTitleMode(e.target),
                mousedown: (e) => { if (e.detail > 1) e.preventDefault(); }
            }
        });
        const closeButton = window.DOM.createElement('button', 
            { className: 'close-popup-button', events: { click: this.hide } },
            [window.DOM.createElement('span', { className: 'material-symbols-outlined notranslate', textContent: 'close' })]
        );
        headerDiv.appendChild(titleDisplay);
        headerDiv.appendChild(closeButton);
        State.popupElement.appendChild(headerDiv);
        // Build the popup content
        const contentDiv = window.DOM.createElement('div', { className: 'popup-content' });
        // --- Section 1: VIBE Mode Button ---
        const vibeSection = window.DOM.createElement('div', { className: 'popup-section vibe-section' });
        const vibeButton = window.DOM.createElement('button', {
            id: 'vibe-mode-toggle',
            className: 'vibe-button',
            events: {
                click: this.toggleVibeMode
            }
        }, [
            window.DOM.createElement('span', {
                className: 'material-symbols-outlined notranslate',
                textContent: 'bolt'
            }),
            'VIBE'
        ]);
        vibeSection.appendChild(vibeButton);
        contentDiv.appendChild(vibeSection); // Add VIBE section first
        // --- Section 2: History Settings ---
        const historyFieldset = window.DOM.createElement('fieldset', { className: 'popup-section' });
        const historyLegend = window.DOM.createElement('legend', { textContent: 'History' });
        historyFieldset.appendChild(historyLegend);
        // Add Show All toggle (inverted logic for limitHistory)
        historyFieldset.appendChild(
            window.DOM.createToggle(
                'show-all-history-toggle',
                'Show All',
                !State.settings.limitHistory,
                checked => Settings.update('limitHistory', !checked)
            )
        );
        // Turns slider
        const sliderContainer = window.DOM.createElement('div', { className: 'slider-container' });
        const sliderLabel = window.DOM.createElement('label', { htmlFor: 'num-turns-slider' });
        sliderLabel.appendChild(window.DOM.createElement('span', { textContent: 'Currently Showing: ' }));
        sliderLabel.appendChild(window.DOM.createElement('span', { id: 'num-turns-value', textContent: State.settings.limitHistory ? State.settings.numTurnsToShow : 'All' }));
        const slider = window.DOM.createElement('input', {
            id: 'num-turns-slider',
            type: 'range',
            min: '1',
            max: '10', // Will be updated dynamically
            value: State.settings.numTurnsToShow,
            events: {
                input: (e) => {
                    const sliderElement = e.target;
                    const value = parseInt(sliderElement.value);
                    const min = parseInt(sliderElement.min);
                    const max = parseInt(sliderElement.max);

                    // --- *** START: Added code for track fill *** ---
                    // Calculate percentage for CSS variable
                    const percentage = ((value - min) / (max - min)) * 100;
                    sliderElement.style.setProperty('--_slider-fill-percent', `${percentage}%`);
                    // --- *** END: Added code for track fill *** ---

                    // Original logic to update settings and display
                    if (State.settings.limitHistory) {
                        document.getElementById('num-turns-value').textContent = value;
                        Settings.update('numTurnsToShow', value);
                    }
                },
                change: (e) => {
                    const sliderElement = e.target;
                    const value = parseInt(sliderElement.value);
                    const min = parseInt(sliderElement.min);
                    const max = parseInt(sliderElement.max);
                    const percentage = ((value - min) / (max - min)) * 100;
                    sliderElement.style.setProperty('--_slider-fill-percent', `${percentage}%`);
                }
            }
        });

        // --- *** ADD Initial Setting of CSS variable *** ---
        const initialValue = parseInt(slider.value);
        const initialMin = parseInt(slider.min);
        const initialMax = parseInt(slider.max);
        const initialPercentage = ((initialValue - initialMin) / (initialMax - initialMin)) * 100;
        slider.style.setProperty('--_slider-fill-percent', `${initialPercentage}%`);
        // --- *** END Initial Setting *** ---

        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(slider);
        historyFieldset.appendChild(sliderContainer);
        contentDiv.appendChild(historyFieldset);
        // --- Section 3: UI Settings ---
        const uiFieldset = window.DOM.createElement('fieldset', { className: 'popup-section' });
        uiFieldset.appendChild(window.DOM.createElement('legend', { textContent: 'Hide' }));
        // Add toggle settings using our helper function
        uiFieldset.appendChild(
            window.DOM.createToggle('hide-sidebars-toggle', 'Sidebars', State.settings.hideSidebars, 
                checked => Settings.update('hideSidebars', checked))
        );
        uiFieldset.appendChild(
            window.DOM.createToggle('hide-header-toggle', 'Header', State.settings.hideHeader,
                checked => Settings.update('hideHeader', checked))
        );
        uiFieldset.appendChild(
            window.DOM.createToggle('hide-toolbar-toggle', 'Toolbar', State.settings.hideToolbar,
                checked => Settings.update('hideToolbar', checked))
        );
        // Add toggle for hide prompt chips (was showPromptChips)
        uiFieldset.appendChild(
            window.DOM.createToggle('hide-prompt-chips-toggle', 'Prompt Chips', State.settings.hidePromptChips,
                checked => Settings.update('hidePromptChips', checked))
        );
        // Add toggle for hide feedback buttons
        uiFieldset.appendChild(
            window.DOM.createToggle('hide-feedback-buttons-toggle', 'Feedback Buttons', State.settings.hideFeedbackButtons,
                checked => Settings.update('hideFeedbackButtons', checked))
        );
        contentDiv.appendChild(uiFieldset);
        // --- Section: Themes (moved here after UI Settings) ---
        const themeSection = window.DOM.createElement('fieldset', { id: 'theme-selector-section', className: 'popup-section theme-section' });
        themeSection.appendChild(window.DOM.createElement('legend', { textContent: 'Themes' }));
        const themeButtonsContainer = window.DOM.createElement('div', { className: 'theme-buttons-container'});
        // DOS Theme Button
        const dosButton = window.DOM.createElement('button', {
            id: 'theme-btn-dos',
            className: 'theme-select-button',
            title: 'DOS Terminal Theme',
            events: { click: () => {
                window.Popup.handleThemeButtonClick('dos');
            }}
        }, [window.DOM.createElement('span', {className: 'material-symbols-outlined notranslate', textContent: 'code'})]);
        // Nature Theme Button
        const natureButton = window.DOM.createElement('button', {
            id: 'theme-btn-nature',
            className: 'theme-select-button',
            title: 'Light Nature Theme',
            events: { click: () => {
                window.Popup.handleThemeButtonClick('nature');
            }}
        }, [window.DOM.createElement('span', {className: 'material-symbols-outlined notranslate', textContent: 'eco'})]); // or 'grass'
        themeButtonsContainer.appendChild(dosButton);
        themeButtonsContainer.appendChild(natureButton);
        themeSection.appendChild(themeButtonsContainer);
        contentDiv.appendChild(themeSection);

        State.popupElement.appendChild(contentDiv);
        // Add popup to document body
        document.body.appendChild(State.popupElement);
    },
    /**
     * Switches the title display element to an input field for editing.
     */
    enterEditTitleMode(displayElement) {
        if (!displayElement || displayElement.tagName === 'INPUT') return;
        const currentText = displayElement.textContent;
        const headerDiv = displayElement.parentNode;
        const closeButton = headerDiv.querySelector('.close-popup-button');
        // Create the input element
        const inputField = window.DOM.createElement('input', {
            type: 'text',
            id: 'popup-title-input',
            className: 'popup-title popup-title-input',
            value: currentText,
            'data-original-value': currentText,
            style: `width: ${headerDiv.offsetWidth - closeButton.offsetWidth - 40}px; background: transparent; border: none; border-bottom: 1px solid var(--eic-popup-accent); outline: none; color: inherit; font-size: inherit; font-weight: inherit; padding: 0; margin: 0;`,
            events: {
                blur: (e) => window.Popup.exitEditTitleMode(e.target),
                keydown: (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        window.Popup.exitEditTitleMode(e.target, true);
                    } else if (e.key === 'Escape') {
                        window.Popup.exitEditTitleMode(e.target, false);
                    }
                }
            }
        });
        headerDiv.replaceChild(inputField, displayElement);
        inputField.focus();
        inputField.select();
    },
    /**
     * Switches the input field back to a display element, saving if requested.
     */
    exitEditTitleMode(inputField, shouldSave = true) {
        if (!inputField || inputField.tagName !== 'INPUT') return;
        const headerDiv = inputField.parentNode;
        const closeButton = headerDiv.querySelector('.close-popup-button');
        const newValue = inputField.value.trim();
        const originalValue = inputField.getAttribute('data-original-value');
        let finalValue = originalValue;
        if (shouldSave) {
            if (newValue && newValue !== originalValue) {
                Settings.update('headingText', newValue);
                finalValue = newValue;
            } else {
                finalValue = originalValue;
            }
        } else {
            finalValue = originalValue;
        }
        if (!finalValue) {
            finalValue = 'Eye in the Cloud';
            if (shouldSave && State.settings.headingText !== finalValue) {
                Settings.update('headingText', finalValue);
            }
        }
        const titleDisplay = window.DOM.createElement('div', {
            id: 'popup-editable-title',
            className: 'popup-title popup-editable-title',
            textContent: finalValue,
            title: 'Click to edit title',
            tabindex: '0',
            style: 'cursor: text;',
            events: {
                click: (e) => window.Popup.enterEditTitleMode(e.target),
                focus: (e) => window.Popup.enterEditTitleMode(e.target),
                mousedown: (e) => { if (e.detail > 1) e.preventDefault(); }
            }
        });
        if (headerDiv && inputField) {
            headerDiv.replaceChild(titleDisplay, inputField);
        }
    },
    /**
     * Show the popup dialog
     */
    show() {
        if (!State.popupElement) {
            this.create();
        }
        
        // Remove call to Styles.addPopupStyles() - rely only on custom.css
        
        this.updateUIState();
        const blurOverlay = document.createElement('div');
        blurOverlay.id = 'adv-controls-blur-overlay';
        blurOverlay.style.position = 'fixed';
        blurOverlay.style.top = '0';
        blurOverlay.style.left = '0';
        blurOverlay.style.width = '100%';
        blurOverlay.style.height = '100%';
        blurOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        blurOverlay.style.zIndex = '9998';
        blurOverlay.style.opacity = '0';
        blurOverlay.addEventListener('click', this.hide);
        document.body.appendChild(blurOverlay);
        // Trigger the fade-in using requestAnimationFrame
        requestAnimationFrame(() => {
            blurOverlay.style.opacity = '1';
        });
        State.popupElement.classList.add('visible');
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--eic-popup-accent') || '#8ab4f8';
        document.documentElement.style.setProperty('--eic-popup-accent', accentColor);
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 10);
    },
    /**
     * Hide the popup dialog
     */
    hide() {
        if (!State.popupElement) return;
        State.popupElement.classList.remove('visible');
        const blurOverlay = document.getElementById('adv-controls-blur-overlay');
        if (blurOverlay) blurOverlay.remove();
        document.removeEventListener('click', window.Popup.handleOutsideClick);
    },
    /**
     * Handle clicks outside the popup
     */
    handleOutsideClick(e) {
        if (State.popupElement && 
            !State.popupElement.contains(e.target) && 
            e.target.id !== Config.ids.scriptButton) {
            window.Popup.hide();
        }
    },
    /**
     * Toggle popup visibility
     */
    toggle(event) {
        if (event) event.stopPropagation();
        
        // Remove call to Styles.addPopupStyles() here too
        
        if (State.popupElement?.classList.contains('visible')) {
            window.Popup.hide();
        } else {
            window.Popup.show();
        }
    },
    /**
     * Toggle VIBE mode on/off
     */
    toggleVibeMode() {
        if (State.isVibeModeActive) {
            // --- Deactivate VIBE mode ---
            State.isVibeModeActive = false;
            if (State.preVibeSettings) {
                // Restore previous settings using batchUpdate
                Settings.batchUpdate(State.preVibeSettings);
                State.preVibeSettings = null; // Clear saved state
            }
        } else {
            // --- Activate VIBE mode ---
            State.isVibeModeActive = true;
            // Deep copy current settings to save them
            // Using JSON parse/stringify for a simple deep clone suitable here
            State.preVibeSettings = JSON.parse(JSON.stringify(State.settings));
            // Define VIBE settings
            const vibeSettings = {
                limitHistory: true,
                numTurnsToShow: 1,
                hideSidebars: true,
                hideHeader: true,
                hideToolbar: true,
                hidePromptChips: true,
                hideFeedbackButtons: true
            };
            Settings.batchUpdate(vibeSettings); // Apply VIBE settings
        }
        // Update the popup UI immediately to reflect the change
        Popup.updateUIState();
    },
    /**
     * Handle theme button click
     */
    handleThemeButtonClick(themeName) {
        if (State.isVibeModeActive) return; // Don't change theme if VIBE is on
        if (State.activeTheme === themeName) {
            ThemeManager.removeActiveTheme(); // Toggle off
        } else {
            ThemeManager.applyTheme(themeName); // Activate new theme
        }
        // No need to call updateUIState here, apply/remove Theme will do it.
    },
    /**
     * Update UI elements in the popup to match current settings
     */
    updateUIState() {
        if (!State.popupElement) return;
        // --- Update editable title display if not editing ---
        const titleDisplay = State.popupElement.querySelector('#popup-editable-title');
        const titleInput = State.popupElement.querySelector('#popup-title-input');
        if (titleDisplay && !titleInput && titleDisplay.textContent !== State.settings.headingText) {
            titleDisplay.textContent = State.settings.headingText || 'Eye in the Cloud';
        }

        // --- Update VIBE button and section state ---
        const vibeButton = State.popupElement.querySelector('#vibe-mode-toggle');
        const sectionsToDisable = State.popupElement.querySelectorAll('.popup-content .popup-section:not(.vibe-section)'); // Select all sections except vibe
        if (vibeButton) {
            vibeButton.classList.toggle('active', State.isVibeModeActive);
        }
        sectionsToDisable.forEach(section => section.classList.toggle('disabled-by-vibe', State.isVibeModeActive));

        // --- Update Slider Max Value (Crucial: Do this BEFORE setting slider value/disabled state) ---
        const turnsSlider = State.popupElement?.querySelector('#num-turns-slider');
        if (turnsSlider) {
            let maxExchanges = 1; // Default to 1 if no turns found
            try {
                 const chatContainer = document.querySelector(window.Config.selectors.chatContainer);
                 if (chatContainer) {
                     const aiTurns = chatContainer.querySelectorAll(window.Config.selectors.aiTurn);
                     // Set max to at least 1, even if there are 0 AI turns, to avoid range errors.
                     maxExchanges = Math.max(1, aiTurns.length);
                 }
            } catch (error) {}
            // Only update if the max value is actually different
            if (parseInt(turnsSlider.max) !== maxExchanges) {
                turnsSlider.max = maxExchanges;
            }
        }

        // --- History Section Update ---
        const showAllToggle = State.popupElement?.querySelector('#show-all-history-toggle');
        // Note: turnsSlider is already defined and checked above
        const turnsValueDisplay = State.popupElement?.querySelector('#num-turns-value');
        const userWantsLimit = State.settings.limitHistory; // What the user explicitly set
        const isEffectivelyLimited = State.isVibeModeActive || userWantsLimit; // Is history actually limited?

        if (showAllToggle && turnsSlider && turnsValueDisplay) {
            showAllToggle.checked = !userWantsLimit; // Toggle reflects user's choice
            showAllToggle.disabled = State.isVibeModeActive; // Disable toggle in Vibe

            // Determine slider state and display text
            if (State.isVibeModeActive) {
                turnsSlider.disabled = true;
                turnsSlider.parentElement.style.opacity = '0.5';
                turnsValueDisplay.textContent = '1 (VIBE)';
                // Ensure slider visually shows 1, though disabled
                turnsSlider.value = 1;
            } else if (userWantsLimit) { // Vibe OFF, User wants limit ON
                turnsSlider.disabled = false;
                turnsSlider.parentElement.style.opacity = '1';
                // Ensure the current value doesn't exceed the calculated max
                let currentVal = State.settings.numTurnsToShow;
                let currentMax = parseInt(turnsSlider.max); // Use the max we just set
                if (currentVal > currentMax) {
                    currentVal = currentMax; // Cap the value if needed
                }
                turnsSlider.value = currentVal;
                turnsValueDisplay.textContent = State.settings.numTurnsToShow;
            } else { // Vibe OFF, User wants Show All
                turnsSlider.disabled = true;
                turnsSlider.parentElement.style.opacity = '0.5';
                turnsValueDisplay.textContent = 'All';
            }
        }

        const sidebarsToggle = State.popupElement.querySelector('#hide-sidebars-toggle');
        if (sidebarsToggle) {
            sidebarsToggle.checked = State.settings.hideSidebars;
            sidebarsToggle.disabled = State.isVibeModeActive;
        }
        const headerToggle = State.popupElement.querySelector('#hide-header-toggle');
        if (headerToggle) {
            headerToggle.checked = State.settings.hideHeader;
            headerToggle.disabled = State.isVibeModeActive;
        }
        const toolbarToggle = State.popupElement.querySelector('#hide-toolbar-toggle');
        if (toolbarToggle) {
            toolbarToggle.checked = State.settings.hideToolbar;
            toolbarToggle.disabled = State.isVibeModeActive;
        }
        const promptChipsToggle = State.popupElement.querySelector('#hide-prompt-chips-toggle');
        if (promptChipsToggle) {
            promptChipsToggle.checked = State.settings.hidePromptChips;
            promptChipsToggle.disabled = State.isVibeModeActive;
        }
        const feedbackButtonsToggle = State.popupElement.querySelector('#hide-feedback-buttons-toggle');
        if (feedbackButtonsToggle) {
            feedbackButtonsToggle.checked = State.settings.hideFeedbackButtons;
            feedbackButtonsToggle.disabled = State.isVibeModeActive;
        }

        // Also disable theme section when Vibe is active
        const themeSection = State.popupElement?.querySelector('#theme-selector-section');
        if (themeSection) {
             themeSection.classList.toggle('disabled-by-vibe', State.isVibeModeActive);
        }
        // --- Update Theme Button States ---
        const dosBtn = State.popupElement?.querySelector('#theme-btn-dos');
        const natureBtn = State.popupElement?.querySelector('#theme-btn-nature');
        if (dosBtn) dosBtn.classList.toggle('active', State.activeTheme === 'dos');
        if (natureBtn) natureBtn.classList.toggle('active', State.activeTheme === 'nature');

        // --- Update Slider Track Fill ---
        if (turnsSlider) {
            try {
                const currentValue = parseInt(turnsSlider.value);
                const currentMin = parseInt(turnsSlider.min);
                const currentMax = parseInt(turnsSlider.max);
                const range = currentMax - currentMin;
                const currentPercentage = (range > 0) ? (((currentValue - currentMin) / range) * 100) : 0;
                turnsSlider.style.setProperty('--_slider-fill-percent', `${currentPercentage}%`);
            } catch (err) {}
        }
    }
};
