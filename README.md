# Eye in the Cloud - A Google AI Studio Focused Experience

This userscript adds some much-needed controls and tweaks to Google's AI Studio.

Installs like any other userscript via Tampermonkey/Violentmonkey etc. Find the raw `.user.js` file link for your manager.

## What it Does:

*   **Hides UI Clutter:** Use toggles in the popup to hide the Sidebars, Header, Toolbar, Prompt Chips, and Feedback buttons. Get them out of the way.
*   **Chat History Modes:**
    *   **VIBE Mode:** One click hides *everything* except the latest chat turn and the input box. Focus mode. Click again to restore your previous hide/history settings.
    *   **Limit History:** Show all history, or just the last few exchanges using a slider.
*   **Themes:** Switches the look. Comes with:
    *   **DOS:** Green on black, Courier New font. Uses variable overrides.
    *   **Nature:** Light theme, white/light grey, green accents. Uses direct CSS overrides.
    *   Your chosen theme is saved and reapplies on refresh.
*   **Input Lag Fix:** Adds a button near the main input box. Click it to open a bigger, separate text area for typing long prompts without the usual lag. Has "Add to Input" and "Send" buttons. Text stays in the modal if you close it before sending.
*   **Settings Popup:**
    *   Access via the floating button (eye icon) near the top or the script manager's menu command.
    *   Lets you control all the features above.
    *   Popup title is clickable/editable.
*   **Settings Persistence:** Your hide toggles, history limit, chosen theme, and custom title are saved. VIBE mode is temporary and resets on refresh.

## How to Use:

1.  Install it via your script manager.
2.  Go to AI Studio.
3.  Look for the floating eye button or use the script manager menu command to open the settings popup.
4.  Toggle stuff on/off.

## Notes:

*   Theming AI Studio is tricky. The DOS theme uses CSS variable overrides, the Nature theme uses direct element styling with `!important`. Updates to AI Studio might break parts of the themes (especially Nature).
*   The Input Lag Fix button should only show up once you have some chat history (it hides in the initial empty state).

That's basically it. Should make using AI Studio a bit less annoying.
