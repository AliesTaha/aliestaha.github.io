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
        <div class="roadmap-timeline">
            <div class="roadmap-entry">
                <div class="roadmap-date">2023</div>
                <div class="roadmap-dot"></div>
                <div class="roadmap-details">
                    <div class="roadmap-company">BlackBerry QNX</div>
                    <div class="roadmap-role">embedded systems</div>
                </div>
            </div>
            <div class="roadmap-entry">
                <div class="roadmap-date">2024</div>
                <div class="roadmap-dot"></div>
                <div class="roadmap-details">
                    <div class="roadmap-company">Ford Motor Co.</div>
                    <div class="roadmap-role">vehicle software platform</div>
                </div>
            </div>
            <div class="roadmap-entry">
                <div class="roadmap-date">2024</div>
                <div class="roadmap-dot"></div>
                <div class="roadmap-details">
                    <div class="roadmap-company">Tesla</div>
                    <div class="roadmap-role">computer vision</div>
                </div>
            </div>
            <div class="roadmap-entry">
                <div class="roadmap-date">2025</div>
                <div class="roadmap-dot"></div>
                <div class="roadmap-details">
                    <div class="roadmap-company">Modular</div>
                    <div class="roadmap-role">mojo compiler performance</div>
                </div>
            </div>
            <div class="roadmap-entry roadmap-current">
                <div class="roadmap-date">2026</div>
                <div class="roadmap-dot"></div>
                <div class="roadmap-details">
                    <div class="roadmap-company">BaseTen</div>
                    <div class="roadmap-role">gpu inference infrastructure</div>
                </div>
            </div>
            <div class="roadmap-entry roadmap-future">
                <div class="roadmap-date">???</div>
                <div class="roadmap-dot"></div>
                <div class="roadmap-details">
                    <div class="roadmap-company">tbd</div>
                    <div class="roadmap-role">something meaningful</div>
                </div>
            </div>
            <div class="roadmap-entry roadmap-future roadmap-end">
                <div class="roadmap-date"></div>
                <div class="roadmap-dot"></div>
                <div class="roadmap-details">
                    <div class="roadmap-company" style="text-decoration: line-through; color: #ccc;">world domination</div>
                </div>
            </div>
        </div>
    `);
}

function createTrashWindow(windowManager) {
    const fileIcon = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M6 4h12l8 8v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4z" fill="#f5f0eb" stroke="#b0a090" stroke-width="1.2"/><path d="M18 4v8h8" fill="#e8e0d8" stroke="#b0a090" stroke-width="1.2"/><line x1="10" y1="16" x2="22" y2="16" stroke="#c0b0a0" stroke-width="0.8"/><line x1="10" y1="20" x2="22" y2="20" stroke="#c0b0a0" stroke-width="0.8"/><line x1="10" y1="24" x2="17" y2="24" stroke="#c0b0a0" stroke-width="0.8"/></svg>`;
    const videoIcon = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="24" height="20" rx="2" fill="#f5f0eb" stroke="#b0a090" stroke-width="1.2"/><polygon points="13,12 13,22 22,17" fill="#b0a090"/></svg>`;

    windowManager.createWindow('trash', 'Trash', `
        <h1>Trash</h1>
        <p style="color: #666; margin-bottom: 30px;">3 items</p>
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <div class="trash-file" onclick="openTrashManifesto('top_secret')" style="cursor: pointer; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 8px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
                ${fileIcon}
                <div>
                    <div style="font-weight: 500;">TOP_SECRET.txt</div>
                    <div style="font-size: 14px; color: #888;">Very classified stuff</div>
                </div>
            </div>
            <div class="trash-file" onclick="openTrashManifesto('nda')" style="cursor: pointer; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 8px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
                ${fileIcon}
                <div>
                    <div style="font-weight: 500;">NDA.txt</div>
                    <div style="font-size: 14px; color: #888;">Don't look at this</div>
                </div>
            </div>
            <div class="trash-file" onclick="window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')" style="cursor: pointer; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 8px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
                ${videoIcon}
                <div>
                    <div style="font-weight: 500;">spicy.mov</div>
                    <div style="font-size: 14px; color: #888;">Handle with care</div>
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

