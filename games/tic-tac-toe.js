/* ── Tic Tac Toe (with Minimax AI) ────────────── */
App.register({
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    icon: '❌⭕',
    description: 'Beat the AI with Minimax — or play 2P local.',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};
        let board, turn, gameOver, mode, diff;
        const HUMAN = 'X', AI = 'O';
        const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

        container.innerHTML = `
            <div id="ttt-wrap" style="display:flex;flex-direction:column;align-items:center;gap:1rem">
                <h2 class="g-title">TIC TAC TOE</h2>
                <div id="ttt-menu" class="g-col">
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
                <div id="ttt-board" class="hidden" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:min(80vw,320px);aspect-ratio:1"></div>
                <div id="ttt-status" style="font-size:1.2rem;color:#aaa;min-height:1.5em;text-align:center"></div>
                <button class="g-btn hidden" id="ttt-restart">Play Again</button>
            </div>
        `;

        const boardEl = container.querySelector('#ttt-board');
        const statusEl = container.querySelector('#ttt-status');
        const menuEl = container.querySelector('#ttt-menu');
        const restartBtn = container.querySelector('#ttt-restart');

        function startGame(m, d) {
            mode = m; diff = d || 'hard';
            board = Array(9).fill('');
            turn = HUMAN; gameOver = false;
            menuEl.classList.add('hidden');
            boardEl.classList.remove('hidden');
            boardEl.style.display = 'grid';
            restartBtn.classList.add('hidden');
            renderBoard();
            statusEl.textContent = "X's turn";
        }

        function renderBoard() {
            boardEl.innerHTML = '';
            board.forEach((v, i) => {
                const cell = document.createElement('button');
                cell.style.cssText = 'background:#1a1a35;border:2px solid #333;border-radius:10px;font-size:clamp(2rem,8vw,3.5rem);font-weight:700;cursor:pointer;color:' + (v === 'X' ? '#00e5ff' : '#ff4081') + ';transition:background 0.15s';
                cell.textContent = v;
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
                const empty = board.map((v,i) => v === '' ? i : -1).filter(i => i >= 0);
                idx = empty[Math.floor(Math.random() * empty.length)];
            } else if (diff === 'medium') {
                idx = Math.random() < 0.6 ? bestMove() : (() => {
                    const empty = board.map((v,i) => v === '' ? i : -1).filter(i => i >= 0);
                    return empty[Math.floor(Math.random() * empty.length)];
                })();
            } else {
                idx = bestMove();
            }
            board[idx] = AI;
            renderBoard();
            if (checkEnd()) return;
            turn = HUMAN;
            statusEl.textContent = `${turn}'s turn`;
        }

        function bestMove() {
            let best = -Infinity, move = 0;
            for (let i = 0; i < 9; i++) {
                if (board[i]) continue;
                board[i] = AI;
                const s = minimax(board, false);
                board[i] = '';
                if (s > best) { best = s; move = i; }
            }
            return move;
        }

        function minimax(b, isMax) {
            const w = winner(b);
            if (w === AI) return 1;
            if (w === HUMAN) return -1;
            if (b.every(c => c)) return 0;
            let best = isMax ? -Infinity : Infinity;
            for (let i = 0; i < 9; i++) {
                if (b[i]) continue;
                b[i] = isMax ? AI : HUMAN;
                const s = minimax(b, !isMax);
                b[i] = '';
                best = isMax ? Math.max(best, s) : Math.min(best, s);
            }
            return best;
        }

        function winner(b) {
            for (const [a, bb, c] of WINS) {
                if (b[a] && b[a] === b[bb] && b[bb] === b[c]) return b[a];
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
