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

    // Patch system render to respect suppression
    // We do this inside the hook to ensure ui.countdowns (the instance) exists and is accessible.
    // Also, we can access 'app' directly.
    const patchSystemTracker = (tracker) => {
        if (tracker._patched) return;

        const originalRender = tracker.render.bind(tracker);
        tracker.render = function (options, ...args) {
            if (this._suppressed) {
                // Update internal state but don't show
                // If data update, we might need to update OUR instance?
                // Socket updates usually just call render() on ui.countdowns.
                // We should notify Movable if it's open.

                const movable = Object.values(ui.windows).find(w => w instanceof MovableCountdowns);
                if (movable) movable.render();

                // Return this to maintain chainability if system expects it
                return this;
            }
            return originalRender(options, ...args);
        };
        tracker._patched = true;
        console.log(`${MODULE_ID} | Patched system countdowns render method.`);
    };

    // Hook on renderDhCountdowns (name of the class in system is DhCountdowns)
    Hooks.on('renderDhCountdowns', (app, html, data) => {
        // Only inject if this is the SYSTEM one
        if (app instanceof MovableCountdowns) return;

        // Ensure we patched the system tracker (app is likely ui.countdowns)
        patchSystemTracker(app);

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

        // Insert before the last item or specific location?
        // System controls usually right aligned. 'beforeend' puts it last.
        header.insertAdjacentElement('beforeend', detachBtn);
    });
}
