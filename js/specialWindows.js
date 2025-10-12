// Special windows (Roadmap, Trash desktop icon easter eggs, Timer)

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

    // Timer - handle both desktop icon and dock icon
    const timerIcons = document.querySelectorAll('[data-special="timer"]');
    timerIcons.forEach(icon => {
        icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            createTimerWindow(windowManager);
        });
    });

    // Study Log - handle both desktop icon and dock icon
    const studyLogIcons = document.querySelectorAll('[data-special="study-log"]');
    studyLogIcons.forEach(icon => {
        icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            createStudyLogWindow(windowManager);
        });
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

// Timer state
let timerState = {
    interval: null,
    timeRemaining: 180 * 60, // 3 hours in seconds
    initialTime: 180 * 60,
    isRunning: false,
    sessionStartTime: null,
    sessionName: ''
};

function createTimerWindow(windowManager) {
    const winId = windowManager.createWindow('timer', '⏰ Study Timer', pageContent.timer);
    
    // Get the window element to attach event listeners
    setTimeout(() => {
        initializeTimer(winId);
    }, 100);
}

function initializeTimer(windowId) {
    const timerDisplay = document.getElementById('timer-display');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const statusEl = document.getElementById('timer-status');
    const progressBar = document.getElementById('timer-progress');
    const sessionNameInput = document.getElementById('session-name');
    const downloadLogBtn = document.getElementById('download-log-btn');
    const viewLogBtn = document.getElementById('view-log-btn');
    const presetBtns = document.querySelectorAll('.preset-btn');

    // Preset buttons
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (timerState.isRunning) return; // Don't allow preset change while running
            
            const minutes = parseInt(btn.dataset.minutes);
            timerState.timeRemaining = minutes * 60;
            timerState.initialTime = minutes * 60;
            updateTimerDisplay();
            updateProgressBar();
            statusEl.textContent = 'Ready to focus';
            
            // Update active preset
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Start button
    startBtn.addEventListener('click', () => {
        if (!timerState.isRunning) {
            timerState.isRunning = true;
            timerState.sessionStartTime = new Date();
            timerState.sessionName = sessionNameInput.value.trim() || 'untitled_session';
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            sessionNameInput.disabled = true;
            statusEl.textContent = 'Focus time! 🎯';
            
            timerState.interval = setInterval(() => {
                timerState.timeRemaining--;
                updateTimerDisplay();
                updateProgressBar();
                
                if (timerState.timeRemaining <= 0) {
                    clearInterval(timerState.interval);
                    timerState.isRunning = false;
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                    sessionNameInput.disabled = false;
                    statusEl.textContent = '✨ Session complete! Time for a break.';
                    
                    // Log the session
                    logSession();
                    
                    // Play alarm
                    playAlarm();
                }
            }, 1000);
        }
    });

    // Pause button
    pauseBtn.addEventListener('click', () => {
        if (timerState.isRunning) {
            clearInterval(timerState.interval);
            timerState.isRunning = false;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            sessionNameInput.disabled = false;
            statusEl.textContent = 'Paused';
            
            // Log partial session
            logSession(true);
        }
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        clearInterval(timerState.interval);
        timerState.isRunning = false;
        timerState.timeRemaining = timerState.initialTime;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        sessionNameInput.disabled = false;
        updateTimerDisplay();
        updateProgressBar();
        statusEl.textContent = 'Ready to focus';
    });

    // Download log button
    downloadLogBtn.addEventListener('click', () => {
        downloadStudyLog();
    });

    // View log button
    viewLogBtn.addEventListener('click', () => {
        viewStudyLog();
    });

    function updateTimerDisplay() {
        const hours = Math.floor(timerState.timeRemaining / 3600);
        const minutes = Math.floor((timerState.timeRemaining % 3600) / 60);
        const seconds = timerState.timeRemaining % 60;
        
        timerDisplay.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateProgressBar() {
        const elapsed = timerState.initialTime - timerState.timeRemaining;
        const percentage = (elapsed / timerState.initialTime) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    function playAlarm() {
        // Show browser notification if permission granted
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Study Timer Complete! ⏰", {
                body: "Great work! Time for a break.",
                icon: "AT.png"
            });
        } else if ("Notification" in window && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Study Timer Complete! ⏰", {
                        body: "Great work! Time for a break.",
                        icon: "AT.png"
                    });
                }
            });
        }
        
        // Visual alert
        alert("⏰ Study session complete! Time for a break. 🎉");
    }

    // Initialize display
    updateTimerDisplay();
    updateProgressBar();

    // Helper functions for logging
    function logSession(isPaused = false) {
        const endTime = new Date();
        const timeSpentSeconds = timerState.initialTime - timerState.timeRemaining;
        const timeSpentFormatted = formatTimeSpent(timeSpentSeconds);
        const dateFormatted = timerState.sessionStartTime.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const session = {
            name: timerState.sessionName,
            timeSpent: timeSpentFormatted,
            timeSpentSeconds: timeSpentSeconds,
            date: dateFormatted,
            timestamp: timerState.sessionStartTime.toISOString(),
            completed: !isPaused
        };
        
        // Get existing logs from localStorage
        let logs = [];
        const existingLogs = localStorage.getItem('studyLogs');
        if (existingLogs) {
            logs = JSON.parse(existingLogs);
        }
        
        logs.push(session);
        localStorage.setItem('studyLogs', JSON.stringify(logs));
        
        console.log('Session logged:', session);
    }

    function formatTimeSpent(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    }

    function downloadStudyLog() {
        const logs = localStorage.getItem('studyLogs');
        if (!logs || JSON.parse(logs).length === 0) {
            alert('No study sessions logged yet!');
            return;
        }
        
        const sessions = JSON.parse(logs);
        
        // Create formatted text content
        let content = 'STUDY LOG\n';
        content += '='.repeat(80) + '\n\n';
        content += 'Session Name                    Time Spent          Date\n';
        content += '-'.repeat(80) + '\n';
        
        sessions.forEach(session => {
            const name = session.name.padEnd(30);
            const time = session.timeSpent.padEnd(18);
            const date = session.date;
            content += `${name}  ${time}  ${date}\n`;
        });
        
        content += '\n' + '='.repeat(80) + '\n';
        
        // Calculate total time
        const totalSeconds = sessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0);
        const totalHours = Math.floor(totalSeconds / 3600);
        const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
        content += `Total study time: ${totalHours}h ${totalMinutes}m\n`;
        content += `Total sessions: ${sessions.length}\n`;
        
        // Create and download file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'study_log.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    function viewStudyLog() {
        const logs = localStorage.getItem('studyLogs');
        if (!logs || JSON.parse(logs).length === 0) {
            alert('No study sessions logged yet!');
            return;
        }
        
        const sessions = JSON.parse(logs);
        let content = '<div style="padding: 20px; font-family: monospace; font-size: 13px;">';
        content += '<h2 style="font-family: -apple-system, sans-serif; margin-bottom: 20px;">Study History</h2>';
        content += '<table style="width: 100%; border-collapse: collapse;">';
        content += '<tr style="text-align: left; border-bottom: 2px solid #ddd;"><th style="padding: 8px;">Session</th><th style="padding: 8px;">Time</th><th style="padding: 8px;">Date</th></tr>';
        
        sessions.forEach(session => {
            content += `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${session.name}</td>
                <td style="padding: 8px;">${session.timeSpent}</td>
                <td style="padding: 8px;">${session.date}</td>
            </tr>`;
        });
        
        content += '</table>';
        
        // Calculate total
        const totalSeconds = sessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0);
        const totalHours = Math.floor(totalSeconds / 3600);
        const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
        content += `<p style="margin-top: 20px; font-weight: 600;">Total: ${totalHours}h ${totalMinutes}m (${sessions.length} sessions)</p>`;
        content += '</div>';
        
        // Create a new window with the log
        const logWindow = windowManager.createWindow('study-log', 'Study History', content);
    }
}

