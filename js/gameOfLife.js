// Conway's Game of Life - ambient desktop background
function initGameOfLife(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cellSize = 12;
    let cols, rows, grid;

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        cols = Math.floor(canvas.width / cellSize);
        rows = Math.floor(canvas.height / cellSize);
        grid = createGrid();
    }

    function createGrid() {
        const g = new Array(cols);
        for (let i = 0; i < cols; i++) {
            g[i] = new Array(rows);
            for (let j = 0; j < rows; j++) {
                // Sparse initial density (~8%) for a subtle look
                g[i][j] = Math.random() < 0.08 ? 1 : 0;
            }
        }
        return g;
    }

    function countNeighbors(g, x, y) {
        let sum = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                const col = (x + i + cols) % cols;
                const row = (y + j + rows) % rows;
                sum += g[col][row];
            }
        }
        return sum;
    }

    function step() {
        const next = new Array(cols);
        for (let i = 0; i < cols; i++) {
            next[i] = new Array(rows);
            for (let j = 0; j < rows; j++) {
                const neighbors = countNeighbors(grid, i, j);
                if (grid[i][j] === 1) {
                    next[i][j] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                } else {
                    next[i][j] = (neighbors === 3) ? 1 : 0;
                }
            }
        }
        grid = next;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                if (grid[i][j] === 1) {
                    ctx.fillStyle = 'rgba(180, 165, 140, 0.35)';
                    ctx.beginPath();
                    ctx.arc(
                        i * cellSize + cellSize / 2,
                        j * cellSize + cellSize / 2,
                        cellSize / 2 - 1.5,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }
    }

    // Inject life periodically to keep things interesting
    function injectLife() {
        const cx = Math.floor(Math.random() * (cols - 10)) + 5;
        const cy = Math.floor(Math.random() * (rows - 10)) + 5;
        // Glider
        const patterns = [
            [[0,1],[1,2],[2,0],[2,1],[2,2]],
            // Lightweight spaceship
            [[0,1],[0,3],[1,4],[2,4],[3,4],[3,1],[3,0],[2,0]],
            // R-pentomino
            [[0,1],[0,2],[1,0],[1,1],[2,1]]
        ];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        pattern.forEach(([dx, dy]) => {
            const x = (cx + dx) % cols;
            const y = (cy + dy) % rows;
            grid[x][y] = 1;
        });
    }

    resize();
    window.addEventListener('resize', resize);

    // Slow tick for ambient feel
    let tickCount = 0;
    setInterval(() => {
        step();
        draw();
        tickCount++;
        // Inject new life every ~30 ticks to prevent total die-off
        if (tickCount % 30 === 0) {
            injectLife();
        }
    }, 400);

    // Initial draw
    draw();
}
