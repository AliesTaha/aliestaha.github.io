// Dock app launcher
(function() {
    const apps = {
        notion: {
            url: 'https://notion.so',
            name: 'Notion'
        },
        'notion-calendar': {
            url: 'https://calendar.notion.so',
            name: 'Notion Calendar'
        },
        perplexity: {
            url: 'https://perplexity.ai',
            name: 'Perplexity'
        },
        claude: {
            url: 'https://claude.ai',
            name: 'Claude'
        },
        terminal: {
            action: 'terminal',
            name: 'Terminal'
        }
    };

    document.querySelectorAll('.dock-app').forEach(function(app) {
        app.addEventListener('click', function() {
            const appName = this.getAttribute('data-app');
            const appConfig = apps[appName];

            if (!appConfig) return;

            if (appConfig.url) {
                window.open(appConfig.url, '_blank');
            } else if (appConfig.action === 'terminal') {
                // Open interactive terminal window
                if (window.windowManager && typeof initTerminal === 'function') {
                    const terminalContent = `
                        <div class="terminal-container" style="font-family: 'SF Mono', Monaco, monospace; background: #1e1e1e; color: #c8c0b4; padding: 16px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
                            <div class="terminal-output" id="terminal-output-window" style="flex: 1; overflow-y: auto; margin-bottom: 8px; line-height: 1.6; display: flex; flex-direction: column;"></div>
                            <div style="display: flex; align-items: center;">
                                <span id="terminal-prompt-window" style="color: #a89880; white-space: nowrap; user-select: none;">ali@desktop ~ $ </span>
                                <input type="text" id="terminal-input-window" spellcheck="false" autocomplete="off" style="flex: 1; background: none; border: none; color: #c8c0b4; font-family: inherit; font-size: inherit; outline: none; caret-color: #a89880; margin-left: 4px;" autofocus>
                            </div>
                        </div>
                    `;
                    const win = window.windowManager.createWindow('terminal-interactive', 'Terminal', terminalContent);
                    // Initialize terminal after window is created
                    setTimeout(function() {
                        initTerminal(window.windowManager);
                        // Auto-scroll to bottom
                        const output = document.getElementById('terminal-output-window');
                        if (output) {
                            output.scrollTop = output.scrollHeight;
                        }
                    }, 100);
                }
            }
        });
    });
})();
