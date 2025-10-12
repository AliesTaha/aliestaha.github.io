// Window Management System
class WindowManager {
    constructor() {
        this.windows = new Map();
        this.windowStates = new Map();
        this.zIndexCounter = 1000;
        this.container = document.getElementById('windows-container');
        this.dragState = {
            isDragging: false,
            currentWindow: null,
            currentWindowId: null,
            startX: 0,
            startY: 0,
            windowX: 0,
            windowY: 0
        };
        this.snapPreview = document.getElementById('snap-preview');
        this.snapZone = null;
        this.iconDragState = {
            isDragging: false,
            currentIcon: null,
            startX: 0,
            startY: 0,
            iconX: 0,
            iconY: 0
        };
        this.resizeState = {
            isResizing: false,
            currentWindow: null,
            direction: null,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            startLeft: 0,
            startTop: 0
        };
    }

    createWindow(id, title, content, url = null) {
        if (this.windows.has(id)) {
            this.focusWindow(id);
            return;
        }

        const windowEl = document.createElement('div');
        windowEl.className = 'window active';
        windowEl.dataset.windowId = id;
        windowEl.style.zIndex = ++this.zIndexCounter;
        
        const offsetX = Math.random() * 100 - 50;
        const offsetY = Math.random() * 60 - 30;
        windowEl.style.left = `calc(50% - 300px + ${offsetX}px)`;
        windowEl.style.top = `calc(50% - 200px + ${offsetY}px)`;
        windowEl.style.width = '600px';
        windowEl.style.height = '500px';

        windowEl.innerHTML = `
            <div class="window-title-bar">
                <div class="window-controls">
                    <button class="window-button close" title="Close"></button>
                    <button class="window-button minimize" title="Minimize"></button>
                    <button class="window-button maximize" title="Maximize"></button>
                </div>
                <div class="window-title">${title}</div>
                <div style="width: 68px;"></div>
            </div>
            <div class="window-content">
                <div class="window-loading">
                    <div class="spinner"></div>
                    <div>Loading...</div>
                </div>
            </div>
            <div class="resize-handle resize-n"></div>
            <div class="resize-handle resize-e"></div>
            <div class="resize-handle resize-s"></div>
            <div class="resize-handle resize-w"></div>
            <div class="resize-handle resize-ne"></div>
            <div class="resize-handle resize-se"></div>
            <div class="resize-handle resize-sw"></div>
            <div class="resize-handle resize-nw"></div>
        `;

        this.container.appendChild(windowEl);
        this.windows.set(id, windowEl);
        
        this.windowStates.set(id, {
            state: 'normal',
            normalPosition: { left: offsetX, top: offsetY, width: 600, height: 500 }
        });

        this.setupWindowEvents(windowEl, id);

        if (url) {
            this.loadContent(windowEl, url);
        } else if (content) {
            windowEl.querySelector('.window-content').innerHTML = content;
        }
    }

    setupWindowEvents(windowEl, id) {
        windowEl.querySelector('.window-button.close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeWindow(id);
        });

