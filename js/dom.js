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
