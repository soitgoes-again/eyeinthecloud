// button.js
// Provides the floating toggle button for chat visibility and options in AI Studio.

(function() {
    'use strict';

    // Toggle Button Module
    // ===================================================
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

})();