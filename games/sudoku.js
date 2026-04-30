/* ── Sudoku ───────────────────────────────────── */
App.register({
    id: 'sudoku',
    title: 'Sudoku',
    icon: '🔢',
    description: 'Fill the 9×9 grid — each row, column, box has 1–9.',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};
        let puzzle, solution, board, selected, errors;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;width:100%">
                <h2 class="g-title">SUDOKU</h2>
                <div id="su-menu" class="g-row">
                    <button class="g-btn-sm su-d" data-d="easy">Easy</button>
                    <button class="g-btn-sm su-d" data-d="medium">Medium</button>
                    <button class="g-btn-sm su-d" data-d="hard">Hard</button>
                </div>
                <div id="su-bar" class="hidden" style="display:flex;gap:1rem;align-items:center">
                    <button class="g-btn-sm" id="su-hint">💡 Hint</button>
                    <button class="g-btn-sm" id="su-solve">Solve</button>
                    <button class="g-btn-sm" id="su-new2">New</button>
                </div>
                <div id="su-grid" style="display:inline-grid;grid-template-columns:repeat(9,1fr);width:min(90vw,400px);aspect-ratio:1;background:#333;gap:1px;border:2px solid #555;border-radius:4px"></div>
                <div id="su-nums" class="g-row" style="margin-top:0.25rem"></div>
                <div id="su-msg" style="font-size:1.2rem;font-weight:700;min-height:1.5em"></div>
            </div>
        `;

        const gridEl = container.querySelector('#su-grid');
        const msgEl = container.querySelector('#su-msg');
        const barEl = container.querySelector('#su-bar');
        const numsEl = container.querySelector('#su-nums');

        const blanks = { easy: 30, medium: 45, hard: 55 };

        function startGame(diff) {
            solution = generateSolved();
            board = solution.map(r => [...r]);
            puzzle = solution.map(r => [...r]);
            const remove = blanks[diff];
            let removed = 0;
            while (removed < remove) {
                const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
                if (puzzle[r][c] !== 0) { puzzle[r][c] = 0; board[r][c] = 0; removed++; }
            }
            selected = null; errors = 0;
            container.querySelector('#su-menu').classList.add('hidden');
            barEl.classList.remove('hidden'); barEl.style.display = 'flex';
            msgEl.textContent = '';
            renderNums();
            render();
        }

        function generateSolved() {
            const g = Array.from({ length: 9 }, () => Array(9).fill(0));
            fillGrid(g);
            return g;
        }

        function fillGrid(g) {
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
                if (g[r][c] !== 0) continue;
                const nums = shuffle([1,2,3,4,5,6,7,8,9]);
                for (const n of nums) {
                    if (isValid(g, r, c, n)) {
                        g[r][c] = n;
                        if (fillGrid(g)) return true;
                        g[r][c] = 0;
                    }
                }
                return false;
            }
            return true;
        }

        function isValid(g, r, c, n) {
            for (let i = 0; i < 9; i++) { if (g[r][i] === n || g[i][c] === n) return false; }
            const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
            for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
                if (g[br + dr][bc + dc] === n) return false;
            }
            return true;
        }

        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
            return arr;
        }

        function render() {
            gridEl.innerHTML = '';
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
                const cell = document.createElement('button');
                const isFixed = puzzle[r][c] !== 0;
                const val = board[r][c];
                const isSel = selected && selected[0] === r && selected[1] === c;
                const isWrong = val !== 0 && val !== solution[r][c];

                let bg = '#1a1a35';
                if (isSel) bg = '#333366';
                else if (isFixed) bg = '#1e1e40';

                const borderR = (c + 1) % 3 === 0 && c < 8 ? '2px solid #555' : 'none';
                const borderB = (r + 1) % 3 === 0 && r < 8 ? '2px solid #555' : 'none';

                cell.style.cssText = `background:${bg};border:none;border-right:${borderR};border-bottom:${borderB};font-size:clamp(1rem,3.5vw,1.5rem);font-weight:${isFixed?'700':'400'};color:${isWrong?'#ff4081':isFixed?'#ccc':'#00e5ff'};cursor:${isFixed?'default':'pointer'};display:flex;align-items:center;justify-content:center;aspect-ratio:1;`;
                cell.textContent = val || '';
                if (!isFixed) cell.addEventListener('click', () => { selected = [r, c]; render(); });
                gridEl.appendChild(cell);
            }
        }

        function renderNums() {
            numsEl.innerHTML = '';
            for (let n = 1; n <= 9; n++) {
                const btn = document.createElement('button');
                btn.className = 'g-btn-sm';
                btn.textContent = n;
                btn.style.cssText = 'width:36px;height:36px;font-size:1.1rem;font-weight:700;';
                btn.addEventListener('click', () => placeNum(n));
                numsEl.appendChild(btn);
            }
            const clr = document.createElement('button');
            clr.className = 'g-btn-sm';
            clr.textContent = '✕';
            clr.style.cssText = 'width:36px;height:36px;font-size:1.1rem;color:#ff4081;';
            clr.addEventListener('click', () => placeNum(0));
            numsEl.appendChild(clr);
        }

        function placeNum(n) {
            if (!selected) return;
            const [r, c] = selected;
            if (puzzle[r][c] !== 0) return;
            board[r][c] = n;
            render();
            checkWin();
        }

        function checkWin() {
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
                if (board[r][c] !== solution[r][c]) return;
            }
            msgEl.textContent = '🎉 Puzzle Solved!';
            msgEl.style.color = '#7c4dff';
        }

        /* Keyboard */
        s._onKey = e => {
            const n = parseInt(e.key);
            if (n >= 1 && n <= 9) placeNum(n);
            if (e.key === 'Backspace' || e.key === 'Delete') placeNum(0);
        };
        document.addEventListener('keydown', s._onKey);

        container.querySelector('#su-menu').addEventListener('click', e => {
            const btn = e.target.closest('.su-d'); if (btn) startGame(btn.dataset.d);
        });
        container.querySelector('#su-hint').addEventListener('click', () => {
            if (!selected) return;
            const [r, c] = selected;
            if (puzzle[r][c] !== 0) return;
            board[r][c] = solution[r][c]; render(); checkWin();
        });
        container.querySelector('#su-solve').addEventListener('click', () => {
            for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) board[r][c] = solution[r][c];
            render(); msgEl.textContent = 'Solved!'; msgEl.style.color = '#00e5ff';
        });
        container.querySelector('#su-new2').addEventListener('click', () => {
            container.querySelector('#su-menu').classList.remove('hidden');
            barEl.classList.add('hidden'); gridEl.innerHTML = ''; numsEl.innerHTML = ''; msgEl.textContent = '';
        });
    },

    destroy() {
        const s = this._state; if (!s) return;
        document.removeEventListener('keydown', s._onKey);
        this._state = null;
    }
});