        windowEl.querySelector('.window-button.minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimizeWindow(id);
        });

        windowEl.querySelector('.window-button.maximize').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMaximize(id);
        });

        windowEl.addEventListener('mousedown', (e) => {
            this.focusWindow(id);
        });

        const titleBar = windowEl.querySelector('.window-title-bar');
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-button')) return;
            
            const state = this.windowStates.get(id);
            if (state && state.state === 'normal') {
                this.startDragging(windowEl, e, id);
            } else if (state && (state.state === 'maximized' || state.state.startsWith('snapped'))) {
                this.restoreFromSnap(id, e);
            }
        });

        titleBar.addEventListener('dblclick', (e) => {
            if (!e.target.classList.contains('window-button')) {
                this.toggleMaximize(id);
            }
        });

        const resizeHandles = windowEl.querySelectorAll('.resize-handle');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const direction = handle.className.split(' ')[1].replace('resize-', '');
                this.startResizing(windowEl, e, direction, id);
            });
        });
    }

    startDragging(windowEl, e, windowId) {
        this.dragState.isDragging = true;
        this.dragState.currentWindow = windowEl;
        this.dragState.currentWindowId = windowId;
        this.dragState.startX = e.clientX;
        this.dragState.startY = e.clientY;
        
        const rect = windowEl.getBoundingClientRect();
        this.dragState.windowX = rect.left;
        this.dragState.windowY = rect.top - 28;
        
        document.body.style.cursor = 'grabbing';
        windowEl.style.cursor = 'grabbing';
        
        e.preventDefault();
    }

    handleDragging(e) {
        if (!this.dragState.isDragging) return;
        
        const deltaX = e.clientX - this.dragState.startX;
        const deltaY = e.clientY - this.dragState.startY;
        
        const newX = this.dragState.windowX + deltaX;
        const newY = this.dragState.windowY + deltaY;
        
        this.dragState.currentWindow.style.left = `${newX}px`;
        this.dragState.currentWindow.style.top = `${newY}px`;
        
        this.checkSnapZones(e.clientX, e.clientY);
    }

    checkSnapZones(mouseX, mouseY) {
        const snapThreshold = 20;
        const windowWidth = window.innerWidth;
        const menuBarHeight = 28;
        
        let newSnapZone = null;
        
        if (mouseX <= snapThreshold) {
            newSnapZone = 'left';
        } else if (mouseX >= windowWidth - snapThreshold) {
            newSnapZone = 'right';
        } else if (mouseY <= menuBarHeight + snapThreshold) {
            newSnapZone = 'top';
        }
        
        if (newSnapZone !== this.snapZone) {
            this.snapZone = newSnapZone;
            this.updateSnapPreview(newSnapZone);
        }
    }

    updateSnapPreview(zone) {
        if (!zone) {
            this.snapPreview.classList.remove('show');
            return;
        }
        
        const menuBarHeight = 28;
        const dockHeight = 70;
        const availableHeight = window.innerHeight - menuBarHeight - dockHeight;
        
        this.snapPreview.classList.add('show');
        
        if (zone === 'left') {
            this.snapPreview.style.left = '0';
            this.snapPreview.style.top = `${menuBarHeight}px`;
            this.snapPreview.style.width = '50%';
            this.snapPreview.style.height = `${availableHeight}px`;
        } else if (zone === 'right') {
            this.snapPreview.style.left = '50%';
            this.snapPreview.style.top = `${menuBarHeight}px`;
            this.snapPreview.style.width = '50%';
            this.snapPreview.style.height = `${availableHeight}px`;
        } else if (zone === 'top') {
            this.snapPreview.style.left = '0';
            this.snapPreview.style.top = `${menuBarHeight}px`;
            this.snapPreview.style.width = '100%';
            this.snapPreview.style.height = `${availableHeight}px`;
        }
    }

    stopDragging() {
        if (!this.dragState.isDragging) return;
        
        if (this.snapZone && this.dragState.currentWindowId) {
            this.snapWindow(this.dragState.currentWindowId, this.snapZone);
        }
        
        this.dragState.isDragging = false;
        this.dragState.currentWindow = null;
        this.dragState.currentWindowId = null;
        
        this.snapZone = null;
        this.updateSnapPreview(null);
        
        document.body.style.cursor = '';
        
        const windows = document.querySelectorAll('.window');
        windows.forEach(win => win.style.cursor = '');
    }

    snapWindow(id, position) {
        const windowEl = this.windows.get(id);
        const state = this.windowStates.get(id);
        
        if (!windowEl || !state) return;
        
        const menuBarHeight = 28;
        const dockHeight = 70;
        const availableHeight = window.innerHeight - menuBarHeight - dockHeight;
        
        if (state.state === 'normal') {
            const rect = windowEl.getBoundingClientRect();
            state.normalPosition = {
                left: rect.left,
                top: rect.top - menuBarHeight,
                width: rect.width,
                height: rect.height
            };
        }
        
        windowEl.style.transition = 'all 0.3s ease';
        
        if (position === 'left') {
            windowEl.style.left = '0';
            windowEl.style.top = '0';
            windowEl.style.width = '50%';
            windowEl.style.height = `${availableHeight}px`;
            state.state = 'snapped-left';
        } else if (position === 'right') {
            windowEl.style.left = '50%';
            windowEl.style.top = '0';
            windowEl.style.width = '50%';
            windowEl.style.height = `${availableHeight}px`;
            state.state = 'snapped-right';
        } else if (position === 'top') {
            windowEl.style.left = '0';
            windowEl.style.top = '0';
            windowEl.style.width = '100%';
            windowEl.style.height = `${availableHeight}px`;
            state.state = 'maximized';
            windowEl.classList.add('maximized');
        }
        
        setTimeout(() => {
            windowEl.style.transition = '';
        }, 300);
    }

    minimizeWindow(id) {
        const windowEl = this.windows.get(id);
        const state = this.windowStates.get(id);
        
        if (!windowEl || !state) return;
        
        state.state = 'minimized';
        
        windowEl.style.transition = 'all 0.3s ease';
        windowEl.style.transform = 'scale(0.3)';
        windowEl.style.opacity = '0';
        
        setTimeout(() => {
            windowEl.style.display = 'none';
            windowEl.style.transition = '';
            windowEl.style.transform = '';
            windowEl.style.opacity = '';
        }, 300);
        
        this.addMinimizedIndicator(id);
    }

    restoreWindow(id) {
        const windowEl = this.windows.get(id);
        const state = this.windowStates.get(id);
        
        if (!windowEl || !state) return;
        
        state.state = 'normal';
        windowEl.style.display = 'flex';
        
        windowEl.style.transition = 'all 0.3s ease';
        windowEl.style.transform = 'scale(0.9)';
        windowEl.style.opacity = '0';
        
        setTimeout(() => {
            windowEl.style.transform = 'scale(1)';
            windowEl.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            windowEl.style.transition = '';
            windowEl.style.transform = '';
        }, 300);
        
        this.focusWindow(id);
        this.removeMinimizedIndicator(id);
    }

    toggleMaximize(id) {
        const windowEl = this.windows.get(id);
        const state = this.windowStates.get(id);
        
        if (!windowEl || !state) return;
        
        if (state.state === 'maximized') {
            state.state = 'normal';
            const normal = state.normalPosition;
            windowEl.style.left = `calc(50% - 300px + ${normal.left}px)`;
            windowEl.style.top = `calc(50% - 200px + ${normal.top}px)`;
            windowEl.style.width = `${normal.width}px`;
            windowEl.style.height = `${normal.height}px`;
            windowEl.classList.remove('maximized');
        } else {
            const rect = windowEl.getBoundingClientRect();
            state.normalPosition = {
                left: rect.left,
                top: rect.top - 28,
                width: rect.width,
                height: rect.height
            };
            
            state.state = 'maximized';
            windowEl.style.left = '0';
            windowEl.style.top = '0';
            windowEl.style.width = '100%';
            windowEl.style.height = 'calc(100vh - 98px)';
            windowEl.classList.add('maximized');
        }
    }

    startResizing(windowEl, e, direction, id) {
        const state = this.windowStates.get(id);
        if (state && state.state === 'maximized') return;
        
        this.resizeState.isResizing = true;
        this.resizeState.currentWindow = windowEl;
        this.resizeState.direction = direction;
        this.resizeState.startX = e.clientX;
        this.resizeState.startY = e.clientY;
        
        const rect = windowEl.getBoundingClientRect();
        this.resizeState.startWidth = rect.width;
        this.resizeState.startHeight = rect.height;
        this.resizeState.startLeft = rect.left;
        this.resizeState.startTop = rect.top - 28;
        
        e.preventDefault();
    }

    handleResizing(e) {
        if (!this.resizeState.isResizing) return;
        
        const deltaX = e.clientX - this.resizeState.startX;
        const deltaY = e.clientY - this.resizeState.startY;
        const dir = this.resizeState.direction;
        const win = this.resizeState.currentWindow;
        
        let newWidth = this.resizeState.startWidth;
        let newHeight = this.resizeState.startHeight;
        let newLeft = this.resizeState.startLeft;
        let newTop = this.resizeState.startTop;
        
        if (dir.includes('e')) {
            newWidth = Math.max(400, this.resizeState.startWidth + deltaX);
        }
        if (dir.includes('w')) {
            newWidth = Math.max(400, this.resizeState.startWidth - deltaX);
            newLeft = this.resizeState.startLeft + deltaX;
        }
        
        if (dir.includes('s')) {
            newHeight = Math.max(300, this.resizeState.startHeight + deltaY);
        }
        if (dir.includes('n')) {
            newHeight = Math.max(300, this.resizeState.startHeight - deltaY);
            newTop = this.resizeState.startTop + deltaY;
        }
        
        win.style.width = `${newWidth}px`;
        win.style.height = `${newHeight}px`;
        win.style.left = `${newLeft}px`;
        win.style.top = `${newTop}px`;
    }

    stopResizing() {
        if (!this.resizeState.isResizing) return;
        
        this.resizeState.isResizing = false;
        this.resizeState.currentWindow = null;
        this.resizeState.direction = null;
    }

    addMinimizedIndicator(id) {
        const windowEl = this.windows.get(id);
        const title = windowEl.querySelector('.window-title').textContent;
        
        let icon = '📄';
        const desktopIcon = document.querySelector(`[data-window="${id}"]`);
        if (desktopIcon) {
            const iconEl = desktopIcon.querySelector('.icon-image');
            if (iconEl) {
                icon = iconEl.textContent;
            }
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'minimized-indicator';
        indicator.dataset.windowId = id;
        indicator.innerHTML = `<div class="minimized-icon">${icon}</div>`;
        indicator.title = `Restore ${title}`;
        indicator.addEventListener('click', () => this.restoreWindow(id));
        
        document.querySelector('.dock').appendChild(indicator);
    }

    removeMinimizedIndicator(id) {
        const indicator = document.querySelector(`.minimized-indicator[data-window-id="${id}"]`);
        if (indicator) indicator.remove();
    }

    restoreFromSnap(id, e) {
        const windowEl = this.windows.get(id);
        const state = this.windowStates.get(id);
        
        if (!windowEl || !state) return;
        
        const normal = state.normalPosition;
        
        const offsetX = e.clientX - normal.width / 2;
        const offsetY = e.clientY - 28;
        
        windowEl.style.left = `${offsetX}px`;
        windowEl.style.top = `${offsetY}px`;
        windowEl.style.width = `${normal.width}px`;
        windowEl.style.height = `${normal.height}px`;
        windowEl.classList.remove('maximized');
        
        state.state = 'normal';
        
        this.startDragging(windowEl, e, id);
    }

    async loadContent(windowEl, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch');
            }
            const html = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const container = doc.querySelector('.container');
            if (container) {
                const content = container.cloneNode(true);
                const navs = content.querySelectorAll('nav, .nav');
                navs.forEach(nav => nav.remove());
                windowEl.querySelector('.window-content').innerHTML = content.innerHTML;
            } else {
                const bodyClone = doc.body.cloneNode(true);
                const navs = bodyClone.querySelectorAll('nav, .nav');
                navs.forEach(nav => nav.remove());
                const scripts = bodyClone.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                windowEl.querySelector('.window-content').innerHTML = bodyClone.innerHTML;
            }
        } catch (error) {
            console.error('Error loading content:', error);
            windowEl.querySelector('.window-content').innerHTML = 
                '<p style="color: #888; text-align: center; margin-top: 40px;">Error loading content. Please try again.</p>';
        }
    }

    focusWindow(id) {
        this.windows.forEach(win => win.classList.remove('active'));
        
        const windowEl = this.windows.get(id);
        if (windowEl) {
            windowEl.classList.add('active');
            windowEl.style.zIndex = ++this.zIndexCounter;
        }
    }

    closeWindow(id) {
        const windowEl = this.windows.get(id);
        if (windowEl) {
            windowEl.remove();
            this.windows.delete(id);
            this.windowStates.delete(id);
            this.removeMinimizedIndicator(id);
        }
    }
}