// Create standalone Study Log window
function createStudyLogWindow(windowManager) {
    const logs = localStorage.getItem('studyLogs');
    
    if (!logs || JSON.parse(logs).length === 0) {
        const emptyContent = `
            <div style="padding: 40px; text-align: center;">
                <h2>Study Log</h2>
                <p style="color: #666; margin-top: 20px;">No study sessions yet. Start your first session with the Study Timer! ⏰</p>
            </div>
        `;
        windowManager.createWindow('study-log', '📊 Study Log', emptyContent);
        return;
    }
    
    const sessions = JSON.parse(logs);
    let content = '<div style="padding: 20px;">';
    content += '<h1>Study Log</h1>';
    content += '<div style="margin: 20px 0;">';
    content += '<button class="timer-btn secondary" onclick="downloadStudyLogFromWindow()">Download Log</button>';
    content += '</div>';
    content += '<table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: monospace;">';
    content += '<tr style="text-align: left; border-bottom: 2px solid #ddd;"><th style="padding: 8px;">Session Name</th><th style="padding: 8px;">Time Spent</th><th style="padding: 8px;">Date</th><th style="padding: 8px;">Status</th></tr>';
    
    sessions.forEach(session => {
        const status = session.completed ? '✓ Complete' : '⏸ Paused';
        const statusColor = session.completed ? '#4CAF50' : '#FF9800';
        content += `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px;">${session.name}</td>
            <td style="padding: 8px;">${session.timeSpent}</td>
            <td style="padding: 8px;">${session.date}</td>
            <td style="padding: 8px; color: ${statusColor}; font-weight: 600;">${status}</td>
        </tr>`;
    });
    
    content += '</table>';
    
    // Calculate stats
    const totalSeconds = sessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const completedSessions = sessions.filter(s => s.completed).length;
    
    content += '<div style="margin-top: 30px; padding: 20px; background: rgba(0,0,0,0.02); border-radius: 8px;">';
    content += '<h3 style="margin-top: 0;">Statistics</h3>';
    content += `<p><strong>Total Study Time:</strong> ${totalHours}h ${totalMinutes}m</p>`;
    content += `<p><strong>Total Sessions:</strong> ${sessions.length}</p>`;
    content += `<p><strong>Completed Sessions:</strong> ${completedSessions}</p>`;
    content += `<p><strong>Average Session:</strong> ${Math.round(totalSeconds / sessions.length / 60)}m</p>`;
    content += '</div>';
    content += '</div>';
    
    windowManager.createWindow('study-log', '📊 Study Log', content);
}

// Global function to download log from the Study Log window
function downloadStudyLogFromWindow() {
    const logs = localStorage.getItem('studyLogs');
    if (!logs || JSON.parse(logs).length === 0) {
        alert('No study sessions logged yet!');
        return;
    }
    
    const sessions = JSON.parse(logs);
    
    // Create formatted text content
    let content = 'STUDY LOG\n';
    content += '='.repeat(80) + '\n\n';
    content += 'Session Name                    Time Spent          Date\n';
    content += '-'.repeat(80) + '\n';
    
    sessions.forEach(session => {
        const name = session.name.padEnd(30);
        const time = session.timeSpent.padEnd(18);
        const date = session.date;
        content += `${name}  ${time}  ${date}\n`;
    });
    
    content += '\n' + '='.repeat(80) + '\n';
    
    // Calculate total time
    const totalSeconds = sessions.reduce((sum, s) => sum + s.timeSpentSeconds, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    content += `Total study time: ${totalHours}h ${totalMinutes}m\n`;
    content += `Total sessions: ${sessions.length}\n`;
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study_log.txt';
    a.click();
    URL.revokeObjectURL(url);
}

