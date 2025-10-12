// Main initialization and global event listeners

// Initialize window manager
const windowManager = new WindowManager();

// Initialize clock
initializeClock();

// Initialize study log with sample data (first time only)
initializeStudyLog();

// Initialize all handlers
initializeIconHandlers(windowManager);
initializeDockHandlers(windowManager);
initializeSpecialWindows(windowManager);

// Global mouse event listeners for window dragging and resizing
document.addEventListener('mousemove', (e) => {
    windowManager.handleDragging(e);
    windowManager.handleResizing(e);
});

document.addEventListener('mouseup', () => {
    windowManager.stopDragging();
    windowManager.stopResizing();
});

// Initialize study log with sample data
function initializeStudyLog() {
    const existingLogs = localStorage.getItem('studyLogs');
    
    // Only add sample data if there are no existing logs
    if (!existingLogs) {
        const sampleSession = {
            name: 'networks_session',
            timeSpent: '3h 0m',
            timeSpentSeconds: 10800, // 3 hours in seconds
            date: 'Oct 11, 2025',
            timestamp: new Date('2025-10-11T14:00:00').toISOString(),
            completed: true
        };
        
        localStorage.setItem('studyLogs', JSON.stringify([sampleSession]));
        console.log('Study log initialized with sample data');
    }
}

