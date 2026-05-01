/* ── Chess ────────────────────────────────────── */
App.register({
    id: 'chess',
    title: 'Chess',
    icon: '♟️',
    description: 'Full chess with all rules — castling, en passant, promotion, check & checkmate. Play vs AI or 2P.',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};
        const W = 'w', B = 'b';
        const PIECES = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };

        let board, turn, selected, legalMoves, gameOver, mode;
        let moveHistory, enPassantTarget, castleRights, halfMoveClock, positionHistory;
        let capturedW, capturedB;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem;width:100%">
                <h2 class="g-title">♟️ CHESS</h2>
                <div id="ch-menu" class="g-col">
                    <div class="g-row">
                        <button class="g-btn" id="ch-1p">vs AI</button>
                        <button class="g-btn" id="ch-2p">2 Players</button>
                    </div>
                </div>
                <div id="ch-game" class="hidden" style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
                    <div id="ch-status" style="font-size:1.1rem;color:#aaa;min-height:1.5em;text-align:center;font-weight:600"></div>
                    <div id="ch-captured-b" style="min-height:1.5em;font-size:1.1rem;letter-spacing:2px;color:#aaa"></div>
                    <div id="ch-board" style="display:grid;grid-template-columns:repeat(8,1fr);border:2px solid #555;border-radius:4px;overflow:hidden"></div>
                    <div id="ch-captured-w" style="min-height:1.5em;font-size:1.1rem;letter-spacing:2px;color:#aaa"></div>
                    <div class="g-row" style="margin-top:0.5rem">
                        <button class="g-btn-sm" id="ch-undo">↩ Undo</button>
                        <button class="g-btn-sm" id="ch-new">New Game</button>
                    </div>
                </div>
                <div id="ch-promo" class="hidden" style="position:fixed;inset:0;background:#000a;display:flex;align-items:center;justify-content:center;z-index:500">
                    <div style="background:#1a1a35;border:2px solid #7c4dff;border-radius:12px;padding:1.5rem;display:flex;flex-direction:column;align-items:center;gap:1rem">
                        <div style="color:#ccc;font-weight:700">Promote pawn to:</div>
                        <div class="g-row" id="ch-promo-opts"></div>
                    </div>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#ch-menu');
        const gameEl = container.querySelector('#ch-game');
        const boardEl = container.querySelector('#ch-board');
        const statusEl = container.querySelector('#ch-status');
        const capturedWEl = container.querySelector('#ch-captured-w');
        const capturedBEl = container.querySelector('#ch-captured-b');
        const promoEl = container.querySelector('#ch-promo');
        const promoOpts = container.querySelector('#ch-promo-opts');

        /* ── Piece helpers ─────────────────────── */
        function makePiece(type, color) { return { type, color, moved: false }; }
        function pc(p) { if (!p) return ''; return p.color === W ? PIECES[p.type] : PIECES[p.type.toLowerCase()]; }
        function isColor(p, c) { return p && p.color === c; }
        function opponent(c) { return c === W ? B : W; }

        /* ── Board init ────────────────────────── */
        function initBoard() {
            board = Array.from({ length: 8 }, () => Array(8).fill(null));
            const backRow = ['R','N','B','Q','K','B','N','R'];
            for (let c = 0; c < 8; c++) {
                board[0][c] = makePiece(backRow[c], B);
                board[1][c] = makePiece('P', B);
                board[6][c] = makePiece('P', W);
                board[7][c] = makePiece(backRow[c], W);
            }
            turn = W; selected = null; legalMoves = []; gameOver = false;
            enPassantTarget = null;
            castleRights = { w: { k: true, q: true }, b: { k: true, q: true } };
            moveHistory = [];
            halfMoveClock = 0;
            positionHistory = [];
            capturedW = []; capturedB = [];
        }

        /* ── Render ────────────────────────────── */
        function render() {
            const cellSize = Math.min(Math.floor(Math.min(window.innerWidth * 0.9, 500) / 8), 64);
            boardEl.style.width = (cellSize * 8) + 'px';
            boardEl.style.height = (cellSize * 8) + 'px';
            boardEl.innerHTML = '';

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const cell = document.createElement('div');
                    const isLight = (r + c) % 2 === 0;
                    const isSel = selected && selected[0] === r && selected[1] === c;
                    const isLegal = legalMoves.some(m => m[0] === r && m[1] === c);
                    const isLastMove = moveHistory.length > 0 && (
                        (moveHistory[moveHistory.length - 1].from[0] === r && moveHistory[moveHistory.length - 1].from[1] === c) ||
                        (moveHistory[moveHistory.length - 1].to[0] === r && moveHistory[moveHistory.length - 1].to[1] === c)
                    );

                    let bg = isLight ? '#e8d4a2' : '#b58863';
                    if (isSel) bg = isLight ? '#f6f669' : '#baca44';
                    else if (isLastMove) bg = isLight ? '#f5f682' : '#baca55';

                    cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;display:flex;align-items:center;justify-content:center;font-size:${cellSize * 0.75}px;cursor:pointer;position:relative;background:${bg};user-select:none;`;

                    const p = board[r][c];
                    if (p) {
                        cell.textContent = pc(p);
                        if (p.color === W) cell.style.textShadow = '0 1px 2px #0005';
                        else cell.style.textShadow = '0 1px 2px #fff3';
                    }

                    // Legal move dot
                    if (isLegal) {
                        const dot = document.createElement('div');
                        if (p) {
                            // Capture indicator
                            dot.style.cssText = 'position:absolute;inset:0;border:3px solid #00000044;border-radius:50%;pointer-events:none;';
                        } else {
                            dot.style.cssText = `position:absolute;width:${cellSize * 0.25}px;height:${cellSize * 0.25}px;border-radius:50%;background:#00000033;pointer-events:none;`;
                        }
                        cell.appendChild(dot);
                    }

                    // King in check highlight
                    if (p && p.type === 'K' && p.color === turn && isInCheck(turn)) {
                        cell.style.background = '#e53935';
                    }

                    cell.addEventListener('click', () => onCellClick(r, c));
                    boardEl.appendChild(cell);
                }
            }

            // Captured pieces
            capturedWEl.textContent = capturedW.map(p => PIECES[p.toLowerCase()]).join(' ');
            capturedBEl.textContent = capturedB.map(p => PIECES[p]).join(' ');

            // Status
            if (gameOver) return;
            const inCheck = isInCheck(turn);
            const hasLegal = hasAnyLegalMove(turn);
            if (inCheck && !hasLegal) {
                statusEl.textContent = `Checkmate! ${turn === W ? 'Black' : 'White'} wins!`;
                statusEl.style.color = '#ff4081';
                gameOver = true;
            } else if (!hasLegal) {
                statusEl.textContent = "Stalemate — it's a draw!";
                statusEl.style.color = '#ffeb3b';
                gameOver = true;
            } else if (halfMoveClock >= 100) {
                statusEl.textContent = "Draw — 50-move rule!";
                statusEl.style.color = '#ffeb3b';
                gameOver = true;
            } else if (isThreefold()) {
                statusEl.textContent = "Draw — threefold repetition!";
                statusEl.style.color = '#ffeb3b';
                gameOver = true;
            } else if (insufficientMaterial()) {
                statusEl.textContent = "Draw — insufficient material!";
                statusEl.style.color = '#ffeb3b';
                gameOver = true;
            } else {
                statusEl.textContent = `${turn === W ? 'White' : 'Black'}'s turn${inCheck ? ' — CHECK!' : ''}`;
                statusEl.style.color = inCheck ? '#ff4081' : '#aaa';
            }
        }

        /* ── Click handler ─────────────────────── */
        function onCellClick(r, c) {
            if (gameOver) return;
            if (mode === '1p' && turn === B) return;

            // If a legal move is clicked, execute it
            if (selected && legalMoves.some(m => m[0] === r && m[1] === c)) {
                executeMove(selected, [r, c]);
                return;
            }

            // Select piece
            const p = board[r][c];
            if (p && p.color === turn) {
                selected = [r, c];
                legalMoves = getLegalMoves(r, c);
                render();
            } else {
                selected = null;
                legalMoves = [];
                render();
            }
        }

        /* ── Execute move ──────────────────────── */
        function executeMove(from, to) {
            const [fr, fc] = from;
            const [tr, tc] = to;
            const piece = board[fr][fc];
            const captured = board[tr][tc];
            const hist = {
                from: [fr, fc], to: [tr, tc],
                piece: { ...piece }, captured,
                enPassant: enPassantTarget,
                castleRights: JSON.parse(JSON.stringify(castleRights)),
                halfMoveClock
            };

            // Capture
            if (captured) {
                if (captured.color === W) capturedW.push(captured.type);
                else capturedB.push(captured.type);
                halfMoveClock = 0;
            } else if (piece.type === 'P') {
                halfMoveClock = 0;
            } else {
                halfMoveClock++;
            }

            // En passant capture
            if (piece.type === 'P' && enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1]) {
                const epR = piece.color === W ? tr + 1 : tr - 1;
                const epCaptured = board[epR][tc];
                hist.epCapture = { r: epR, c: tc, piece: epCaptured };
                if (epCaptured.color === W) capturedW.push(epCaptured.type);
                else capturedB.push(epCaptured.type);
                board[epR][tc] = null;
            }

            // Set en passant target
            if (piece.type === 'P' && Math.abs(tr - fr) === 2) {
                enPassantTarget = [(fr + tr) / 2, fc];
            } else {
                enPassantTarget = null;
            }

            // Castling
            if (piece.type === 'K' && Math.abs(tc - fc) === 2) {
                hist.castle = true;
                if (tc > fc) { // Kingside
                    board[fr][5] = board[fr][7];
                    board[fr][7] = null;
                    if (board[fr][5]) board[fr][5].moved = true;
                } else { // Queenside
                    board[fr][3] = board[fr][0];
                    board[fr][0] = null;
                    if (board[fr][3]) board[fr][3].moved = true;
                }
            }

            // Update castle rights
            if (piece.type === 'K') {
                castleRights[piece.color].k = false;
                castleRights[piece.color].q = false;
            }
            if (piece.type === 'R') {
                if (fr === 0 && fc === 0) castleRights.b.q = false;
                if (fr === 0 && fc === 7) castleRights.b.k = false;
                if (fr === 7 && fc === 0) castleRights.w.q = false;
                if (fr === 7 && fc === 7) castleRights.w.k = false;
            }
            // Rook captured
            if (captured && captured.type === 'R') {
                if (tr === 0 && tc === 0) castleRights.b.q = false;
                if (tr === 0 && tc === 7) castleRights.b.k = false;
                if (tr === 7 && tc === 0) castleRights.w.q = false;
                if (tr === 7 && tc === 7) castleRights.w.k = false;
            }

            // Move piece
            board[tr][tc] = piece;
            board[fr][fc] = null;
            piece.moved = true;

            moveHistory.push(hist);

            // Pawn promotion
            if (piece.type === 'P' && (tr === 0 || tr === 7)) {
                if (mode === '1p' && piece.color === B) {
                    // AI always promotes to queen
                    piece.type = 'Q';
                    finishTurn();
                } else {
                    showPromotion(tr, tc, piece);
                    return;
                }
            }

            finishTurn();
        }

        function finishTurn() {
            selected = null;
            legalMoves = [];
            positionHistory.push(boardToString());
            turn = opponent(turn);
            render();

            // AI move
            if (mode === '1p' && turn === B && !gameOver) {
                setTimeout(aiMove, 400);
            }
        }

        /* ── Promotion UI ──────────────────────── */
        function showPromotion(r, c, piece) {
            promoEl.classList.remove('hidden');
            promoEl.style.display = 'flex';
            promoOpts.innerHTML = '';
            const choices = ['Q', 'R', 'B', 'N'];
            choices.forEach(t => {
                const btn = document.createElement('button');
                btn.className = 'g-btn';
                btn.style.cssText = 'font-size:clamp(1.5rem,5vw,2rem);width:clamp(44px,12vw,60px);height:clamp(44px,12vw,60px);display:flex;align-items:center;justify-content:center;';
                const display = piece.color === W ? PIECES[t] : PIECES[t.toLowerCase()];
                btn.textContent = display;
                btn.addEventListener('click', () => {
                    piece.type = t;
                    promoEl.classList.add('hidden');
                    finishTurn();
                });
                promoOpts.appendChild(btn);
            });
        }

        /* ── Undo ──────────────────────────────── */
        function undoMove() {
            if (moveHistory.length === 0 || gameOver) return;
            // Undo AI move too in 1P mode
            const count = mode === '1p' && moveHistory.length >= 2 ? 2 : 1;
            for (let n = 0; n < count; n++) {
                if (moveHistory.length === 0) break;
                const h = moveHistory.pop();
                positionHistory.pop();
                board[h.from[0]][h.from[1]] = h.piece;
                board[h.to[0]][h.to[1]] = h.captured || null;
                enPassantTarget = h.enPassant;
                castleRights = h.castleRights;
                halfMoveClock = h.halfMoveClock;
                // Undo en passant capture
                if (h.epCapture) {
                    board[h.epCapture.r][h.epCapture.c] = h.epCapture.piece;
                    if (h.epCapture.piece.color === W) capturedW.pop();
                    else capturedB.pop();
                }
                // Undo castling
                if (h.castle) {
                    const r = h.from[0];
                    if (h.to[1] > h.from[1]) { // Kingside
                        board[r][7] = board[r][5];
                        board[r][5] = null;
                        if (board[r][7]) board[r][7].moved = false;
                    } else { // Queenside
                        board[r][0] = board[r][3];
                        board[r][3] = null;
                        if (board[r][0]) board[r][0].moved = false;
                    }
                }
                // Undo capture tracking
                if (h.captured) {
                    if (h.captured.color === W) capturedW.pop();
                    else capturedB.pop();
                }
                turn = h.piece.color;
            }
            selected = null; legalMoves = [];
            render();
        }

        /* ── Move generation ───────────────────── */
        function getRawMoves(r, c) {
            const p = board[r][c];
            if (!p) return [];
            const moves = [];
            const col = p.color;
            const dir = col === W ? -1 : 1;

            function addIfValid(tr, tc) {
                if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return;
                const target = board[tr][tc];
                if (target && target.color === col) return;
                moves.push([tr, tc]);
            }

            function addSliding(dirs) {
                for (const [dr, dc] of dirs) {
                    for (let i = 1; i < 8; i++) {
                        const tr = r + dr * i, tc = c + dc * i;
                        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) break;
                        const target = board[tr][tc];
                        if (target) {
                            if (target.color !== col) moves.push([tr, tc]);
                            break;
                        }
                        moves.push([tr, tc]);
                    }
                }
            }

            switch (p.type) {
                case 'P': {
                    // Forward
                    const f1 = r + dir;
                    if (f1 >= 0 && f1 <= 7 && !board[f1][c]) {
                        moves.push([f1, c]);
                        // Double move
                        const startRow = col === W ? 6 : 1;
                        const f2 = r + dir * 2;
                        if (r === startRow && !board[f2][c]) moves.push([f2, c]);
                    }
                    // Captures
                    for (const dc of [-1, 1]) {
                        const tc2 = c + dc;
                        if (tc2 < 0 || tc2 > 7 || f1 < 0 || f1 > 7) continue;
                        const target = board[f1][tc2];
                        if (target && target.color !== col) moves.push([f1, tc2]);
                        // En passant
                        if (enPassantTarget && enPassantTarget[0] === f1 && enPassantTarget[1] === tc2) {
                            moves.push([f1, tc2]);
                        }
                    }
                    break;
                }
                case 'N':
                    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) addIfValid(r+dr, c+dc);
                    break;
                case 'B':
                    addSliding([[-1,-1],[-1,1],[1,-1],[1,1]]);
                    break;
                case 'R':
                    addSliding([[-1,0],[1,0],[0,-1],[0,1]]);
                    break;
                case 'Q':
                    addSliding([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
                    break;
                case 'K':
                    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) addIfValid(r+dr, c+dc);
                    // Castling
                    if (!p.moved) {
                        const cr = castleRights[col];
                        // Kingside
                        if (cr.k && board[r][7] && !board[r][7].moved && !board[r][5] && !board[r][6]) {
                            if (!isSquareAttacked(r, c, opponent(col)) && !isSquareAttacked(r, 5, opponent(col)) && !isSquareAttacked(r, 6, opponent(col))) {
                                moves.push([r, 6]);
                            }
                        }
                        // Queenside
                        if (cr.q && board[r][0] && !board[r][0].moved && !board[r][1] && !board[r][2] && !board[r][3]) {
                            if (!isSquareAttacked(r, c, opponent(col)) && !isSquareAttacked(r, 3, opponent(col)) && !isSquareAttacked(r, 2, opponent(col))) {
                                moves.push([r, 2]);
                            }
                        }
                    }
                    break;
            }
            return moves;
        }

        function getLegalMoves(r, c) {
            const p = board[r][c];
            if (!p) return [];
            const raw = getRawMoves(r, c);
            return raw.filter(([tr, tc]) => {
                // Simulate move and check if king is still safe
                const captured = board[tr][tc];
                const orig = board[r][c];

                // En passant capture simulation
                let epCaptured = null, epR = -1;
                if (orig.type === 'P' && enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1]) {
                    epR = orig.color === W ? tr + 1 : tr - 1;
                    epCaptured = board[epR][tc];
                    board[epR][tc] = null;
                }

                board[tr][tc] = orig;
                board[r][c] = null;

                // Castling rook simulation
                let rookMoved = null;
                if (orig.type === 'K' && Math.abs(tc - c) === 2) {
                    if (tc > c) { board[r][5] = board[r][7]; board[r][7] = null; rookMoved = { from: 7, to: 5 }; }
                    else { board[r][3] = board[r][0]; board[r][0] = null; rookMoved = { from: 0, to: 3 }; }
                }

                const safe = !isInCheck(orig.color);

                // Undo
                board[r][c] = orig;
                board[tr][tc] = captured;
                if (epCaptured !== null) board[epR][tc] = epCaptured;
                if (rookMoved) { board[r][rookMoved.from] = board[r][rookMoved.to]; board[r][rookMoved.to] = null; }

                return safe;
            });
        }

        function hasAnyLegalMove(color) {
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                if (board[r][c] && board[r][c].color === color && getLegalMoves(r, c).length > 0) return true;
            }
            return false;
        }

        /* ── Check detection ───────────────────── */
        function findKing(color) {
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                if (board[r][c] && board[r][c].type === 'K' && board[r][c].color === color) return [r, c];
            }
            return null;
        }

        function isSquareAttacked(r, c, byColor) {
            for (let rr = 0; rr < 8; rr++) for (let cc = 0; cc < 8; cc++) {
                const p = board[rr][cc];
                if (!p || p.color !== byColor) continue;
                const moves = getRawMoves(rr, cc);
                if (moves.some(m => m[0] === r && m[1] === c)) return true;
            }
            return false;
        }

        function isInCheck(color) {
            const king = findKing(color);
            if (!king) return false;
            return isSquareAttacked(king[0], king[1], opponent(color));
        }

        /* ── Draw detection ────────────────────── */
        function boardToString() {
            let s = '';
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                s += p ? (p.color + p.type) : '--';
            }
            return s + turn;
        }

        function isThreefold() {
            const current = boardToString();
            let count = 0;
            for (const pos of positionHistory) if (pos === current) count++;
            return count >= 2; // current will be 3rd
        }

        function insufficientMaterial() {
            const pieces = [];
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                if (board[r][c]) pieces.push(board[r][c]);
            }
            if (pieces.length === 2) return true; // K vs K
            if (pieces.length === 3) {
                const nonKing = pieces.find(p => p.type !== 'K');
                if (nonKing && (nonKing.type === 'B' || nonKing.type === 'N')) return true;
            }
            if (pieces.length === 4) {
                const bishops = pieces.filter(p => p.type === 'B');
                if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
                    // Check if same colored squares
                    const pos = [];
                    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                        if (board[r][c] && board[r][c].type === 'B') pos.push((r + c) % 2);
                    }
                    if (pos[0] === pos[1]) return true;
                }
            }
            return false;
        }

        /* ── AI ─────────────────────────────────── */
        const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

        function evaluate() {
            let score = 0;
            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p) continue;
                const val = PIECE_VALUES[p.type];
                // Positional bonus: center control
                const centerBonus = (3.5 - Math.abs(c - 3.5)) * 5 + (3.5 - Math.abs(r - 3.5)) * 3;
                const total = val + centerBonus;
                score += p.color === B ? total : -total;
            }
            return score;
        }

        function aiMove() {
            if (gameOver) return;
            let bestScore = -Infinity;
            let bestFrom = null, bestTo = null;
            const allMoves = [];

            for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                if (!board[r][c] || board[r][c].color !== B) continue;
                const moves = getLegalMoves(r, c);
                for (const m of moves) allMoves.push({ from: [r, c], to: m });
            }

            if (allMoves.length === 0) return;

            for (const move of allMoves) {
                const [fr, fc] = move.from;
                const [tr, tc] = move.to;
                const piece = board[fr][fc];
                const captured = board[tr][tc];

                // Simulate
                board[tr][tc] = piece;
                board[fr][fc] = null;

                let score = evaluate();
                // Bonus for captures
                if (captured) score += PIECE_VALUES[captured.type] * 2;
                // Bonus for checks
                if (isInCheck(W)) score += 50;
                // Small randomness
                score += Math.random() * 30;

                // Undo
                board[fr][fc] = piece;
                board[tr][tc] = captured;

                if (score > bestScore) {
                    bestScore = score;
                    bestFrom = move.from;
                    bestTo = move.to;
                }
            }

            if (bestFrom) {
                selected = bestFrom;
                executeMove(bestFrom, bestTo);
            }
        }

        /* ── Start game ────────────────────────── */
        function startGame(m) {
            mode = m;
            initBoard();
            menuEl.classList.add('hidden');
            gameEl.classList.remove('hidden');
            gameEl.style.display = 'flex';
            render();
        }

        /* ── Events ────────────────────────────── */
        container.querySelector('#ch-1p').addEventListener('click', () => startGame('1p'));
        container.querySelector('#ch-2p').addEventListener('click', () => startGame('2p'));
        container.querySelector('#ch-undo').addEventListener('click', undoMove);
        container.querySelector('#ch-new').addEventListener('click', () => {
            gameEl.classList.add('hidden');
            menuEl.classList.remove('hidden');
            promoEl.classList.add('hidden');
        });

        s._onResize = () => { if (!gameOver || gameEl.style.display !== 'none') render(); };
        window.addEventListener('resize', s._onResize);
    },

    destroy() {
        const s = this._state; if (!s) return;
        window.removeEventListener('resize', s._onResize);
        this._state = null;
    }
});
