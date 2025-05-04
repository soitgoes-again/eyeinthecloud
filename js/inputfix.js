// inputfix.js
// Provides a modal to fix input lag and manage advanced input in AI Studio.

(function() {
    'use strict';

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

     // Attempt initial setup if input area might already exist
     if (document.readyState === 'complete' || document.readyState === 'interactive') {
         window.InputLagFix.init();
     } else {
         window.addEventListener('DOMContentLoaded', () => window.InputLagFix.init());
     }

})();
