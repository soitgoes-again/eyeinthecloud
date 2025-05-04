// ==UserScript==
// @name         Eye in the Cloud - A Google AI Studio Focused Experience
// @namespace    https://github.com/soitgoes-again/eyeinthecloud
// @version      0.369
// @description  Get focused by hiding the clutter, hide chat history, lag free text box, VIBE Mode, and themes!
// @author       so it goes...again
// @match        https://aistudio.google.com/*
// @resource     CUSTOM_CSS https://raw.githubusercontent.com/soitgoes-again/eyeinthecloud/main/css/custom.css
// @resource     DOS_THEME_CSS https://raw.githubusercontent.com/soitgoes-again/eyeinthecloud/main/css/theme.dos.css
// @resource     NATURE_THEME_CSS https://raw.githubusercontent.com/soitgoes-again/eyeinthecloud/main/css/theme.nature.css
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 1. Define window.Config, window.State, window.Settings, window.DOM
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
        fakeChatInput: null,
        uiUpdateDebounceTimer: null // Added debounce timer for UI updates
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

    // dom.js
    // DOM utility functions for creating and managing elements in AI Studio Advanced Control Suite.

    window.DOM = {
        /**
         * Create an element with attributes and children
         */
        createElement(tag, attributes = {}, children = []) {
            const element = document.createElement(tag);
            // Apply attributes
            for (const [key, value] of Object.entries(attributes)) {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else if (key === 'events') {
                    for (const [event, handler] of Object.entries(value)) {
                        element.addEventListener(event, handler);
                    }
                } else {
                    element.setAttribute(key, value);
                }
            }
            // Append children
            if (!Array.isArray(children)) children = [children];
            children.filter(child => child).forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
            return element;
        },
        /**
         * Create a toggle switch with label
         */
        createToggle(id, labelText, checked, onChange) {
            const container = this.createElement('div', { className: 'toggle-setting' });
            const label = this.createElement('label', {
                className: 'toggle-label',
                htmlFor: id,
                textContent: labelText
            });
            const toggle = this.createElement('input', {
                type: 'checkbox',
                className: 'basic-slide-toggle',
                id: id,
                checked: checked,
                events: { change: (e) => onChange(e.target.checked) }
            });
            container.appendChild(label);
            container.appendChild(toggle);
            return container;
        }
    };


    // 2. Define window.Styles (consolidated)
    // styles.js
    // Minimal core CSS logic for AI Studio Advanced Control Suite. All main styles are in custom.css.

    window.Styles = {
        coreStyles: `
            /* Basic UI hiding classes - essential structure only */
            .adv-controls-hide-ui-sidebars ms-navbar,
            .adv-controls-hide-ui-sidebars ms-right-side-panel {
                display: none !important;
            }
            .adv-controls-hide-ui-header ms-header-root {
                display: none !important;
            }
            .adv-controls-hide-ui-toolbar ms-toolbar {
                display: none !important;
            }
        `,
        addCoreStyles() {
            // Inject the core styles string defined above
            if (this.coreStyles) {
                 GM_addStyle(this.coreStyles);
            }
        },
        addPopupStyles() {
            // This function should now do nothing as custom.css handles it.
            // console.log("Popup styles handled by custom.css");
            return;
        }
    };


    // 3. Define window.InputLagFix
    // inputfix.js
    // Provides a modal to fix input lag and manage advanced input in AI Studio.

    window.InputLagFix = {
        modalElement: null,
        modalTextarea: null,
        modalContent: null, // Added reference for opacity
        triggerButton: null,
        persistentModalText: '', // Store text here
        isInitialized: false,

        init() {
            // This ensures modal is created once, trigger button is attempted when needed
            if (!this.isInitialized) {
                this.createModal(); // Create modal structure once
                this.isInitialized = true;
            }
            this.createTriggerButton(); // Attempt to create/find button
        },

        createTriggerButton() {
            const buttonId = 'adv-modal-trigger-btn';
            const targetContainerSelector = '.prompt-input-wrapper-container';

            // Check if button already exists in the DOM
            const existingButton = document.getElementById(buttonId);
            if (existingButton && document.body.contains(existingButton)) {
                this.triggerButton = existingButton; // Update reference if needed
                // Ensure listener is attached (prevents issues if script reloads)
                existingButton.removeEventListener('click', this.showModal); // Remove potential old listener
                existingButton.addEventListener('click', () => this.showModal());
                return; // Already exists
            }

            // If we have a reference but it's detached, clear it
            if (this.triggerButton && !document.body.contains(this.triggerButton)) {
                this.triggerButton = null;
            }

            // Create the button only if necessary
            if (!this.triggerButton) {
                const parentContainer = document.querySelector(targetContainerSelector);
                if (!parentContainer) {
                    return; // Cannot append yet
                }

                const button = document.createElement('button');
                button.id = buttonId;
                // Keep existing classes for Material styling, add new class for default hiding
                button.className = 'mdc-icon-button mat-mdc-icon-button mat-unthemed mat-mdc-button-base gmat-mdc-button adv-modal-trigger eic-hidden-by-default';
                button.setAttribute('mat-icon-button', '');
                button.setAttribute('aria-label', 'Open Advanced Input');
                button.setAttribute('mattooltip', 'Open Advanced Input');

                const iconSpan = document.createElement('span');
                iconSpan.className = 'material-symbols-outlined notranslate';
                iconSpan.textContent = 'chat_bubble';
                button.appendChild(iconSpan);

                // Add ripple/focus/touch elements
                const spanRipple = document.createElement('span');
                spanRipple.className = 'mat-mdc-button-persistent-ripple mdc-icon-button__ripple';
                button.appendChild(spanRipple);
                const focusIndicator = document.createElement('span');
                focusIndicator.className = 'mat-focus-indicator';
                button.appendChild(focusIndicator);
                const touchTarget = document.createElement('span');
                touchTarget.className = 'mat-mdc-button-touch-target';
                button.appendChild(touchTarget);

                // Add event listener only once during creation
                button.addEventListener('click', () => this.showModal());

                // Create a simple wrapper
                const buttonWrapper = document.createElement('div');
                buttonWrapper.className = 'button-wrapper'; // Match existing structure
                buttonWrapper.appendChild(button);

                // Append the wrapper simply to the end of the parent container
                parentContainer.appendChild(buttonWrapper);

                this.triggerButton = button; // Store reference
            }
        },

        createModal() {
            if (document.getElementById('adv-input-modal-overlay')) {
                 this.modalElement = document.getElementById('adv-input-modal-overlay');
                 this.modalContent = document.getElementById('adv-input-modal-content');
                 this.modalTextarea = document.getElementById('adv-input-modal-textarea');
                 return; // Already exists
            }

            // Outer Overlay - Let CSS handle positioning and visibility
            this.modalElement = document.createElement('div');
            this.modalElement.id = 'adv-input-modal-overlay';

            // Close modal if clicking overlay background
            this.modalElement.addEventListener('click', (event) => {
                if (event.target === this.modalElement) {
                   this.handleCancel();
                }
            });

            // Inner Content Container - Minimal inline styles
            this.modalContent = document.createElement('div');
            this.modalContent.id = 'adv-input-modal-content';
            Object.assign(this.modalContent.style, {
                width: '80%',
                height: '80%',
                maxWidth: '1000px',
                maxHeight: '700px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px'
            });

            // Textarea - Only layout-related styles
            this.modalTextarea = document.createElement('textarea');
            this.modalTextarea.id = 'adv-input-modal-textarea';
            Object.assign(this.modalTextarea.style, {
                flexGrow: '1',
                width: 'calc(100% - 20px)',
                borderRadius: '4px',
                marginBottom: '15px',
                padding: '10px',
                fontSize: '1rem',
                resize: 'none',
                outline: 'none'
            });
            // Prevent clicks inside textarea from closing modal
            this.modalTextarea.addEventListener('click', (event) => event.stopPropagation());

            // Button Container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'adv-modal-buttons';
            Object.assign(buttonContainer.style, {
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: 'auto' // Push buttons to bottom
            });
            // Prevent clicks inside button area from closing modal
            buttonContainer.addEventListener('click', (event) => event.stopPropagation());

            // Helper to create styled buttons
            const createModalButton = (text, onClick) => {
                const button = document.createElement('button');
                button.textContent = text;
                Object.assign(button.style, {
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                });
                button.addEventListener('click', onClick);
                return button;
            };

            // Create Buttons
            const cancelButton = createModalButton('Cancel', this.handleCancel.bind(this));
            const addButton = createModalButton('Add to Input', this.handleAdd.bind(this));
            const sendButton = createModalButton('Send', this.handleSend.bind(this));
            // No Object.assign for sendButton color/background/border
            // No mouseover/mouseout listeners for any button

            // Append elements
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(addButton);
            buttonContainer.appendChild(sendButton);

            this.modalContent.appendChild(this.modalTextarea);
            this.modalContent.appendChild(buttonContainer);

            this.modalElement.appendChild(this.modalContent);
            document.body.appendChild(this.modalElement);
        },

        showModal() {
            if (!this.modalElement) this.createModal(); // Ensure it exists
            if (!this.modalElement) return; // Bail if creation failed

            this.modalTextarea.value = this.persistentModalText;
            this.modalElement.classList.add('visible');
            this.modalTextarea.focus();
            // Add keydown listener for Escape key
            document.addEventListener('keydown', this.handleEscKey);
        },

        hideModal() {
            if (this.modalElement) {
                this.modalElement.classList.remove('visible');
            }
             // Remove keydown listener
             document.removeEventListener('keydown', this.handleEscKey);
        },

        // Bind 'this' correctly or use arrow function
        handleEscKey: (event) => {
            if (event.key === 'Escape') {
                 // Check if 'this' refers to InputLagFix object
                 if (window.InputLagFix && window.InputLagFix.modalElement?.classList.contains('visible')) { // New check
                      window.InputLagFix.handleCancel();
                 }
            }
        },

        handleCancel() {
             if (!this.modalTextarea) return;
            this.persistentModalText = this.modalTextarea.value; // Save text
            this.hideModal();
        },

        handleAdd() {
             if (!this.modalTextarea) return;
            const realInput = document.querySelector(window.Config.selectors.chatInput);
            if (!realInput) {
                this.hideModal();
                return;
            }

            const textToAdd = this.modalTextarea.value;
            this.persistentModalText = textToAdd; // Save text

            // Append text, adding a newline if real input already has content
            realInput.value += (realInput.value.trim() ? '\n' : '') + textToAdd;

            // Dispatch events
            realInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            realInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

            // Optional focus/blur might help some frameworks update
            // realInput.focus();
            // realInput.blur();

            this.hideModal();
        },

        handleSend() {
             if (!this.modalTextarea) return;
            const realInput = document.querySelector(window.Config.selectors.chatInput);
            const realRunButton = document.querySelector(window.Config.selectors.runButton);

            if (!realInput || !realRunButton) {
                 this.hideModal(); // Hide modal even if elements aren't found
                return;
            }

            const textToSend = this.modalTextarea.value;
            if (!textToSend.trim()) {
                this.handleCancel(); // Treat empty send as cancel
                return;
            }

            // Append text
            realInput.value += (realInput.value.trim() ? '\n' : '') + textToSend;

            // Dispatch events
            realInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            realInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

            // Click the real button after a short delay
            setTimeout(() => {
                if (realRunButton && !realRunButton.disabled) {
                    realRunButton.click();
                    this.persistentModalText = ''; // Clear persistent text on successful send
                    if(this.modalTextarea) this.modalTextarea.value = ''; // Clear textarea visually
                } else {
                    this.persistentModalText = textToSend; // Keep text if send failed
                }
                this.hideModal(); // Hide modal after attempt
            }, 150); // 150ms delay
        }
    };


    // 4. Define window.Popup
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


    // 5. Define window.ThemeManager
    // thememanager.js
    // Theme management logic for Eye in the Cloud (AI Studio Advanced Control Suite).

    // --- Embedded Theme CSS ---
    const dosThemeCSS = `
    /* == Theme: DOS Green Terminal == */
    body.theme-dos-applied {
      /* --- Core Palette --- */
      --mdc-theme-primary: #00ff00; /* Bright Green */
      --mdc-theme-on-primary: #000000; /* Black text on green */

      --mdc-theme-background: #000000; /* Black background */
      --mdc-theme-on-background: #00ff00; /* Green text on black */

      --mdc-theme-surface: #111111; /* Very dark grey for surfaces */
      --mdc-theme-on-surface: #00ff00; /* Green text on surfaces */

      --mdc-theme-surface-variant: #222222; /* Slightly lighter dark grey */
      --mdc-theme-on-surface-variant: #00cc00; /* Slightly dimmer green */

      --mdc-theme-outline: #008000; /* Darker green for borders/outlines */
      --mdc-theme-outline-variant: #005000; /* Even darker green */

      --mdc-theme-error: #ff0000; /* Standard red for errors */
      --mdc-theme-on-error: #000000; /* Black text on red */

      /* --- Typography --- */
      --mdc-typography-font-family: 'Courier New', Courier, monospace;
      font-family: 'Courier New', Courier, monospace !important;

      /* --- Shape (Optional) --- */
      --mdc-shape-small-component-radius: 0px;
      --mdc-shape-medium-component-radius: 0px;
      --mdc-shape-large-component-radius: 0px;
    }
    body.theme-dos-applied ms-code-block {
      background-color: #1a1a1a !important;
      border: 1px solid #005000 !important;
    }
    body.theme-dos-applied ms-code-block code {
      color: #00ff00 !important;
    }
    body.theme-dos-applied .material-symbols-outlined {
        color: var(--mdc-theme-on-surface);
    }
    body.theme-dos-applied button .material-symbols-outlined {
        color: inherit;
    }
    `;

    const natureThemeCSS = `
    /* == Theme: Light Nature == */
    body.theme-nature-applied {
      --mdc-theme-primary: #4caf50;
      --mdc-theme-on-primary: #ffffff;
      --mdc-theme-background: #f5f5f5;
      --mdc-theme-on-background: #444444;
      --mdc-theme-surface: #ffffff;
      --mdc-theme-on-surface: #333333;
      --mdc-theme-surface-variant: #e0e0e0;
      --mdc-theme-on-surface-variant: #555555;
      --mdc-theme-outline: #bdbdbd;
      --mdc-theme-outline-variant: #cccccc;
      --mdc-theme-error: #d32f2f;
      --mdc-theme-on-error: #ffffff;
      --mdc-typography-font-family: 'Roboto', 'Helvetica Neue', sans-serif;
      font-family: 'Roboto', 'Helvetica Neue', sans-serif !important;
      --mdc-shape-small-component-radius: 6px;
      --mdc-shape-medium-component-radius: 12px;
      --mdc-shape-large-component-radius: 16px;
    }
    body.theme-nature-applied .material-symbols-outlined {
        color: var(--mdc-theme-on-surface);
    }
    body.theme-nature-applied button .material-symbols-outlined {
        color: inherit;
    }
    body.theme-nature-applied .mdc-button--raised .mdc-button__icon,
    body.theme-nature-applied .mat-mdc-raised-button .mat-icon {
        color: var(--mdc-theme-on-primary);
    }
    `;
    // --- End Embedded CSS ---

    window.ThemeManager = {
        styleElements: {},
        loadThemes() {
            // Ensure resource names are mapped for theme switching
            window.State.themeResourceNames = {
                'dos': 'DOS_THEME_CSS',
                'nature': 'NATURE_THEME_CSS'
            };
        },
        applyTheme(themeName) {
            // --- Re-enable this function ---
            if (!window.State.themeResourceNames) {
                this.loadThemes();
            }
            const resourceName = window.State.themeResourceNames[themeName];
            if (!resourceName) {
                return;
            }

            this.removeActiveThemeClasses();

            // Inject Theme Override CSS if not already present or re-enable it
            if (!this.styleElements[themeName]) {
                const cssText = GM_getResourceText(resourceName);
                if (cssText) {
                    // IMPORTANT: Theme CSS should ONLY contain variable overrides now
                    this.styleElements[themeName] = GM_addStyle(cssText);
                } else {
                    return;
                }
            } else {
                this.styleElements[themeName].disabled = false; // Re-enable if previously disabled
            }

            // Ensure other theme stylesheets are disabled
            for (const name in this.styleElements) {
                if (name !== themeName && this.styleElements[name]) {
                    this.styleElements[name].disabled = true;
                }
            }

            // Apply theme class ONLY to body, like the old version
            document.body.classList.add(`theme-${themeName}-applied`);

            window.State.activeTheme = themeName;
            window.Settings.update('activeTheme', themeName); // Use Settings.update to handle saving

            // Update Popup UI if visible
            if (window.State.popupElement?.classList.contains('visible') && window.Popup) {
                window.Popup.updateUIState();
            }
        },
        removeActiveTheme() {
            // --- Re-enable this function ---
            if (!window.State.activeTheme) {
                return;
            }
            const currentTheme = window.State.activeTheme;
            this.removeActiveThemeClasses();
            // Disable the theme override stylesheet
            if (this.styleElements[currentTheme]) {
                this.styleElements[currentTheme].disabled = true;
            }
            window.State.activeTheme = null;
            window.Settings.update('activeTheme', null); // Use Settings.update to handle saving
            // Update Popup UI if visible
            if (window.State.popupElement?.classList.contains('visible') && window.Popup) {
                window.Popup.updateUIState();
            }
        },
        removeActiveThemeClasses() {
            // Ensure class is removed ONLY from body if that's where applyTheme adds it
            document.body.classList.remove('theme-dos-applied', 'theme-nature-applied');
        }
    };


    // 6. Define window.UI
    // ui.js
    // UI Control Module

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


    // 7. Define window.Button
    // button.js
    // Provides the floating toggle button for chat visibility and options in AI Studio.

    window.Button = {
        create() {
            if (document.getElementById(window.Config.ids.scriptButton)) {
                window.State.scriptToggleButton = document.getElementById(window.Config.ids.scriptButton);
                this.updateAppearance();
                return;
            }
            // Create the floating button and append to body
            window.State.scriptToggleButton = document.createElement('button');
            window.State.scriptToggleButton.id = window.Config.ids.scriptButton;
            window.State.scriptToggleButton.className = 'mdc-icon-button mat-mdc-icon-button mat-unthemed mat-mdc-button-base gmat-mdc-button advanced-control-button';
            // Remove inline margin/order styles for floating
            window.State.scriptToggleButton.removeAttribute('style');
            const spanRipple = document.createElement('span');
            spanRipple.className = 'mat-mdc-button-persistent-ripple mdc-icon-button__ripple';
            window.State.scriptToggleButton.appendChild(spanRipple);
            const icon = document.createElement('span');
            icon.className = 'material-symbols-outlined notranslate';
            icon.setAttribute('aria-hidden', 'true');
            window.State.scriptToggleButton.appendChild(icon);
            const focusIndicator = document.createElement('span');
            focusIndicator.className = 'mat-focus-indicator';
            window.State.scriptToggleButton.appendChild(focusIndicator);
            const touchTarget = document.createElement('span');
            touchTarget.className = 'mat-mdc-button-touch-target';
            window.State.scriptToggleButton.appendChild(touchTarget);
            window.State.scriptToggleButton.addEventListener('click', window.Popup.toggle);
            document.body.appendChild(window.State.scriptToggleButton);
            this.updateAppearance();
        },
        updateAppearance() {
            if (!window.State.scriptToggleButton) return;
            const iconSpan = window.State.scriptToggleButton.querySelector('.material-symbols-outlined');
            if (iconSpan) {
                iconSpan.textContent = window.State.isCurrentlyHidden ? window.Config.icons.hidden : window.Config.icons.visible;
            }
            const tooltipText = window.State.isCurrentlyHidden ?
                'Chat history hidden (Click for options)' :
                'Chat history visible (Click for options)';
            window.State.scriptToggleButton.setAttribute('aria-label', tooltipText);
            window.State.scriptToggleButton.setAttribute('mattooltip', tooltipText);
            // Reregister command in case text changed
            GM_registerMenuCommand(
                window.State.isCurrentlyHidden ?
                'Show All History (via settings)' :
                'Hide History (via settings)',
                window.Popup.toggle
            );
        }
    };


    // 8. Define window.ElementWatcher
    // watcher.js
    // Watches for DOM and settings changes to update UI and controls in AI Studio.

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
            } catch (error) {}
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
                        disclaimerSpan.textContent = newDisclaimerText;
                    }
                }
            } catch (error) {}
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
                                slider.max = maxExchanges;
                            }
                            let currentValue = parseInt(slider.value);
                            if (currentValue > maxExchanges) {
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


    // 9. Define window.App (ONCE)
    // app.js
    // Main application initialization and control logic for AI Studio Advanced Control Suite.

    window.App = {
        themeManagerInitialized: false,
        customStyleElement: null,
        async init() {
            console.log("Combined App Init Start");
            await window.Settings.load();

            // Inject Custom CSS FIRST
            try {
                const customCSSText = GM_getResourceText('CUSTOM_CSS');
                if (customCSSText) {
                    this.customStyleElement = GM_addStyle(customCSSText);
                    console.log("AC Script: Custom CSS injected.");
                } else { console.error("AC Script: Failed to load CUSTOM_CSS"); }
            } catch (e) { console.error("AC Script: Error injecting custom CSS:", e); }

            // Inject Core Styles
            if(window.Styles) window.Styles.addCoreStyles();

            // Register menu command
            if (window.Popup && typeof window.Popup.toggle === 'function') {
                GM_registerMenuCommand('Adv. Control Settings (AI Studio)', window.Popup.toggle);
            } else { console.warn("Popup.toggle not ready for menu command."); }

            // Initialize Theme Manager & Apply Saved Theme
            if (!this.themeManagerInitialized && window.ThemeManager) {
                 console.log("[App] Initializing ThemeManager...");
                 // Call loadThemes HERE
                 if(typeof window.ThemeManager.loadThemes === 'function') {
                     window.ThemeManager.loadThemes();
                 } else { console.error("ThemeManager.loadThemes missing!");}

                 this.themeManagerInitialized = true;
                 console.log("[App] ThemeManager initialized.");

                 const savedTheme = window.State.settings.activeTheme;
                 if (savedTheme && typeof window.ThemeManager.applyTheme === 'function') {
                     console.log(`[App] Applying saved theme: ${savedTheme}`);
                     try {
                         window.ThemeManager.applyTheme(savedTheme);
                         console.log(`[App] Applied saved theme '${savedTheme}'.`);
                     } catch (error) { console.error(`[App] Error applying saved theme '${savedTheme}':`, error); }
                 }
            } else if(!window.ThemeManager) { console.error("ThemeManager not found during App init"); }


            // Initialize UI parts and watcher
            this.initializeProgressively();
             console.log("Combined App Init End");
        },
        initializeProgressively() {
            console.log("Combined App Init Progressive Start");
             // Call UI methods
             if(window.UI) {
                 window.UI.applyChatVisibilityRules();
                 window.UI.applyLayoutRules();
             } else { console.error("window.UI not found for progressive init"); }

             // Start Watcher
             if (window.ElementWatcher) {
                 window.ElementWatcher.start();
             } else { console.error("window.ElementWatcher not found"); }
             console.log("Combined App Init Progressive End");
        }
    };

    // 10. Button Creation Logic
    function createToggleButton() {
        if (window.Button && typeof window.Button.create === 'function') {
             console.log("Calling Button.create");
            window.Button.create();
        } else { console.error("window.Button.create not found");}
    }

    // 11. Final Initialization Execution (AFTER everything is defined)
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', () => {
             console.log("DOM Loaded - Creating Button & Initializing App");
             createToggleButton(); // Create button first
             if (window.App && window.App.init) window.App.init(); // Then init app
             else console.error("App not ready on DOMContentLoaded");
        });
    } else {
         console.log("DOM Ready - Creating Button & Initializing App");
         createToggleButton(); // Create button first
         if (window.App && window.App.init) window.App.init(); // Then init app
         else console.error("App not ready (DOM already loaded)");
    }

})(); // End of SINGLE main IIFE
