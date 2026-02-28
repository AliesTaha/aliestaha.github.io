// Interactive terminal emulator
function initTerminal(windowManager) {
    const output = document.getElementById('terminal-output-window') || document.getElementById('terminal-output');
    const input = document.getElementById('terminal-input-window') || document.getElementById('terminal-input');
    const promptSpan = document.getElementById('terminal-prompt-window') || document.getElementById('terminal-prompt');

    if (!output || !input || !promptSpan) {
        console.warn('Terminal elements not found');
        return;
    }

    let cwd = '~';
    let history = [];
    let historyIdx = 0;

    // Virtual file system
    const vfs = {
        '~': [
            { name: 'blog', type: 'dir' },
            { name: 'experience', type: 'file' },
            { name: 'contact', type: 'file' },
            { name: 'books', type: 'file' },
            { name: 'roadmap', type: 'file' },
            { name: '.trash', type: 'dir' },
        ],
        '~/blog': [
            { name: 'technical', type: 'file' },
            { name: 'philosophy', type: 'file' },
        ],
        '~/.trash': [
            { name: 'TOP_SECRET.txt', type: 'file' },
            { name: 'NDA.txt', type: 'file' },
            { name: 'spicy.mov', type: 'file' },
        ],
    };

    // Window openers — work from any directory
    const openers = {
        'technical':      () => windowManager.createWindow('technical', 'technical blog posts', pageContent.technical),
        'philosophy':     () => windowManager.createWindow('philosophy', 'philosophy blog posts', pageContent.philosophy),
        'experience':     () => windowManager.createWindow('experience', 'resume', pageContent.experience),
        'contact':        () => windowManager.createWindow('contact', 'contact info', pageContent.contact),
        'books':          () => windowManager.createWindow('books', 'books', pageContent.books),
        'roadmap':        () => createRoadmapWindow(windowManager),
        '.trash':         () => createTrashWindow(windowManager),
        'TOP_SECRET.txt': () => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank'),
        'NDA.txt':        () => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank'),
        'spicy.mov':      () => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank'),
    };

    // Cat content
    const catData = {
        'technical': [
            'breaking sota: 103% of peak performance on blackwell',
            'the optimizations behind 85% of sota performance',
            'using blackwell hardware features to optimize matmul',
            'matrix multiplication on blackwell: introduction',
        ],
        'philosophy': [
            'elements — a reflection',
            'how to find your purpose (incomplete)',
        ],
        'experience': [
            'baseten      model performance intern        jan–aug 2026',
            'modular      performance engineering intern  may–aug 2025',
            'tesla        software engineering intern     sep–dec 2024',
            'ford         software engineering intern     jan–apr 2024',
            'blackberry   software engineering intern     may–aug 2023',
        ],
        'contact': [
            'email     ali.taha@uwaterloo.ca',
            'github    github.com/aliestaha',
            'linkedin  linkedin.com/in/aliestaha',
        ],
        'books': [
            'napoleone                            emil ludwig       [finished]',
            'zero to one                          peter thiel       [finished]',
            'crime and punishment                 dostoevsky        [finished]',
            'deep work                            cal newport       [finished]',
            'the art of the deal                  donald trump      [reading]',
            'elements: transfiguration of elijah  oriental church   [finished]',
        ],
        'roadmap': [
            '2023  blackberry qnx      embedded systems',
            '2024  ford motor co.      vehicle software platform',
            '2024  tesla               computer vision',
            '2025  modular             mojo compiler performance',
            '2026  baseten             gpu inference infrastructure  ← you are here',
            ' ???  tbd                 something meaningful',
        ],
        'TOP_SECRET.txt': ['[REDACTED]', '', 'just kidding. try: open TOP_SECRET.txt'],
        'NDA.txt':        ['[REDACTED]'],
        'spicy.mov':      ['binary file (not shown)'],
    };

    // --- Output helpers ---
    function print(text) {
        const div = document.createElement('div');
        div.className = 'term-line';
        div.textContent = text;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }

    function printHTML(html) {
        const div = document.createElement('div');
        div.className = 'term-line';
        div.innerHTML = html;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }

    function printCmd(cmd) {
        const div = document.createElement('div');
        div.className = 'term-line';
        div.innerHTML = '<span class="term-prompt-echo">' + getPromptText() + '</span>' + escapeHTML(cmd);
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }

    function escapeHTML(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getPromptText() {
        return 'ali@desktop ' + cwd + ' $ ';
    }

    function updatePrompt() {
        promptSpan.textContent = getPromptText();
    }

    // --- Commands ---
    function cmdHelp() {
        var cmds = [
            ['ls [-a]',      'list directory contents'],
            ['cd <dir>',     'change directory'],
            ['open <name>',  'open in a window'],
            ['cat <file>',   'view file contents'],
            ['pwd',          'print working directory'],
            ['whoami',       'display user info'],
            ['clear',        'clear terminal'],
            ['history',      'command history'],
            ['echo <text>',  'print text'],
            ['date',         'current date & time'],
            ['neofetch',     'system information'],
        ];
        print('');
        cmds.forEach(function(pair) {
            printHTML('  <span class="term-cmd-name">' + pair[0].padEnd(16) + '</span> <span class="term-muted">' + pair[1] + '</span>');
        });
        print('');
    }

    function cmdLs(args) {
        var showAll = args.some(function(a) { return a === '-a' || a === '-la' || a === '-al'; });
        var items = vfs[cwd] || [];
        var display = showAll ? items : items.filter(function(i) { return !i.name.startsWith('.'); });

        if (display.length === 0 && !showAll) return;

        var parts = [];
        if (showAll) {
            parts.push('<span class="term-dir">.</span>');
            if (cwd !== '~') parts.push('<span class="term-dir">..</span>');
        }

        display.forEach(function(item) {
            if (item.type === 'dir') {
                parts.push('<span class="term-dir">' + item.name + '/</span>');
            } else {
                parts.push(item.name);
            }
        });

        printHTML(parts.join('  '));
    }

    function cmdCd(args) {
        if (args.length === 0 || args[0] === '~') {
            cwd = '~';
            updatePrompt();
            return;
        }

        var target = args[0].replace(/\/+$/, '');

        if (target === '.') return;

        if (target === '..') {
            if (cwd !== '~') {
                var parts = cwd.split('/');
                parts.pop();
                cwd = parts.join('/') || '~';
            }
            updatePrompt();
            return;
        }

        // Absolute path
        if (target.startsWith('~/')) {
            if (vfs[target]) {
                cwd = target;
                updatePrompt();
            } else {
                print('cd: no such directory: ' + target);
            }
            return;
        }

        // Relative path
        var items = vfs[cwd] || [];
        var found = items.find(function(i) { return i.name === target; });

        if (!found) {
            print('cd: no such directory: ' + target);
        } else if (found.type !== 'dir') {
            print('cd: not a directory: ' + target);
        } else {
            var newPath = cwd === '~' ? '~/' + target : cwd + '/' + target;
            if (vfs[newPath]) {
                cwd = newPath;
                updatePrompt();
            } else {
                print('cd: no such directory: ' + target);
            }
        }
    }

    function cmdOpen(args) {
        if (args.length === 0) {
            print('usage: open <name>');
            return;
        }
        var name = args[0].replace(/\/+$/, '');

        if (openers[name]) {
            openers[name]();
            printHTML('<span class="term-muted">opening ' + escapeHTML(name) + '...</span>');
            return;
        }

        // If it's a directory in current location without an opener, cd into it
        var items = vfs[cwd] || [];
        var found = items.find(function(i) { return i.name === name; });
        if (found && found.type === 'dir') {
            cmdCd([name]);
            return;
        }

        print('open: ' + name + ': not found');
    }

    function cmdCat(args) {
        if (args.length === 0) {
            print('usage: cat <file>');
            return;
        }
        var name = args[0].replace(/\/+$/, '');

        if (catData[name]) {
            var data = catData[name];
            if (Array.isArray(data)) {
                data.forEach(function(line) { print(line); });
            } else {
                print(data);
            }
            return;
        }

        // Check if it's a directory
        var newPath = cwd === '~' ? '~/' + name : cwd + '/' + name;
        if (vfs[newPath]) {
            print('cat: ' + name + ': is a directory');
            return;
        }

        print('cat: ' + name + ': no such file');
    }

    function cmdPwd() {
        print(cwd.replace('~', '/home/ali'));
    }

    function cmdClear() {
        output.innerHTML = '';
    }

    function cmdWhoami() {
        print('ali taha — performance engineer @ uwaterloo');
    }

    function cmdEcho(args) {
        print(args.join(' '));
    }

    function cmdHistory() {
        history.forEach(function(cmd, i) {
            printHTML('  <span class="term-muted">' + String(i + 1).padStart(4) + '</span>  ' + escapeHTML(cmd));
        });
    }

    function cmdDate() {
        print(new Date().toLocaleString());
    }

    function cmdNeofetch() {
        var lines = [
            '',
            '  <span class="term-accent">ali@desktop</span>',
            '  -----------',
            '  <span class="term-label">OS:</span>      AliOS 1.0 (Paper Edition)',
            '  <span class="term-label">Host:</span>    aliestaha.github.io',
            '  <span class="term-label">Kernel:</span>  vanilla.js',
            '  <span class="term-label">Shell:</span>   ali-sh 1.0',
            '  <span class="term-label">Display:</span> ' + window.innerWidth + 'x' + window.innerHeight,
            '  <span class="term-label">Theme:</span>   warm paper [light]',
            '  <span class="term-label">GPU:</span>     the one i\'m writing kernels for',
            '',
        ];
        lines.forEach(function(l) { printHTML(l); });
    }

    // Easter eggs
    function cmdSudo() {
        print('ali is not in the sudoers file. this incident will be reported.');
    }

    function cmdRm() {
        print('rm: permission denied. nice try.');
    }

    function cmdVim() {
        print('you can check in, but you can never leave.');
    }

    function cmdExit() {
        print('there is no escape.');
    }

    function cmdPing() {
        print('pong');
    }

    function cmdMake() {
        print("make: *** no targets. try 'make friends'.");
    }

    function cmdNvidiaSmi() {
        var lines = [
            '+-----------------------------------------------+',
            '| ALI-SMI 999.99        Driver: ali-gpu v1.0    |',
            '|-----------------------------------------------|',
            '|  GPU   Name           Util    Temp    Status   |',
            '|   0    RTX Infinity   103%    cool    vibing   |',
            '+-----------------------------------------------+',
            '| Processes: beating cublas                 [ok] |',
            '+-----------------------------------------------+',
        ];
        lines.forEach(function(l) { print(l); });
    }

    // --- Tab completion ---
    function autocomplete() {
        var val = input.value;
        var parts = val.split(/\s+/);

        if (parts.length <= 1) {
            var commands = ['help', 'ls', 'cd', 'open', 'cat', 'pwd', 'clear', 'whoami', 'echo', 'history', 'date', 'neofetch', 'nvidia-smi'];
            var matches = commands.filter(function(c) { return c.startsWith(parts[0]); });
            if (matches.length === 1) {
                input.value = matches[0] + ' ';
            } else if (matches.length > 1) {
                printCmd(val);
                printHTML(matches.join('  '));
            }
        } else {
            var partial = parts[parts.length - 1];
            var cmd = parts[0];
            var candidates = [];

            if (cmd === 'cd') {
                candidates = (vfs[cwd] || []).filter(function(i) { return i.type === 'dir'; }).map(function(i) { return i.name; });
            } else if (cmd === 'open') {
                var cwdNames = (vfs[cwd] || []).map(function(i) { return i.name; });
                candidates = Object.keys(openers).concat(cwdNames);
                candidates = candidates.filter(function(v, i, a) { return a.indexOf(v) === i; }); // unique
            } else if (cmd === 'cat') {
                var cwdFiles = (vfs[cwd] || []).filter(function(i) { return i.type === 'file'; }).map(function(i) { return i.name; });
                candidates = Object.keys(catData).concat(cwdFiles);
                candidates = candidates.filter(function(v, i, a) { return a.indexOf(v) === i; });
            } else {
                return;
            }

            var matches = candidates.filter(function(c) { return c.startsWith(partial); });
            if (matches.length === 1) {
                parts[parts.length - 1] = matches[0];
                input.value = parts.join(' ');
            } else if (matches.length > 1) {
                printCmd(val);
                printHTML(matches.join('  '));
            }
        }
    }

    // --- Execute ---
    function execute(cmdStr) {
        var parts = cmdStr.trim().split(/\s+/);
        var cmd = parts[0].toLowerCase();
        var args = parts.slice(1);

        switch (cmd) {
            case 'help':       cmdHelp(); break;
            case 'ls':         cmdLs(args); break;
            case 'cd':         cmdCd(args); break;
            case 'open':       cmdOpen(args); break;
            case 'cat':        cmdCat(args); break;
            case 'pwd':        cmdPwd(); break;
            case 'clear':      cmdClear(); break;
            case 'whoami':     cmdWhoami(); break;
            case 'echo':       cmdEcho(args); break;
            case 'history':    cmdHistory(); break;
            case 'date':       cmdDate(); break;
            case 'neofetch':   cmdNeofetch(); break;
            case 'sudo':       cmdSudo(); break;
            case 'rm':         cmdRm(); break;
            case 'rmdir':      cmdRm(); break;
            case 'vim':        cmdVim(); break;
            case 'vi':         cmdVim(); break;
            case 'nano':       cmdVim(); break;
            case 'emacs':      cmdVim(); break;
            case 'exit':       cmdExit(); break;
            case 'quit':       cmdExit(); break;
            case 'ping':       cmdPing(); break;
            case 'make':       cmdMake(); break;
            case 'nvidia-smi': cmdNvidiaSmi(); break;
            default:
                print('ali-sh: command not found: ' + cmd);
                break;
        }
    }

    // --- Event listeners ---
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            var cmd = input.value.trim();
            if (cmd) {
                history.push(cmd);
                historyIdx = history.length;
                printCmd(cmd);
                execute(cmd);
            } else {
                printCmd('');
            }
            input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIdx > 0) {
                historyIdx--;
                input.value = history[historyIdx];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIdx < history.length - 1) {
                historyIdx++;
                input.value = history[historyIdx];
            } else {
                historyIdx = history.length;
                input.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            autocomplete();
        } else if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            cmdClear();
        } else if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            printCmd(input.value + '^C');
            input.value = '';
        }

        e.stopPropagation();
    });

    input.addEventListener('keyup', function(e) { e.stopPropagation(); });
    input.addEventListener('keypress', function(e) { e.stopPropagation(); });

    // Toggle open/close
    var terminalEl = document.getElementById('terminal');
    var headerEl = document.getElementById('terminal-header');
    var desktop = document.querySelector('.desktop');
    var windowsContainer = document.getElementById('windows-container');
    var isOpen = false;

    function toggleTerminal() {
        isOpen = !isOpen;
        terminalEl.classList.toggle('open', isOpen);
        // Adjust desktop and windows area
        var bottom = isOpen ? '180px' : '28px';
        desktop.style.bottom = bottom;
        windowsContainer.style.bottom = bottom;
        if (isOpen) {
            setTimeout(function() {
                input.focus();
                output.scrollTop = output.scrollHeight;
            }, 100);
        }
    }

    headerEl.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleTerminal();
    });

    // Click terminal body to focus input (but not toggle)
    document.querySelector('.terminal-body').addEventListener('click', function() {
        input.focus();
    });

    // Welcome
    printHTML('<span class="term-muted">ali-sh v1.0 — type <span class="term-cmd-name">help</span> to get started</span>');
    updatePrompt();
}

// Auto-initialize
initTerminal(window.windowManager);
