// Special windows (Roadmap, Trash desktop icon easter eggs)

function initializeSpecialWindows(windowManager) {
    // Roadmap
    document.querySelector('.roadmap-icon').addEventListener('dblclick', (e) => {
        e.preventDefault();
        createRoadmapWindow(windowManager);
    });

    // Trash desktop icon
    document.querySelector('.trash-icon').addEventListener('dblclick', (e) => {
        e.preventDefault();
        createTrashWindow(windowManager);
    });
}

function createRoadmapWindow(windowManager) {
    windowManager.createWindow('roadmap', 'Roadmap', `
        <div style="padding: 20px;">
            <svg width="100%" height="340" viewBox="0 0 700 340" style="transform: scale(1.2); transform-origin: center center;">
                <!-- Path line -->
                <path d="M 80 280 L 160 220 L 240 160 L 320 100 L 420 80 L 520 80 L 620 80" 
                      stroke="#1a1a1a" 
                      stroke-width="2" 
                      stroke-dasharray="5,5" 
                      fill="none" 
                      opacity="0.3"/>
                
                <!-- BlackBerry -->
                <circle cx="80" cy="280" r="20" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
                <text x="80" y="310" text-anchor="middle" font-weight="500" font-size="13" fill="#1a1a1a">BlackBerry</text>
                <text x="80" y="325" text-anchor="middle" font-size="11" fill="#888">2023</text>
                
                <!-- Ford -->
                <circle cx="160" cy="220" r="20" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
                <text x="160" y="250" text-anchor="middle" font-weight="500" font-size="13" fill="#1a1a1a">Ford</text>
                <text x="160" y="265" text-anchor="middle" font-size="11" fill="#888">2024</text>
                
                <!-- Tesla -->
                <circle cx="240" cy="160" r="20" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
                <text x="240" y="190" text-anchor="middle" font-weight="500" font-size="13" fill="#1a1a1a">Tesla</text>
                <text x="240" y="205" text-anchor="middle" font-size="11" fill="#888">2024</text>
                
                <!-- Modular -->
                <circle cx="320" cy="100" r="20" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
                <text x="320" y="130" text-anchor="middle" font-weight="500" font-size="13" fill="#1a1a1a">Modular</text>
                <text x="320" y="145" text-anchor="middle" font-size="11" fill="#888">2025</text>
                
                <!-- Mystery 1 -->
                <circle cx="420" cy="80" r="20" fill="#e0e0e0" stroke="#999" stroke-width="2"/>
                <text x="420" y="87" text-anchor="middle" fill="#666" font-weight="bold" font-size="18">?</text>
                <text x="420" y="110" text-anchor="middle" font-weight="500" font-size="13" fill="#888">???</text>
                
                <!-- Mystery 2 -->
                <circle cx="520" cy="80" r="20" fill="#e0e0e0" stroke="#999" stroke-width="2"/>
                <text x="520" y="87" text-anchor="middle" fill="#666" font-weight="bold" font-size="18">?</text>
                <text x="520" y="110" text-anchor="middle" font-weight="500" font-size="13" fill="#888">???</text>
                
                <!-- World Domination -->
                <g transform="translate(620, 80)">
                    <line x1="-12" y1="-12" x2="12" y2="12" stroke="#D32F2F" stroke-width="4" stroke-linecap="round"/>
                    <line x1="12" y1="-12" x2="-12" y2="12" stroke="#D32F2F" stroke-width="4" stroke-linecap="round"/>
                    <circle cx="0" cy="0" r="18" fill="none" stroke="#D32F2F" stroke-width="2"/>
                </g>
                <text x="620" y="110" text-anchor="middle" font-weight="600" font-size="13" fill="#D32F2F">World Domination</text>
            </svg>
        </div>
    `);
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

