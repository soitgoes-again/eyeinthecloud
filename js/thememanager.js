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

// Ensure theme resource mapping is set on load
window.ThemeManager.loadThemes();
