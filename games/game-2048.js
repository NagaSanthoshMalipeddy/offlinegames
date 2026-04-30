/* ── 2048 Clone ───────────────────────────────── */
App.register({
    id: 'game-2048',
    title: '2048',
    icon: '🔢',
    description: 'Slide and merge tiles to reach 2048!',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};
        const SIZE = 4;
        const COLORS = {
            0:'#1a1a35',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',
            32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',
            1024:'#edc53f',2048:'#edc22e'
        };
        const TEXT_COLORS = { 0:'transparent',2:'#776e65',4:'#776e65' };
        let grid, score, won, lost;

        container.innerHTML = `
            <div id="g2-wrap" style="display:flex;flex-direction:column;align-items:center;gap:1rem;touch-action:none">
                <h2 class="g-title">2048</h2>
                <div style="display:flex;gap:2rem;align-items:center">
                    <span class="g-info">Score: <strong id="g2-score" style="color:#edcf72">0</strong></span>
                    <button class="g-btn-sm" id="g2-new">New Game</button>
                </div>
                <div id="g2-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:min(85vw,360px);background:#0e0e20;padding:8px;border-radius:12px"></div>
                <div id="g2-msg" style="font-size:1.3rem;font-weight:700;min-height:1.5em;text-align:center"></div>
                <p style="color:#555;font-size:0.8rem">Arrow keys or swipe to move</p>
            </div>
        `;

        const gridEl = container.querySelector('#g2-grid');
        const scoreEl = container.querySelector('#g2-score');
        const msgEl = container.querySelector('#g2-msg');

        function newGame() {
            grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
            score = 0; won = false; lost = false;
            addRandom(); addRandom();
            render();
            msgEl.textContent = '';
        }

        function addRandom() {
            const empty = [];
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) empty.push([r, c]);
            if (!empty.length) return;
            const [r, c] = empty[Math.floor(Math.random() * empty.length)];
            grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        }

        function render() {
            gridEl.innerHTML = '';
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
                const v = grid[r][c];
                const cell = document.createElement('div');
                cell.style.cssText = `aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:clamp(1.2rem,5vw,2rem);font-weight:800;background:${COLORS[v]||'#3c3a32'};color:${TEXT_COLORS[v]||'#f9f6f2'};transition:all 0.1s`;
                cell.textContent = v || '';
                gridEl.appendChild(cell);
            }
            scoreEl.textContent = score;
        }

        function slide(row) {
            let arr = row.filter(v => v);
            const merged = [];
            for (let i = 0; i < arr.length - 1; i++) {
                if (arr[i] === arr[i + 1]) {
                    arr[i] *= 2; score += arr[i]; arr[i + 1] = 0;
                    if (arr[i] === 2048 && !won) { won = true; msgEl.textContent = '🎉 You reached 2048!'; msgEl.style.color = '#edcf72'; }
                }
            }
            arr = arr.filter(v => v);
            while (arr.length < SIZE) arr.push(0);
            return arr;
        }

        function move(dir) {
            if (lost) return;
            const prev = JSON.stringify(grid);
            if (dir === 'left') {
                for (let r = 0; r < SIZE; r++) grid[r] = slide(grid[r]);
            } else if (dir === 'right') {
                for (let r = 0; r < SIZE; r++) grid[r] = slide(grid[r].reverse()).reverse();
            } else if (dir === 'up') {
                for (let c = 0; c < SIZE; c++) {
                    let col = grid.map(r => r[c]);
                    col = slide(col);
                    for (let r = 0; r < SIZE; r++) grid[r][c] = col[r];
                }
            } else if (dir === 'down') {
                for (let c = 0; c < SIZE; c++) {
                    let col = grid.map(r => r[c]).reverse();
                    col = slide(col).reverse();
                    for (let r = 0; r < SIZE; r++) grid[r][c] = col[r];
                }
            }
            if (JSON.stringify(grid) !== prev) {
                addRandom();
                render();
                if (isLost()) { lost = true; msgEl.textContent = 'Game Over!'; msgEl.style.color = '#ff4081'; }
            }
        }

        function isLost() {
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
                if (!grid[r][c]) return false;
                if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
                if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
            }
            return true;
        }

        /* Keyboard */
        s._onKey = e => {
            const map = { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down' };
            const dir = map[e.key.toLowerCase()];
            if (dir) { e.preventDefault(); move(dir); }
        };
        document.addEventListener('keydown', s._onKey);

        /* Touch swipe */
        let tx, ty;
        const wrap = container.querySelector('#g2-wrap');
        wrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
        wrap.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - tx;
            const dy = e.changedTouches[0].clientY - ty;
            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
            if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
            else move(dy > 0 ? 'down' : 'up');
        }, { passive: true });

        container.querySelector('#g2-new').addEventListener('click', newGame);
        newGame();
    },

    destroy() {
        const s = this._state; if (!s) return;
        document.removeEventListener('keydown', s._onKey);
        this._state = null;
    }
});
