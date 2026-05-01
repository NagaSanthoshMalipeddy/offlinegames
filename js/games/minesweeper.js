/* ── Minesweeper ──────────────────────────────── */
App.register({
    id: 'minesweeper',
    title: 'Minesweeper',
    icon: '💣',
    description: 'Reveal cells without hitting a mine.',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};
        const PRESETS = { easy: [9,9,10], medium: [16,16,40], hard: [16,30,99] };
        let rows, cols, mines, grid, revealed, flagged, gameOver, firstClick, flagMode;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;width:100%">
                <h2 class="g-title">MINESWEEPER</h2>
                <div id="ms-menu" class="g-row">
                    <button class="g-btn-sm ms-d" data-d="easy">Easy 9×9</button>
                    <button class="g-btn-sm ms-d" data-d="medium">Medium 16×16</button>
                    <button class="g-btn-sm ms-d" data-d="hard">Hard 16×30</button>
                </div>
                <div id="ms-bar" class="hidden" style="display:flex;gap:1.5rem;align-items:center;font-size:0.95rem;color:#aaa">
                    <span>💣 <strong id="ms-mines" style="color:#ff4081">0</strong></span>
                    <button class="g-btn-sm" id="ms-flag" style="font-size:0.85rem">🚩 Flag: OFF</button>
                    <button class="g-btn-sm" id="ms-new2">New</button>
                </div>
                <div id="ms-grid" style="display:inline-grid;gap:1px;background:#222;padding:1px;border-radius:4px;overflow:auto;max-width:95vw;max-height:65vh"></div>
                <div id="ms-msg" style="font-size:1.3rem;font-weight:700;min-height:1.5em"></div>
            </div>
        `;

        const gridEl = container.querySelector('#ms-grid');
        const msgEl = container.querySelector('#ms-msg');
        const barEl = container.querySelector('#ms-bar');
        const minesEl = container.querySelector('#ms-mines');
        const flagBtn = container.querySelector('#ms-flag');

        const numColors = ['','#00e5ff','#4caf50','#ff4081','#7c4dff','#ff9800','#00bcd4','#333','#aaa'];

        function startGame(preset) {
            [rows, cols, mines] = PRESETS[preset];
            grid = []; revealed = new Set(); flagged = new Set();
            gameOver = false; firstClick = true; flagMode = false;
            flagBtn.textContent = '🚩 Flag: OFF';

            for (let r = 0; r < rows; r++) {
                grid[r] = [];
                for (let c = 0; c < cols; c++) grid[r][c] = { mine: false, count: 0 };
            }

            barEl.classList.remove('hidden'); barEl.style.display = 'flex';
            container.querySelector('#ms-menu').classList.add('hidden');
            minesEl.textContent = mines;
            msgEl.textContent = '';

            const cellSize = Math.min(Math.floor(Math.min(window.innerWidth * 0.9, 600) / cols), 36);
            gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
            render();
        }

        function placeMines(safeR, safeC) {
            let placed = 0;
            while (placed < mines) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                if (grid[r][c].mine) continue;
                if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
                grid[r][c].mine = true; placed++;
            }
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                if (grid[r][c].mine) continue;
                let cnt = 0;
                neighbors(r, c, (nr, nc) => { if (grid[nr][nc].mine) cnt++; });
                grid[r][c].count = cnt;
            }
        }

        function neighbors(r, c, fn) {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                if (!dr && !dc) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
            }
        }

        function reveal(r, c) {
            const key = `${r},${c}`;
            if (revealed.has(key) || flagged.has(key)) return;
            revealed.add(key);
            if (grid[r][c].mine) { gameOver = true; revealAll(); msgEl.textContent = '💥 Game Over!'; msgEl.style.color = '#ff4081'; return; }
            if (grid[r][c].count === 0) {
                neighbors(r, c, (nr, nc) => reveal(nr, nc));
            }
            checkWin();
        }

        function revealAll() {
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) revealed.add(`${r},${c}`);
            render();
        }

        function checkWin() {
            const safe = rows * cols - mines;
            if (revealed.size >= safe) {
                gameOver = true;
                msgEl.textContent = '🎉 You Win!';
                msgEl.style.color = '#7c4dff';
                revealAll();
            }
        }

        function render() {
            gridEl.innerHTML = '';
            const cellSize = Math.min(Math.floor(Math.min(window.innerWidth * 0.9, 600) / cols), 36);
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const key = `${r},${c}`;
                const cell = document.createElement('button');
                cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;border:none;font-size:${Math.floor(cellSize*0.55)}px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;

                if (revealed.has(key)) {
                    const g = grid[r][c];
                    if (g.mine) {
                        cell.style.background = '#5a1a1a';
                        cell.textContent = '💣';
                    } else {
                        cell.style.background = '#1a1a30';
                        cell.style.color = numColors[g.count] || '#aaa';
                        cell.textContent = g.count || '';
                    }
                } else if (flagged.has(key)) {
                    cell.style.background = '#252550';
                    cell.textContent = '🚩';
                } else {
                    cell.style.background = '#2a2a55';
                }

                cell.addEventListener('click', () => handleClick(r, c));
                cell.addEventListener('contextmenu', e => { e.preventDefault(); toggleFlag(r, c); });
                gridEl.appendChild(cell);
            }
        }

        function handleClick(r, c) {
            if (gameOver) return;
            const key = `${r},${c}`;
            if (flagMode) { toggleFlag(r, c); return; }
            if (flagged.has(key)) return;

            if (firstClick) { firstClick = false; placeMines(r, c); }
            reveal(r, c); render();
        }

        function toggleFlag(r, c) {
            if (gameOver) return;
            const key = `${r},${c}`;
            if (revealed.has(key)) return;
            if (flagged.has(key)) flagged.delete(key);
            else flagged.add(key);
            minesEl.textContent = mines - flagged.size;
            render();
        }

        container.querySelector('#ms-menu').addEventListener('click', e => {
            const btn = e.target.closest('.ms-d'); if (btn) startGame(btn.dataset.d);
        });
        container.querySelector('#ms-new2').addEventListener('click', () => {
            container.querySelector('#ms-menu').classList.remove('hidden');
            barEl.classList.add('hidden'); gridEl.innerHTML = ''; msgEl.textContent = '';
        });
        flagBtn.addEventListener('click', () => {
            flagMode = !flagMode;
            flagBtn.textContent = flagMode ? '🚩 Flag: ON' : '🚩 Flag: OFF';
            flagBtn.style.borderColor = flagMode ? '#ff4081' : '#555';
        });
    },

    destroy() { this._state = null; }
});
