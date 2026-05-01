/* ── Ludo (2–4 players) ──────────────────────── */
App.register({
    id: 'ludo',
    title: 'Ludo',
    icon: '🎲',
    description: 'Classic Ludo — roll dice, race tokens home! 2–4 players + AI.',
    tag: 'Classic',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = {};

        const COLORS = ['red', 'green', 'yellow', 'blue'];
        const COLOR_HEX = { red: '#e53935', green: '#43a047', yellow: '#fdd835', blue: '#1e88e5' };
        const COLOR_LIGHT = { red: '#ffcdd2', green: '#c8e6c9', yellow: '#fff9c4', blue: '#bbdefb' };
        const PATH_LEN = 52;
        const HOME_LEN = 6;
        const TOKENS_PER_PLAYER = 4;

        // Start positions on the 52-cell circular path for each color
        const START_POS = { red: 0, green: 13, yellow: 26, blue: 39 };
        // Entry to home path (the cell BEFORE entering home column)
        const HOME_ENTRY = { red: 50, green: 11, yellow: 24, blue: 37 };
        // Safe cells (star positions)
        const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

        let players, currentPlayer, dice, diceRolled, rolling, won, numPlayers;
        let chosenColor = 0;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem">
                <h2 class="g-title">🎲 LUDO</h2>
                <div id="lu-menu" class="g-col">
                    <span class="g-info">Choose Your Color</span>
                    <div class="g-row" id="lu-colors"></div>
                    <span class="g-info" style="margin-top:0.5rem">Number of Players</span>
                    <div class="g-row">
                        <button class="g-btn lu-np" data-n="2">2 Players</button>
                        <button class="g-btn lu-np" data-n="3">3 Players</button>
                        <button class="g-btn lu-np" data-n="4">4 Players</button>
                    </div>
                </div>
                <div id="lu-game" class="hidden" style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
                    <div id="lu-status" style="font-size:1.1rem;color:#aaa;min-height:1.5em;text-align:center;font-weight:600"></div>
                    <canvas id="lu-canvas" style="border-radius:8px;display:block;cursor:pointer"></canvas>
                    <div class="g-row" style="align-items:center;gap:1rem">
                        <button class="g-btn" id="lu-roll" style="font-size:1.2rem;min-width:120px">🎲 Roll</button>
                        <div id="lu-dice" style="font-size:2.5rem;min-width:50px;text-align:center"></div>
                    </div>
                    <button class="g-btn-sm" id="lu-new" style="margin-top:0.25rem">New Game</button>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#lu-menu');
        const gameEl = container.querySelector('#lu-game');
        const canvas = container.querySelector('#lu-canvas');
        const ctx = canvas.getContext('2d');
        const statusEl = container.querySelector('#lu-status');
        const rollBtn = container.querySelector('#lu-roll');
        const diceEl = container.querySelector('#lu-dice');

        const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

        /* ── Board geometry ─────────────────────── */
        // The board is drawn on a 15x15 grid
        // Each cell is cellSize px
        function getCellSize() { return Math.min(Math.floor(Math.min(window.innerWidth * 0.85, 480) / 15), 32); }

        // Map path position (0-51) to board grid (col, row)
        // Standard Ludo path coordinates (15x15 grid, 0-indexed)
        const PATH_COORDS = [];
        function buildPathCoords() {
            PATH_COORDS.length = 0;
            // Bottom-left to right (red start area)
            // Path goes: red side → green side → yellow side → blue side
            // We define the 52 cells manually in order
            const coords = [
                // Red start going up: col 6, rows 13→9
                [6,13],[6,12],[6,11],[6,10],[6,9],
                // Turn right: row 8, cols 5→0
                [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
                // Turn down: col 0→0 row 7→6
                [0,7],[0,6],
                // Green start going right: row 6, cols 1→5
                [1,6],[2,6],[3,6],[4,6],[5,6],
                // Turn down: col 6, rows 5→0
                [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
                // Turn right: row 0, cols 7→8
                [7,0],[8,0],
                // Yellow start going down: col 8, rows 1→5
                [8,1],[8,2],[8,3],[8,4],[8,5],
                // Turn left: row 6, cols 9→14
                [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
                // Turn down: col 14, rows 7→8
                [14,7],[14,8],
                // Blue start going left: row 8, cols 13→9
                [13,8],[12,8],[11,8],[10,8],[9,8],
                // Turn up: col 8, rows 9→14
                [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
                // Turn left: row 14, cols 7→6
                [7,14],[6,14]
            ];
            coords.forEach(c => PATH_COORDS.push(c));
        }

        // Home paths (6 cells each going toward center)
        const HOME_COORDS = {
            red:    [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
            green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
            yellow: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
            blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
        };

        // Home base areas (where tokens wait before entering)
        const BASE_POSITIONS = {
            red:    [[2,11],[4,11],[2,13],[4,13]],
            green:  [[2,2],[4,2],[2,4],[4,4]],
            yellow: [[11,2],[13,2],[11,4],[13,4]],
            blue:   [[11,11],[13,11],[11,13],[13,13]]
        };

        /* ── Game init ──────────────────────────── */
        // Build color picker
        const luColorsEl = container.querySelector('#lu-colors');
        COLORS.forEach((color, i) => {
            const btn = document.createElement('button');
            btn.style.cssText = `width:clamp(36px,9vw,44px);height:clamp(36px,9vw,44px);border-radius:50%;background:${COLOR_HEX[color]};border:3px solid ${i === 0 ? '#fff' : '#333'};cursor:pointer;transition:border-color 0.2s,transform 0.15s;`;
            btn.title = color.charAt(0).toUpperCase() + color.slice(1);
            btn.addEventListener('click', () => {
                chosenColor = i;
                luColorsEl.querySelectorAll('button').forEach((b, j) => b.style.borderColor = j === i ? '#fff' : '#333');
            });
            luColorsEl.appendChild(btn);
        });

        function startGame(np) {
            numPlayers = np;
            buildPathCoords();
            players = [];
            // Build ordered color list with chosen color first
            const colorOrder = [chosenColor];
            for (let i = 0; i < COLORS.length && colorOrder.length < np; i++) {
                if (i !== chosenColor) colorOrder.push(i);
            }
            colorOrder.forEach((ci, pi) => {
                const color = COLORS[ci];
                const tokens = [];
                for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
                    tokens.push({ pos: -1, homePos: -1, finished: false });
                }
                players.push({ color, tokens, isHuman: pi === 0 });
            });
            currentPlayer = 0;
            dice = 0; diceRolled = false; rolling = false; won = false;

            const cs = getCellSize();
            canvas.width = canvas.height = cs * 15;

            menuEl.classList.add('hidden');
            gameEl.classList.remove('hidden');
            gameEl.style.display = 'flex';
            rollBtn.disabled = false;

            updateStatus();
            draw();
        }

        function updateStatus() {
            const p = players[currentPlayer];
            const name = p.isHuman ? 'Your' : `${p.color.charAt(0).toUpperCase() + p.color.slice(1)}'s`;
            statusEl.textContent = `${name} turn`;
            statusEl.style.color = COLOR_HEX[p.color];
        }

        /* ── Drawing ────────────────────────────── */
        function draw() {
            const cs = getCellSize();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Background
            ctx.fillStyle = '#f5f0e0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Color quadrants
            drawQuadrant(0, 0, 6, 6, 'green', cs);
            drawQuadrant(9, 0, 6, 6, 'yellow', cs);
            drawQuadrant(0, 9, 6, 6, 'red', cs);
            drawQuadrant(9, 9, 6, 6, 'blue', cs);

            // Center home
            ctx.fillStyle = '#fff';
            ctx.fillRect(6 * cs, 6 * cs, 3 * cs, 3 * cs);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(6 * cs, 6 * cs, 3 * cs, 3 * cs);

            // Draw center triangles
            const cx = 7.5 * cs, cy = 7.5 * cs;
            [['red', [6,9,7.5], [9,9,7.5], 'y'], ['green', [6,6,7.5], [6,9,7.5], 'x'],
             ['yellow', [6,6,7.5], [9,6,7.5], 'y'], ['blue', [9,6,7.5], [9,9,7.5], 'x']].forEach(([color, xs, ys]) => {
                ctx.fillStyle = COLOR_HEX[color] + '88';
                ctx.beginPath();
                ctx.moveTo(xs[0] * cs, ys[0] * cs);
                ctx.lineTo(xs[1] * cs, ys[1] * cs);
                ctx.lineTo(xs[2] * cs, ys[2] * cs);
                ctx.closePath();
                ctx.fill();
            });

            // Path cells
            PATH_COORDS.forEach((coord, i) => {
                const [col, row] = coord;
                const isSafe = SAFE_CELLS.includes(i);
                ctx.fillStyle = isSafe ? '#fff8e1' : '#fff';

                // Color start cells
                if (i === START_POS.red) ctx.fillStyle = COLOR_LIGHT.red;
                else if (i === START_POS.green) ctx.fillStyle = COLOR_LIGHT.green;
                else if (i === START_POS.yellow) ctx.fillStyle = COLOR_LIGHT.yellow;
                else if (i === START_POS.blue) ctx.fillStyle = COLOR_LIGHT.blue;

                ctx.fillRect(col * cs, row * cs, cs, cs);
                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(col * cs, row * cs, cs, cs);

                if (isSafe) {
                    ctx.fillStyle = '#ff980044';
                    ctx.font = `${cs * 0.5}px sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('★', col * cs + cs / 2, row * cs + cs / 2);
                }
            });

            // Home paths
            for (const color of COLORS.slice(0, numPlayers)) {
                HOME_COORDS[color].forEach(([col, row]) => {
                    ctx.fillStyle = COLOR_LIGHT[color];
                    ctx.fillRect(col * cs, row * cs, cs, cs);
                    ctx.strokeStyle = COLOR_HEX[color] + '66';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(col * cs, row * cs, cs, cs);
                });
            }

            // Base token positions
            for (const color of COLORS.slice(0, numPlayers)) {
                BASE_POSITIONS[color].forEach(([col, row]) => {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(col * cs + cs / 2, row * cs + cs / 2, cs * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = COLOR_HEX[color];
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            }

            // Draw tokens
            players.forEach((player, pi) => {
                player.tokens.forEach((token, ti) => {
                    let cx, cy;
                    if (token.finished) {
                        // In center
                        const offsets = [[0.3,0.3],[0.7,0.3],[0.3,0.7],[0.7,0.7]];
                        cx = (6 + offsets[ti][0] * 3) * cs;
                        cy = (6 + offsets[ti][1] * 3) * cs;
                    } else if (token.pos === -1) {
                        // In base
                        const [col, row] = BASE_POSITIONS[player.color][ti];
                        cx = col * cs + cs / 2;
                        cy = row * cs + cs / 2;
                    } else if (token.homePos >= 0) {
                        // On home path
                        const [col, row] = HOME_COORDS[player.color][token.homePos];
                        cx = col * cs + cs / 2;
                        cy = row * cs + cs / 2;
                    } else {
                        // On main path
                        const [col, row] = PATH_COORDS[token.pos];
                        cx = col * cs + cs / 2;
                        cy = row * cs + cs / 2;
                    }

                    // Slight offset if multiple tokens on same cell
                    const sameCell = player.tokens.filter((t2, i2) => {
                        if (i2 >= ti) return false;
                        return getTokenCoords(player, t2, pi).join() === [cx, cy].join();
                    }).length;
                    cx += sameCell * 4;
                    cy += sameCell * 2;

                    drawToken(cx, cy, player.color, cs, pi === currentPlayer && diceRolled && canMoveToken(player, token));
                });
            });
        }

        function getTokenCoords(player, token, pi) {
            const cs = getCellSize();
            if (token.finished) return [(6 + 1.5) * cs, (6 + 1.5) * cs];
            if (token.pos === -1) { const [c, r] = BASE_POSITIONS[player.color][0]; return [c * cs, r * cs]; }
            if (token.homePos >= 0) { const [c, r] = HOME_COORDS[player.color][token.homePos]; return [c * cs, r * cs]; }
            const [c, r] = PATH_COORDS[token.pos]; return [c * cs, r * cs];
        }

        function drawQuadrant(x, y, w, h, color, cs) {
            ctx.fillStyle = COLOR_HEX[color] + '44';
            ctx.fillRect(x * cs, y * cs, w * cs, h * cs);
            ctx.strokeStyle = COLOR_HEX[color];
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cs, y * cs, w * cs, h * cs);
        }

        function drawToken(cx, cy, color, cs, highlight) {
            // Shadow
            ctx.fillStyle = '#00000033';
            ctx.beginPath();
            ctx.arc(cx + 1, cy + 2, cs * 0.33, 0, Math.PI * 2);
            ctx.fill();

            // Token body
            ctx.fillStyle = COLOR_HEX[color];
            ctx.beginPath();
            ctx.arc(cx, cy, cs * 0.33, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = '#ffffff55';
            ctx.beginPath();
            ctx.arc(cx - cs * 0.08, cy - cs * 0.1, cs * 0.12, 0, Math.PI * 2);
            ctx.fill();

            // Highlight ring for movable tokens
            if (highlight) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, cs * 0.38, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = COLOR_HEX[color];
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(cx, cy, cs * 0.42, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        /* ── Movement logic ─────────────────────── */
        function canMoveToken(player, token) {
            if (token.finished) return false;
            if (token.pos === -1) return dice === 6;
            if (token.homePos >= 0) {
                const newHome = token.homePos + dice;
                return newHome <= HOME_LEN - 1;
            }
            return true;
        }

        function moveToken(player, token) {
            if (!canMoveToken(player, token)) return false;

            if (token.pos === -1 && dice === 6) {
                // Enter the board
                token.pos = START_POS[player.color];
                captureAt(player, token.pos);
                return true;
            }

            if (token.homePos >= 0) {
                // Move within home path
                const newHome = token.homePos + dice;
                if (newHome === HOME_LEN - 1) {
                    token.finished = true;
                    token.homePos = -1;
                } else {
                    token.homePos = newHome;
                }
                return true;
            }

            // Normal movement on the main path
            let newPos = token.pos;
            for (let step = 0; step < dice; step++) {
                // Check if entering home path
                if (newPos === HOME_ENTRY[player.color] && step < dice) {
                    const remaining = dice - step - 1;
                    if (remaining <= HOME_LEN - 1) {
                        if (remaining === HOME_LEN - 1) {
                            token.finished = true;
                        } else {
                            token.homePos = remaining;
                        }
                        token.pos = -1;
                        return true;
                    }
                }
                newPos = (newPos + 1) % PATH_LEN;
            }

            token.pos = newPos;
            captureAt(player, newPos);
            return true;
        }

        function captureAt(player, pos) {
            if (SAFE_CELLS.includes(pos)) return;
            players.forEach(p => {
                if (p.color === player.color) return;
                p.tokens.forEach(t => {
                    if (t.pos === pos && t.homePos < 0 && !t.finished) {
                        t.pos = -1; // Send back to base
                    }
                });
            });
        }

        function hasAnyMove(player) {
            return player.tokens.some(t => canMoveToken(player, t));
        }

        function checkWin(player) {
            return player.tokens.every(t => t.finished);
        }

        /* ── Dice ───────────────────────────────── */
        function rollDice() {
            if (rolling || diceRolled || won) return;
            rolling = true;
            rollBtn.disabled = true;

            let count = 0;
            const animInterval = setInterval(() => {
                dice = Math.floor(Math.random() * 6) + 1;
                diceEl.textContent = DICE_FACES[dice];
                count++;
                if (count >= 10) {
                    clearInterval(animInterval);
                    rolling = false;
                    diceRolled = true;

                    const player = players[currentPlayer];
                    if (!hasAnyMove(player)) {
                        statusEl.textContent = `${player.color} — no moves, skipping`;
                        setTimeout(() => nextTurn(false), 800);
                    } else if (!player.isHuman) {
                        setTimeout(() => aiChooseToken(), 600);
                    } else {
                        statusEl.textContent = `Rolled ${dice} — click a token to move`;
                        draw();
                    }
                }
            }, 80);
        }

        /* ── Token click ────────────────────────── */
        canvas.addEventListener('click', (e) => {
            if (won || !diceRolled) return;
            const player = players[currentPlayer];
            if (!player.isHuman) return;

            const rect = canvas.getBoundingClientRect();
            const cs = getCellSize();
            const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (canvas.height / rect.height);

            // Find closest movable token
            let bestToken = null, bestDist = Infinity;
            player.tokens.forEach((token, ti) => {
                if (!canMoveToken(player, token)) return;
                let tx, ty;
                if (token.pos === -1) {
                    const [col, row] = BASE_POSITIONS[player.color][ti];
                    tx = col * cs + cs / 2; ty = row * cs + cs / 2;
                } else if (token.homePos >= 0) {
                    const [col, row] = HOME_COORDS[player.color][token.homePos];
                    tx = col * cs + cs / 2; ty = row * cs + cs / 2;
                } else {
                    const [col, row] = PATH_COORDS[token.pos];
                    tx = col * cs + cs / 2; ty = row * cs + cs / 2;
                }
                const dist = Math.sqrt((mx - tx) ** 2 + (my - ty) ** 2);
                if (dist < cs && dist < bestDist) { bestDist = dist; bestToken = token; }
            });

            if (bestToken) {
                moveToken(player, bestToken);
                if (checkWin(player)) { endGame(player); return; }
                draw();
                setTimeout(() => nextTurn(dice === 6), 400);
            }
        });

        /* ── AI ──────────────────────────────────── */
        function aiChooseToken() {
            const player = players[currentPlayer];
            const movable = player.tokens.filter(t => canMoveToken(player, t));
            if (movable.length === 0) { nextTurn(false); return; }

            // Simple AI: prioritize captures, then entering, then advance
            let best = movable[0];
            let bestScore = -1;
            movable.forEach(t => {
                let score = 0;
                if (t.pos === -1 && dice === 6) score = 50; // Entering
                else {
                    const newPos = (t.pos + dice) % PATH_LEN;
                    // Check for capture
                    players.forEach(p => {
                        if (p.color === player.color) return;
                        p.tokens.forEach(ot => {
                            if (ot.pos === newPos && !SAFE_CELLS.includes(newPos)) score = 80;
                        });
                    });
                    // Approaching home
                    if (t.homePos >= 0) score += 60;
                    // Further along is better
                    score += t.pos >= 0 ? t.pos : 0;
                }
                if (score > bestScore) { bestScore = score; best = t; }
            });

            moveToken(player, best);
            if (checkWin(player)) { endGame(player); return; }
            draw();
            setTimeout(() => nextTurn(dice === 6), 400);
        }

        function nextTurn(extraTurn) {
            if (won) return;
            diceRolled = false;
            if (!extraTurn) {
                currentPlayer = (currentPlayer + 1) % numPlayers;
            }
            rollBtn.disabled = false;
            updateStatus();
            draw();

            // Auto-roll for AI
            if (!players[currentPlayer].isHuman) {
                setTimeout(rollDice, 600);
            }
        }

        function endGame(winner) {
            won = true;
            const name = winner.isHuman ? 'You win' : `${winner.color.charAt(0).toUpperCase() + winner.color.slice(1)} wins`;
            statusEl.textContent = `🎉 ${name}!`;
            statusEl.style.color = COLOR_HEX[winner.color];
            rollBtn.disabled = true;
            draw();
        }

        /* ── Events ─────────────────────────────── */
        rollBtn.addEventListener('click', rollDice);
        container.querySelector('#lu-new').addEventListener('click', () => {
            gameEl.classList.add('hidden');
            menuEl.classList.remove('hidden');
        });
        container.querySelector('#lu-menu').addEventListener('click', e => {
            const btn = e.target.closest('.lu-np');
            if (btn) startGame(parseInt(btn.dataset.n));
        });
    },

    destroy() { this._state = null; }
});
