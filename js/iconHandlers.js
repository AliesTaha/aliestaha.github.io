// Desktop icon interactions and dragging

function initializeIconHandlers(windowManager) {
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        let clickCount = 0;
        let clickTimer = null;
        let dragStarted = false;

        icon.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            
            if (icon.dataset.dragTimer) {
                clearTimeout(parseInt(icon.dataset.dragTimer));
            }
            
            dragStarted = false;
            clickCount++;
            
            if (clickCount === 1) {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                icon.classList.add('selected');
                
                const startDragTimer = setTimeout(() => {
                    if (!dragStarted && e.buttons === 1) {
                        dragStarted = true;
                        startIconDrag(icon, e, windowManager);
                    }
                }, 150);
                
                icon.dataset.dragTimer = startDragTimer.toString();
                
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 300);
            }
        });
        
        icon.addEventListener('mouseup', () => {
            if (icon.dataset.dragTimer) {
                clearTimeout(parseInt(icon.dataset.dragTimer));
                icon.dataset.dragTimer = null;
            }
        });

        icon.addEventListener('dblclick', (e) => {
            clearTimeout(clickTimer);
            clickCount = 0;
            e.preventDefault();
        
            icon.classList.remove('selected');
                
            const windowId = icon.dataset.window;
            const url = icon.dataset.url;
            const label = icon.querySelector('.icon-label').textContent;
            
            if (windowId && pageContent[windowId]) {
                windowManager.createWindow(windowId, label, pageContent[windowId]);
            } else if (windowId === 'readme') {
                windowManager.createWindow('readme', 'README.md', `
                    <h1>ali taha</h1>
                    <p>Personal website built with desktop OS interface.</p>
                    <h2>About</h2>
                    <p>Computer Engineering student @ UWaterloo</p>
                    <p>Performance Engineering enthusiast</p>
                    <h2>Tech Stack</h2>
                    <ul>
                        <li>HTML, CSS, JavaScript</li>
                        <li>Desktop OS-inspired interface</li>
                        <li>Window management system</li>
                    </ul>
                `);
            } else {
                showNotification(`Opening ${label}...`);
            }
        });
    });

    // Global listeners for icon dragging
    document.addEventListener('mousemove', (e) => {
        handleIconDrag(e, windowManager);
    });

    document.addEventListener('mouseup', (e) => {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            if (icon.dataset.dragTimer) {
                clearTimeout(parseInt(icon.dataset.dragTimer));
                icon.dataset.dragTimer = null;
            }
        });
        stopIconDrag(windowManager);
    });
}

function startIconDrag(icon, e, windowManager) {
    windowManager.iconDragState.isDragging = true;
    windowManager.iconDragState.currentIcon = icon;
    windowManager.iconDragState.startX = e.clientX;
    windowManager.iconDragState.startY = e.clientY;
    
    const rect = icon.getBoundingClientRect();
    windowManager.iconDragState.iconX = rect.left;
    windowManager.iconDragState.iconY = rect.top;
    
    icon.style.position = 'fixed';
    icon.style.left = `${rect.left}px`;
    icon.style.top = `${rect.top}px`;
    icon.style.zIndex = '10000';
    icon.classList.add('dragging-icon');
    
    e.preventDefault();
}

function handleIconDrag(e, windowManager) {
    if (!windowManager.iconDragState.isDragging) return;
    
    const deltaX = e.clientX - windowManager.iconDragState.startX;
    const deltaY = e.clientY - windowManager.iconDragState.startY;
    
    const newX = windowManager.iconDragState.iconX + deltaX;
    const newY = windowManager.iconDragState.iconY + deltaY;
    
    windowManager.iconDragState.currentIcon.style.left = `${newX}px`;
    windowManager.iconDragState.currentIcon.style.top = `${newY}px`;
}

function stopIconDrag(windowManager) {
    if (!windowManager.iconDragState.isDragging) return;
    
    const icon = windowManager.iconDragState.currentIcon;
    if (icon) {
        icon.classList.remove('dragging-icon');
        icon.classList.remove('selected');
    }
    
    windowManager.iconDragState.isDragging = false;
    windowManager.iconDragState.currentIcon = null;
}

