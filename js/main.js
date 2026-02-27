// Main initialization and global event listeners

// Initialize window manager
const windowManager = new WindowManager();
window.windowManager = windowManager;

// Initialize clock
initializeClock();

// Initialize study log with sample data (first time only)
initializeStudyLog();

// Initialize Game of Life background
initGameOfLife('game-of-life');

// Initialize words of wisdom
initWisdom();

// Initialize all handlers
initializeIconHandlers(windowManager);
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

// Hide explore hint on first window open
const originalCreateWindow = windowManager.createWindow.bind(windowManager);
windowManager.createWindow = function(...args) {
    const hint = document.getElementById('explore-hint');
    if (hint && !hint.classList.contains('hidden')) {
        hint.classList.add('hidden');
    }
    return originalCreateWindow(...args);
};

// Global mouse event listeners for window dragging and resizing
document.addEventListener('mousemove', (e) => {
    windowManager.handleDragging(e);
    windowManager.handleResizing(e);
});

document.addEventListener('mouseup', () => {
    windowManager.stopDragging();
    windowManager.stopResizing();
});

// Words of wisdom from principles
function initWisdom() {
    const overlay = document.getElementById('wisdom-overlay');
    if (!overlay) return;

    const principles = [
        { category: 'CRAFT', items: ['write more', 'do great work', 'learn to code', 'take something seriously', 'let it consume you', 'iterate violently', 'execute', 'act fast'] },
        { category: 'MIND', items: ['read essays', 'read old books', 'read ancient scripts', 'read poetry', 'journal', 'sit alone', 'follow your intuition', 'plan for 15 minutes'] },
        { category: 'PRESENCE', items: ['act sincere', 'refine your speech', 'stay composed', 'learn persuasion', 'craft reputation', 'talk to strangers', 'help people'] },
        { category: 'RHYTHM', items: ['optimise for efficiency', 'systemise your day', 'have a calendar', 'value your time', 'maintain a todo list', 'organise your desk', 'discard the useless'] },
        { category: 'LIFE', items: ['experience life', 'experience art', 'visit bookstores', 'eat clean', 'play combat sports', 'leave your phone at home', 'visualise it', 'notice patterns', 'invite what aligns', 'rejections aren\'t permanent'] }
    ];

    // Create positioned word elements scattered across the desktop
    const desktop = document.querySelector('.desktop');
    const dw = desktop.offsetWidth;
    const dh = desktop.offsetHeight;

    // Define safe zones to avoid overlapping icons and central card
    // Icons: top-left ~260x650, Central: center ~300x350, Shortcuts: bottom-right ~150x280
    const placed = [];

    function overlaps(x, y, w, h) {
        // Avoid icon area (top-left)
        if (x < 280 && y < 660) return true;
        // Avoid central card area
        const cx = dw / 2, cy = dh / 2;
        if (x + w > cx - 180 && x < cx + 180 && y + h > cy - 200 && y < cy + 200) return true;
        // Avoid bottom-right shortcuts
        if (x + w > dw - 170 && y + h > dh - 300) return true;
        // Avoid bottom dock area
        if (y + h > dh - 30) return true;
        // Check against other placed elements
        for (const p of placed) {
            if (x < p.x + p.w + 20 && x + w + 20 > p.x && y < p.y + p.h + 10 && y + h + 10 > p.y) return true;
        }
        return false;
    }

    // Flatten and shuffle
    const allWords = [];
    principles.forEach(cat => {
        // Add category label
        allWords.push({ text: cat.category, isCategory: true });
        // Add a selection of items from this category
        const shuffled = cat.items.sort(() => Math.random() - 0.5);
        shuffled.slice(0, 4).forEach(item => {
            allWords.push({ text: item, isCategory: false });
        });
    });

    // Shuffle all words
    allWords.sort(() => Math.random() - 0.5);

    allWords.forEach(word => {
        const el = document.createElement('span');
        el.className = word.isCategory ? 'wisdom-word wisdom-category' : 'wisdom-word';
        el.textContent = word.text;

        // Try to place it without overlap
        let attempts = 0;
        let x, y;
        const estW = word.isCategory ? 80 : word.text.length * 8;
        const estH = word.isCategory ? 16 : 14;

        do {
            x = 40 + Math.random() * (dw - estW - 80);
            y = 20 + Math.random() * (dh - estH - 60);
            attempts++;
        } while (overlaps(x, y, estW, estH) && attempts < 80);

        if (attempts < 80) {
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            // Slight random rotation for organic feel
            const rot = (Math.random() - 0.5) * 6;
            el.style.transform = `rotate(${rot}deg)`;
            // Stagger fade-in
            el.style.animationDelay = (Math.random() * 3) + 's';
            overlay.appendChild(el);
            placed.push({ x, y, w: estW, h: estH });
        }
    });
}

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

