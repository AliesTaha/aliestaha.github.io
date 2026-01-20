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

// Deep linking - open window from URL path or hash
function openWindowById(windowId) {
    if (windowId && pageContent[windowId]) {
        // Find the label from the desktop icon or use the windowId as title
        const icon = document.querySelector(`.desktop-icon[data-window="${windowId}"]`);
        const label = icon ? icon.querySelector('.icon-label').textContent : windowId;
        windowManager.createWindow(windowId, label, pageContent[windowId]);
        return true;
    }
    return false;
}

function handleDeepLink() {
    // First, check for redirect from 404.html (clean URL like /philosophy)
    const redirectPath = sessionStorage.getItem('redirect_path');
    if (redirectPath) {
        sessionStorage.removeItem('redirect_path');
        if (openWindowById(redirectPath)) {
            return;
        }
    }
    
    // Fallback: check URL hash (like #philosophy)
    const hash = window.location.hash.slice(1);
    openWindowById(hash);
}

// Handle initial page load
handleDeepLink();

// Handle hash changes (browser back/forward or manual URL change)
window.addEventListener('hashchange', handleDeepLink);

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

