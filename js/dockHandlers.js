// Dock interactions

function initializeDockHandlers(windowManager) {
    // Regular dock items
    document.querySelectorAll('.dock-item').forEach(item => {
        item.addEventListener('click', () => {
            const windowId = item.dataset.window;
            if (windowId && pageContent[windowId]) {
                const title = item.getAttribute('title');
                windowManager.createWindow(windowId, title, pageContent[windowId]);
            }
        });
    });

    // Trash in dock
    document.querySelector('.trash-dock-icon').addEventListener('click', (e) => {
        e.preventDefault();
        createTrashWindow(windowManager);
    });
}

function createTrashWindow(windowManager) {
    windowManager.createWindow('trash', '🗑️ Trash', `
        <h1>Trash</h1>
        <p style="color: #666; margin-bottom: 30px;">3 items</p>
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <div class="trash-file" onclick="window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')" style="cursor: pointer; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 8px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
                <span style="font-size: 32px;">📄</span>
                <div>
                    <div style="font-weight: 500;">TOP_SECRET.txt</div>
                    <div style="font-size: 14px; color: #888;">Very classified stuff</div>
                </div>
            </div>
            <div class="trash-file" onclick="window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')" style="cursor: pointer; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 8px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
                <span style="font-size: 32px;">📋</span>
                <div>
                    <div style="font-weight: 500;">NDA.txt</div>
                    <div style="font-size: 14px; color: #888;">Don't look at this</div>
                </div>
            </div>
            <div class="trash-file" onclick="window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')" style="cursor: pointer; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 8px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
                <span style="font-size: 32px;">🎬</span>
                <div>
                    <div style="font-weight: 500;">spicy.mov</div>
                    <div style="font-size: 14px; color: #888;">🌶️ Handle with care</div>
                </div>
            </div>
        </div>
        <style>
            .trash-file:hover {
                background: rgba(0,0,0,0.06) !important;
            }
        </style>
    `);
}

