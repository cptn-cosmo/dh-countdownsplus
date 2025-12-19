/**
 * Creates the MovableCountdowns class extending the provided base class.
 * @param {class} BaseCountdowns The DhCountdowns class from Daggerheart system.
 * @returns {class} The MovableCountdowns class.
 */
export function createMovableCountdownsClass(BaseCountdowns) {
    return class MovableCountdowns extends BaseCountdowns {
        constructor(options = {}) {
            super(options);
        }

        /** @inheritDoc */
        static DEFAULT_OPTIONS = {
            id: 'movable-countdowns',
            tag: 'div', // AppV2
            classes: ['daggerheart', 'dh-style', 'countdowns', 'movable-countdowns'],
            window: {
                icon: 'fa-solid fa-clock-rotate-left',
                frame: true,
                title: 'DAGGERHEART.UI.Countdowns.title',
                positioned: true,
                resizable: true,
                minimizable: true
            },
            actions: {
                // Override toggleViewMode to instance method
                toggleViewMode: MovableCountdowns.prototype._toggleViewMode,

                // Inherited static actions
                editCountdowns: BaseCountdowns.DEFAULT_OPTIONS.actions.editCountdowns,
                loopCountdown: BaseCountdowns.DEFAULT_OPTIONS.actions.loopCountdown,
                decreaseCountdown: BaseCountdowns.DEFAULT_OPTIONS.actions.decreaseCountdown,
                increaseCountdown: BaseCountdowns.DEFAULT_OPTIONS.actions.increaseCountdown,

                reattach: MovableCountdowns.reattach
            },
            position: {
                width: 320,
                height: 'auto',
                top: 100,
                left: 100
            }
        };

        /** @override */
        static PARTS = {
            resources: {
                root: true,
                template: 'systems/daggerheart/templates/ui/countdowns.hbs'
            }
        };

        get element() {
            return document.getElementById(this.id);
        }

        /**
         * Re-implementation of toggleViewMode that works on this instance.
         */
        async _toggleViewMode() {
            // Need access to system CONFIG constants.
            // CONFIG.DH is global.
            const currentMode = game.user.getFlag(CONFIG.DH.id, CONFIG.DH.FLAGS.userFlags.countdownMode);
            const appMode = CONFIG.DH.GENERAL.countdownAppMode;
            const newMode = currentMode === appMode.textIcon ? appMode.iconOnly : appMode.textIcon;

            await game.user.setFlag(CONFIG.DH.id, CONFIG.DH.FLAGS.userFlags.countdownMode, newMode);

            // Update this instance directly
            if (newMode === appMode.iconOnly) this.element.classList.add('icon-only');
            else this.element.classList.remove('icon-only');

            this.render();

            // Note: System tracker won't update automatically here if it's hidden, 
            // but next time it renders it will check flag.
        }

        /** @inheritDoc */
        async _renderFrame(options) {
            const frame = await super._renderFrame(options);

            const header = frame.querySelector('.window-header');
            if (!header) return frame;

            // Re-add Close Button if missing
            // dh-countdownsplus: Fix invisible close button by using <a> tag pattern like system
            if (!header.querySelector('[data-action="close"]')) {
                const closeTitle = game.i18n.localize("CLOSE");
                // Use <a> with <i> child to match system header control styling
                const closeBtn = document.createElement('a');
                closeBtn.className = 'header-control';
                closeBtn.setAttribute('data-action', 'close');
                closeBtn.setAttribute('data-tooltip', closeTitle);
                closeBtn.setAttribute('aria-label', closeTitle);

                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-xmark';
                closeBtn.appendChild(icon);

                header.appendChild(closeBtn);
            }

            return frame;
        }

        /** @override */
        async _onRender(context, options) {
            // Call super to handle template rendering
            await super._onRender(context, options);

            // Workaround system pinning: Move back to body if pinned
            if (this.element && this.element.parentElement && this.element.parentElement.id === 'ui-right-column-1') {
                document.body.appendChild(this.element);
            }

            // Ensure visibility
            this.element.hidden = false;

            // Add detached class to body for CSS blocking of system tracker
            document.body.classList.add('dh-countdowns-detached');
        }

        static async reattach() {
            const movableApp = Object.values(ui.windows).find(w => w instanceof MovableCountdowns);
            if (movableApp) await movableApp.close();

            // Unsuppress system tracker
            if (ui.countdowns) {
                ui.countdowns._suppressed = false;
                await ui.countdowns.render({ force: true });
            }
        }

        /** @override */
        async close(options = {}) {
            await super.close(options);

            // Remove detached class from body
            document.body.classList.remove('dh-countdowns-detached');

            // Re-attach on close
            if (ui.countdowns) {
                ui.countdowns._suppressed = false;
                await ui.countdowns.render({ force: true });
            }
        }
    };
}
