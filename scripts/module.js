import { createMovableCountdownsClass } from './MovableCountdowns.js';

const MODULE_ID = 'dh-countdownsplus';
let MovableCountdowns;

Hooks.once('init', () => {
    console.log(`${MODULE_ID} | Initializing Daggerheart Countdowns Plus`);

    // Register settings or other init logic if needed
});

Hooks.on('ready', () => {
    // Ensure the system's countdown class exists
    if (!CONFIG.ui.countdowns) {
        console.error(`${MODULE_ID} | CONFIG.ui.countdowns not found. Is Daggerheart system initialized?`);
        return;
    }

    // Create our class extending the system's class
    MovableCountdowns = createMovableCountdownsClass(CONFIG.ui.countdowns);

    // Initial check to see if we should inject button
    hookSystemCountdowns();
});

function hookSystemCountdowns() {
    // We want to hook into the render of the system's countdown app.
    // The system app is likely a singleton at ui.countdowns.

    // Hook on renderDhCountdowns (name of the class in system is DhCountdowns)
    Hooks.on('renderDhCountdowns', (app, html, data) => {
        // Only inject if this is the SYSTEM one, not our movable one (ours inherits, so it might trigger this hook too?)
        // DhCountdowns extends ApplicationV2. AppV2 emits 'renderApplicationV2' and 'renderMyClass'.
        // So 'renderDhCountdowns' will fire for both.

        if (app instanceof MovableCountdowns) return;

        // Find the header to inject button
        // html is the HTMLElement in AppV2 hooks
        const header = html.querySelector('.window-header');
        if (!header) return;

        // Check if button already exists
        if (header.querySelector('[data-action="detach-countdowns"]')) return;

        // Create Detach Button
        const detachTooltip = "Detach"; // TODO: Localize
        const detachBtn = document.createElement('a'); // System uses <a> for header controls
        detachBtn.className = 'header-control';
        detachBtn.dataset.tooltip = detachTooltip;
        detachBtn.dataset.action = 'detach-countdowns';
        detachBtn.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i>';

        // Add listener
        detachBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            // Open Movable
            // We assume singleton pattern for movable too
            let movable = Object.values(ui.windows).find(w => w instanceof MovableCountdowns);
            if (!movable) {
                movable = new MovableCountdowns();
            }
            await movable.render({ force: true });

            // Close/Hide System App
            // Suppress future renders
            if (app) {
                app._suppressed = true;
                await app.close();
            }
        });

        // Insert before the "Close" button? System one doesn't have close button.
        // Insert at end or specific position?
        // System header controls: Edit, Toggle Mode.
        // Let's prepend or append.
        header.insertAdjacentElement('beforeend', detachBtn);
    });

    // Patch system render to respect suppression
    if (ui.countdowns && !ui.countdowns._patched) {
        const originalRender = ui.countdowns.render.bind(ui.countdowns);
        ui.countdowns.render = function (options, ...args) {
            if (this._suppressed) {
                // Update internal state but don't show
                // If data update, we might need to update OUR instance?
                // But socket hooks call render() on ui.countdowns.
                // We should notify Movable if it's open.

                const movable = Object.values(ui.windows).find(w => w instanceof MovableCountdowns);
                if (movable) movable.render();

                return this;
            }
            return originalRender(options, ...args);
        };
        ui.countdowns._patched = true;
    }
}
