// Main initialization and global event listeners

// Initialize window manager
const windowManager = new WindowManager();

// Initialize clock
initializeClock();

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

