// styles.js
// Minimal core CSS logic for AI Studio Advanced Control Suite. All main styles are in custom.css.

window.coreStyles = `
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
`;

// No longer inject any popup styles from here - custom.css handles everything
window.popupStyles = function(Config) {
    // Return empty string - all styling comes from custom.css now
    return '';
};
