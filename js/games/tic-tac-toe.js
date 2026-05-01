/* ── Tic Tac Toe (with Minimax AI) ────────────── */
App.register({
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    icon: '❌⭕',
    description: 'Beat the AI with Minimax — 3×3, 4×4, or 5×5 board.',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};
        let board, turn, gameOver, mode, diff, size, winLen, wins;
        const HUMAN = 'X', AI = 'O';

        container.innerHTML = `
            <div id="ttt-wrap" style="display:flex;flex-direction:column;align-items:center;gap:1rem">
                <h2 class="g-title">TIC TAC TOE</h2>
                <div id="ttt-menu" class="g-col">
                    <div class="g-col" style="margin-bottom:0.5rem">
                        <span class="g-info">Board Size</span>
                        <div class="g-row">
                            <button class="g-btn-sm ttt-sz active-sz" data-s="3">3×3</button>
                            <button class="g-btn-sm ttt-sz" data-s="4">4×4</button>
                            <button class="g-btn-sm ttt-sz" data-s="5">5×5</button>
                        </div>
                    </div>
                    <div class="g-row">
                        <button class="g-btn" id="ttt-1p">vs AI</button>
                        <button class="g-btn" id="ttt-2p">2 Players</button>
                    </div>
                    <div id="ttt-diff" class="hidden g-col" style="margin-top:0.5rem">
                        <span class="g-info">Difficulty</span>
                        <div class="g-row">
                            <button class="g-btn-sm td" data-d="easy">Easy</button>
                            <button class="g-btn-sm td" data-d="medium">Medium</button>
                            <button class="g-btn-sm td" data-d="hard">Hard</button>
                        </div>
                    </div>
                </div>
                <div id="ttt-board" class="hidden" style="display:grid;gap:6px;aspect-ratio:1"></div>
                <div id="ttt-status" style="font-size:1.2rem;color:#aaa;min-height:1.5em;text-align:center"></div>
                <button class="g-btn hidden" id="ttt-restart">Play Again</button>
            </div>
        `;

        const boardEl = container.querySelector('#ttt-board');
        const statusEl = container.querySelector('#ttt-status');
        const menuEl = container.querySelector('#ttt-menu');
        const restartBtn = container.querySelector('#ttt-restart');

        size = 3;

        // Board size selection
        container.querySelectorAll('.ttt-sz').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.ttt-sz').forEach(b => {
                    b.style.borderColor = '';
                    b.style.color = '';
                });
                btn.style.borderColor = '#7c4dff';
                btn.style.color = '#fff';
                size = parseInt(btn.dataset.s);
            });
        });
        // Default highlight
        container.querySelector('.ttt-sz[data-s="3"]').style.borderColor = '#7c4dff';
        container.querySelector('.ttt-sz[data-s="3"]').style.color = '#fff';

        function generateWins(n) {
            const w = [];
            const len = n === 3 ? 3 : n === 4 ? 4 : 4; // win length: 3 for 3x3, 4 for 4x4/5x5
            winLen = len;
            // Rows
            for (let r = 0; r < n; r++) {
                for (let c = 0; c <= n - len; c++) {
                    const line = [];
                    for (let k = 0; k < len; k++) line.push(r * n + c + k);
                    w.push(line);
                }
            }
            // Cols
            for (let c = 0; c < n; c++) {
                for (let r = 0; r <= n - len; r++) {
                    const line = [];
                    for (let k = 0; k < len; k++) line.push((r + k) * n + c);
                    w.push(line);
                }
            }
            // Diagonal ↘
            for (let r = 0; r <= n - len; r++) {
                for (let c = 0; c <= n - len; c++) {
                    const line = [];
                    for (let k = 0; k < len; k++) line.push((r + k) * n + (c + k));
                    w.push(line);
                }
            }
            // Diagonal ↙
            for (let r = 0; r <= n - len; r++) {
                for (let c = len - 1; c < n; c++) {
                    const line = [];
                    for (let k = 0; k < len; k++) line.push((r + k) * n + (c - k));
                    w.push(line);
                }
            }
            return w;
        }

        function startGame(m, d) {
            mode = m; diff = d || 'hard';
            const total = size * size;
            board = Array(total).fill('');
            wins = generateWins(size);
            turn = HUMAN; gameOver = false;
            menuEl.classList.add('hidden');
            boardEl.classList.remove('hidden');
            const maxW = size === 3 ? 320 : size === 4 ? 380 : 420;
            const fontSize = size === 3 ? 'clamp(2rem,8vw,3.5rem)' : size === 4 ? 'clamp(1.4rem,5vw,2.2rem)' : 'clamp(1rem,4vw,1.8rem)';
            boardEl.style.display = 'grid';
            boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
            boardEl.style.width = `min(85vw, ${maxW}px)`;
            boardEl.dataset.fontSize = fontSize;
            restartBtn.classList.add('hidden');
            renderBoard();
            statusEl.textContent = "X's turn";
        }

        function renderBoard() {
            boardEl.innerHTML = '';
            const fontSize = boardEl.dataset.fontSize || 'clamp(2rem,8vw,3.5rem)';
            board.forEach((v, i) => {
                const cell = document.createElement('button');
                cell.style.cssText = `background:#1a1a35;border:2px solid #333;border-radius:${size <= 3 ? 10 : 6}px;font-size:${fontSize};font-weight:700;cursor:pointer;color:${v === 'X' ? '#00e5ff' : '#ff4081'};transition:background 0.15s;aspect-ratio:1;display:flex;align-items:center;justify-content:center;min-height:0;min-width:0`;
                cell.textContent = v || '\u00A0';
                cell.addEventListener('click', () => handleClick(i));
                boardEl.appendChild(cell);
            });
        }

        function handleClick(i) {
            if (gameOver || board[i]) return;
            if (mode === '1p' && turn !== HUMAN) return;
            board[i] = turn;
            renderBoard();
            if (checkEnd()) return;
            turn = turn === 'X' ? 'O' : 'X';
            statusEl.textContent = `${turn}'s turn`;
            if (mode === '1p' && turn === AI) {
                setTimeout(aiMove, 300);
            }
        }

        function aiMove() {
            if (gameOver) return;
            let idx;
            if (diff === 'easy') {
                idx = randomMove();
            } else if (diff === 'medium') {
                idx = Math.random() < 0.5 ? bestMove() : randomMove();
            } else {
                idx = bestMove();
            }
            board[idx] = AI;
            renderBoard();
            if (checkEnd()) return;
            turn = HUMAN;
            statusEl.textContent = `${turn}'s turn`;
        }

        function randomMove() {
            const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
            return empty[Math.floor(Math.random() * empty.length)];
        }

        function bestMove() {
            // For 3x3 use full minimax, for larger boards use depth-limited + heuristics
            const maxDepth = size === 3 ? 9 : size === 4 ? 4 : 3;
            let best = -Infinity, move = 0;
            const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
            for (const i of empty) {
                board[i] = AI;
                const s = minimax(board, false, 0, maxDepth, -Infinity, Infinity);
                board[i] = '';
                if (s > best) { best = s; move = i; }
            }
            return move;
        }

        function minimax(b, isMax, depth, maxDepth, alpha, beta) {
            const w = winner(b);
            if (w === AI) return 100 - depth;
            if (w === HUMAN) return -100 + depth;
            if (b.every(c => c) || depth >= maxDepth) return heuristic(b);

            if (isMax) {
                let best = -Infinity;
                for (let i = 0; i < b.length; i++) {
                    if (b[i]) continue;
                    b[i] = AI;
                    best = Math.max(best, minimax(b, false, depth + 1, maxDepth, alpha, beta));
                    b[i] = '';
                    alpha = Math.max(alpha, best);
                    if (beta <= alpha) break;
                }
                return best;
            } else {
                let best = Infinity;
                for (let i = 0; i < b.length; i++) {
                    if (b[i]) continue;
                    b[i] = HUMAN;
                    best = Math.min(best, minimax(b, true, depth + 1, maxDepth, alpha, beta));
                    b[i] = '';
                    beta = Math.min(beta, best);
                    if (beta <= alpha) break;
                }
                return best;
            }
        }

        function heuristic(b) {
            let score = 0;
            for (const line of wins) {
                const vals = line.map(i => b[i]);
                const ai = vals.filter(v => v === AI).length;
                const hu = vals.filter(v => v === HUMAN).length;
                if (hu === 0) score += ai * ai;
                if (ai === 0) score -= hu * hu;
            }
            return score;
        }

        function winner(b) {
            for (const line of wins) {
                const first = b[line[0]];
                if (first && line.every(i => b[i] === first)) return first;
            }
            return null;
        }

        function checkEnd() {
            const w = winner(board);
            if (w) { statusEl.textContent = `${w} wins!`; gameOver = true; restartBtn.classList.remove('hidden'); return true; }
            if (board.every(c => c)) { statusEl.textContent = "It's a draw!"; gameOver = true; restartBtn.classList.remove('hidden'); return true; }
            return false;
        }

        container.querySelector('#ttt-1p').addEventListener('click', () => container.querySelector('#ttt-diff').classList.remove('hidden'));
        container.querySelector('#ttt-2p').addEventListener('click', () => startGame('2p'));
        container.querySelector('#ttt-diff').addEventListener('click', e => { const b = e.target.closest('.td'); if (b) startGame('1p', b.dataset.d); });
        restartBtn.addEventListener('click', () => startGame(mode, diff));
    },

    destroy() { this._state = null; }
});
