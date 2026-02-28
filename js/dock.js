// Dock app launcher
(function() {
    const apps = {
        notion: {
            url: 'https://notion.so',
            name: 'Notion'
        },
        comet: {
            url: 'https://comet.com',
            name: 'Comet'
        },
        calendar: {
            url: 'https://calendar.google.com',
            name: 'Calendar'
        },
        anthropic: {
            url: 'https://claude.ai',
            name: 'Claude'
        },
        terminal: {
            action: 'terminal',
            name: 'Terminal'
        },
        stats: {
            action: 'timer',
            name: 'Stats'
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
                // Open terminal window
                if (window.windowManager) {
                    const terminalContent = `
                        <div style="font-family: 'SF Mono', Monaco, monospace; padding: 20px; background: #1e1e1e; color: #c8c0b4; border-radius: 8px;">
                            <div style="margin-bottom: 12px;">
                                <span style="color: #a89880;">ali@desktop</span>:<span style="color: #8fad86;">~</span>$ <span style="color: #c4a87a;">whoami</span>
                            </div>
                            <div style="margin-bottom: 12px;">ali</div>
                            <div style="margin-bottom: 12px;">
                                <span style="color: #a89880;">ali@desktop</span>:<span style="color: #8fad86;">~</span>$ <span style="color: #c4a87a;">cat about.txt</span>
                            </div>
                            <div style="margin-bottom: 12px;">performance engineer @ uwaterloo<br>building fast kernels on gpus</div>
                            <div style="margin-bottom: 12px;">
                                <span style="color: #a89880;">ali@desktop</span>:<span style="color: #8fad86;">~</span>$ <span style="color: #c4a87a;">ls -la</span>
                            </div>
                            <div style="line-height: 1.6;">
                                <div>drwxr-xr-x  blog/</div>
                                <div>-rw-r--r--  experience</div>
                                <div>-rw-r--r--  contact</div>
                                <div>-rw-r--r--  books</div>
                                <div>-rw-r--r--  roadmap</div>
                                <div>drwx------  .trash/</div>
                            </div>
                            <div style="margin-top: 12px;">
                                <span style="color: #a89880;">ali@desktop</span>:<span style="color: #8fad86;">~</span>$ <span class="terminal-cursor" style="background: #a89880; animation: blink 1s step-end infinite;">█</span>
                            </div>
                        </div>
                        <style>
                            @keyframes blink {
                                0%, 50% { opacity: 1; }
                                51%, 100% { opacity: 0; }
                            }
                        </style>
                    `;
                    window.windowManager.createWindow('terminal-demo', 'Terminal', terminalContent);
                }
            } else if (appConfig.action === 'timer') {
                // Open timer/stats window
                if (window.windowManager && window.pageContent && window.pageContent.timer) {
                    window.windowManager.createWindow('timer', 'Stats', window.pageContent.timer);
                }
            }
        });
    });
})();