function openTrashManifesto(type) {
    const wm = window.windowManager;
    if (!wm) return;

    if (type === 'top_secret') {
        wm.createWindow('top-secret', 'TOP_SECRET.txt', `
            <div style="padding: 20px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.8;">
                <p style="color: red; font-weight: bold; text-align: center; font-size: 16px;">--- CLASSIFIED: EYES ONLY ---</p>
                <br>
                <p>TO: Whoever is reading this</p>
                <p>FROM: Ali Taha, Chief Performance Officer</p>
                <p>RE: The Truth About Software Engineering</p>
                <br>
                <p>After years of classified research, I can confirm the following:</p>
                <br>
                <p>1. Nobody actually understands DNS. We all just pretend.</p>
                <br>
                <p>2. Every senior engineer's debugging process is just adding print statements with increasing desperation.</p>
                <br>
                <p>3. The cloud is literally just someone else's computer that costs 400% more.</p>
                <br>
                <p>4. 90% of all Jira tickets could be replaced with the sentence "make it work better."</p>
                <br>
                <p>5. The person who wrote the legacy code you're cursing at is almost certainly you, 6 months ago.</p>
                <br>
                <p>6. "It works on my machine" is technically a valid deployment strategy if your machine IS the server.</p>
                <br>
                <p>7. Stack Overflow is down? Guess the entire industry is taking the day off.</p>
                <br>
                <p style="color: red; text-align: center;">--- END TRANSMISSION ---</p>
                <p style="color: #aaa; text-align: center; font-size: 11px;">This document will self-destruct never because I put it in the trash instead.</p>
            </div>
        `);
    } else if (type === 'nda') {
        wm.createWindow('nda', 'NDA.txt', `
            <div style="padding: 20px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.8;">
                <p style="text-align: center; font-weight: bold; font-size: 16px; text-decoration: underline;">NON-DISCLOSURE AGREEMENT</p>
                <br>
                <p>By opening this file, YOU ("the Snooper") hereby agree to the following terms:</p>
                <br>
                <p><strong>Section 1: Acknowledgment</strong></p>
                <p>The Snooper acknowledges that they were explicitly told "Don't look at this" and chose to look anyway. This makes them a rebel, which is honestly kind of cool.</p>
                <br>
                <p><strong>Section 2: Confidential Information</strong></p>
                <p>The Snooper shall not disclose the following trade secrets:</p>
                <p style="padding-left: 20px;">a) Ali's actual daily routine is 70% staring at profiler output and 30% questioning life choices.</p>
                <p style="padding-left: 20px;">b) The matmul kernel that "beat cuBLAS" was achieved through a blood pact with the GPU gods. No further questions.</p>
                <p style="padding-left: 20px;">c) This entire website was built to avoid doing actual work.</p>
                <br>
                <p><strong>Section 3: Penalties</strong></p>
                <p>Violation of this NDA will result in:</p>
                <p style="padding-left: 20px;">- A mass email to your company Slack saying you read files from people's trash cans</p>
                <p style="padding-left: 20px;">- Being forced to explain what a "tensor core" is to your non-technical relatives at Thanksgiving</p>
                <p style="padding-left: 20px;">- 500 hours of mandatory CUDA debugging with no printf allowed</p>
                <br>
                <p style="text-align: center;">Signed,</p>
                <p style="text-align: center; font-style: italic;">Ali Taha, Esq. (not a real lawyer)</p>
                <p style="text-align: center; color: #aaa; font-size: 11px;">This NDA is legally binding in zero jurisdictions.</p>
            </div>
        `);
    }
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

