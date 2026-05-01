/* ── Snake & Ladder ───────────────────────────── */
App.register({
    id: 'snake-ladder',
    title: 'Snake & Ladder',
    icon: '🐍🪜',
    description: 'Classic board game — roll dice, climb ladders, dodge snakes! 2–4 players.',
    tag: 'Classic',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = {};

        const BOARD_SIZE = 10;
        const TOTAL = 100;
        const COLOR_HEX = ['#e53935','#1e88e5','#43a047','#fdd835'];
        const COLOR_NAME = ['Red','Blue','Green','Yellow'];

        // Snakes (head → tail) and Ladders (bottom → top)
        const SNAKES = { 16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78 };
        const LADDERS = { 1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:100 };
        const MOVES = { ...SNAKES, ...LADDERS };

        let players, currentPlayer, dice, rolling, won, numPlayers, animating;
        let chosenColor = 0;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem">
                <h2 class="g-title">🐍🪜 SNAKE & LADDER</h2>
                <div id="sl-menu" class="g-col">
                    <span class="g-info">Choose Your Color</span>
                    <div class="g-row" id="sl-colors"></div>
                    <span class="g-info" style="margin-top:0.5rem">Players</span>
                    <div class="g-row">
                        <button class="g-btn sl-np" data-n="2">2 Players</button>
                        <button class="g-btn sl-np" data-n="3">3 Players</button>
                        <button class="g-btn sl-np" data-n="4">4 Players</button>
                    </div>
                </div>
                <div id="sl-game" class="hidden" style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
                    <div id="sl-status" style="font-size:clamp(0.9rem,2.5vw,1.1rem);color:#aaa;min-height:1.5em;text-align:center;font-weight:600"></div>
                    <div style="display:flex;gap:clamp(8px,2vw,16px);align-items:flex-start;flex-wrap:wrap;justify-content:center">
                        <canvas id="sl-canvas" style="border-radius:8px;display:block;cursor:pointer"></canvas>
                        <!-- Player info panel -->
                        <div id="sl-players" style="display:flex;flex-direction:column;gap:6px;min-width:clamp(90px,20vw,140px)"></div>
                    </div>
                    <div class="g-row" style="align-items:center;gap:1rem">
                        <button class="g-btn" id="sl-roll" style="font-size:clamp(1rem,3vw,1.2rem);min-width:clamp(100px,25vw,130px)">🎲 Roll</button>
                        <div id="sl-dice" style="font-size:clamp(2rem,6vw,2.5rem);min-width:clamp(40px,10vw,50px);text-align:center"></div>
                    </div>
                    <button class="g-btn-sm" id="sl-new">New Game</button>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#sl-menu');
        const gameEl = container.querySelector('#sl-game');
        const canvas = container.querySelector('#sl-canvas');
        const ctx = canvas.getContext('2d');
        const statusEl = container.querySelector('#sl-status');
        const rollBtn = container.querySelector('#sl-roll');
        const diceEl = container.querySelector('#sl-dice');
        const playersEl = container.querySelector('#sl-players');

        const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

        function getCellSize() {
            return Math.min(Math.floor(Math.min(window.innerWidth * 0.9, 520) / BOARD_SIZE), 50);
        }

        /* ── Position helpers ──────────────────── */
        function cellToXY(cell) {
            if (cell < 1) return { x: 0, y: 9 };
            const row = Math.floor((cell - 1) / 10);
            let col = (cell - 1) % 10;
            if (row % 2 === 1) col = 9 - col;
            return { x: col, y: 9 - row };
        }

        /* ── Init ──────────────────────────────── */
        // Build color picker
        const slColorsEl = container.querySelector('#sl-colors');
        COLOR_HEX.forEach((hex, i) => {
            const btn = document.createElement('button');
            btn.style.cssText = `width:clamp(36px,9vw,44px);height:clamp(36px,9vw,44px);border-radius:50%;background:${hex};border:3px solid ${i === 0 ? '#fff' : '#333'};cursor:pointer;transition:border-color 0.2s,transform 0.15s;`;
            btn.title = COLOR_NAME[i];
            btn.addEventListener('click', () => {
                chosenColor = i;
                slColorsEl.querySelectorAll('button').forEach((b, j) => b.style.borderColor = j === i ? '#fff' : '#333');
            });
            slColorsEl.appendChild(btn);
        });

        function startGame(np) {
            numPlayers = np;
            players = [];
            const colorOrder = [chosenColor];
            for (let i = 0; i < COLOR_HEX.length && colorOrder.length < np; i++) {
                if (i !== chosenColor) colorOrder.push(i);
            }
            for (let i = 0; i < np; i++) {
                const ci = colorOrder[i];
                players.push({ pos: 0, color: COLOR_HEX[ci], name: COLOR_NAME[ci], isHuman: i === 0 });
            }
            currentPlayer = 0; dice = 0; rolling = false; won = false; animating = false;

            const cs = getCellSize();
            canvas.width = canvas.height = cs * BOARD_SIZE;

            menuEl.classList.add('hidden');
            gameEl.classList.remove('hidden');
            gameEl.style.display = 'flex';
            rollBtn.disabled = false;

            updateStatus();
            draw();
        }

        function updateStatus() {
            const p = players[currentPlayer];
            statusEl.textContent = `${p.name}'s turn — Position: ${p.pos || 'Start'}`;
            statusEl.style.color = p.color;
        }

        /* ── Drawing ───────────────────────────── */
        function draw() {
            const cs = getCellSize();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Board cells
            for (let cell = 1; cell <= TOTAL; cell++) {
                const { x, y } = cellToXY(cell);
                const isEven = (x + y) % 2 === 0;
                ctx.fillStyle = isEven ? '#e8d4a2' : '#d4b896';
                ctx.fillRect(x * cs, y * cs, cs, cs);

                // Cell number
                ctx.fillStyle = '#00000066';
                ctx.font = `${cs * 0.22}px sans-serif`;
                ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                ctx.fillText(cell, x * cs + 2, y * cs + 2);
            }

            // Grid lines
            ctx.strokeStyle = '#00000022';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= BOARD_SIZE; i++) {
                ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, canvas.height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(canvas.width, i * cs); ctx.stroke();
            }

            // Draw ladders
            ctx.lineWidth = cs * 0.08;
            for (const [from, to] of Object.entries(LADDERS)) {
                const f = cellToXY(+from);
                const t = cellToXY(+to);
                const fx = f.x * cs + cs / 2, fy = f.y * cs + cs / 2;
                const tx = t.x * cs + cs / 2, ty = t.y * cs + cs / 2;

                // Ladder rails
                const dx = tx - fx, dy = ty - fy;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len * cs * 0.15, ny = dx / len * cs * 0.15;

                ctx.strokeStyle = '#8B4513cc';
                ctx.beginPath(); ctx.moveTo(fx + nx, fy + ny); ctx.lineTo(tx + nx, ty + ny); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(fx - nx, fy - ny); ctx.lineTo(tx - nx, ty - ny); ctx.stroke();

                // Rungs
                ctx.lineWidth = cs * 0.04;
                ctx.strokeStyle = '#A0522Daa';
                const steps = Math.max(3, Math.floor(len / (cs * 0.5)));
                for (let s = 1; s < steps; s++) {
                    const t2 = s / steps;
                    const rx = fx + dx * t2, ry = fy + dy * t2;
                    ctx.beginPath(); ctx.moveTo(rx + nx, ry + ny); ctx.lineTo(rx - nx, ry - ny); ctx.stroke();
                }
                ctx.lineWidth = cs * 0.08;
            }

            // Draw snakes — smooth sinusoidal bodies
            const snakeColors = [
                { body: '#4caf50', belly: '#81c784', dark: '#2e7d32' },
                { body: '#e53935', belly: '#ef9a9a', dark: '#b71c1c' },
                { body: '#ff9800', belly: '#ffcc80', dark: '#e65100' },
                { body: '#9c27b0', belly: '#ce93d8', dark: '#6a1b9a' },
                { body: '#00bcd4', belly: '#80deea', dark: '#00838f' },
                { body: '#795548', belly: '#bcaaa4', dark: '#4e342e' },
                { body: '#e91e63', belly: '#f48fb1', dark: '#ad1457' },
                { body: '#3f51b5', belly: '#9fa8da', dark: '#283593' },
                { body: '#009688', belly: '#80cbc4', dark: '#00695c' },
                { body: '#ff5722', belly: '#ffab91', dark: '#bf360c' },
            ];
            let si = 0;

            // Pre-seed offsets so snakes don't change on every redraw
            if (!s._snakeSeeds) {
                s._snakeSeeds = {};
                for (const from of Object.keys(SNAKES)) {
                    s._snakeSeeds[from] = Math.random() * 0.4 + 0.3;
                }
            }

            for (const [from, to] of Object.entries(SNAKES)) {
                const f = cellToXY(+from);
                const t = cellToXY(+to);
                const fx = f.x * cs + cs / 2, fy = f.y * cs + cs / 2;
                const tx = t.x * cs + cs / 2, ty = t.y * cs + cs / 2;
                const sc = snakeColors[si % snakeColors.length];
                const seed = s._snakeSeeds[from];
                si++;

                const dx = tx - fx, dy = ty - fy;
                const totalLen = Math.sqrt(dx * dx + dy * dy);
                const waveAmp = cs * seed * 1.2;
                const waveFreq = 2.5 + seed;

                // Sample smooth sinusoidal curve
                const NUM_PTS = 40;
                const pts = [];
                for (let i = 0; i <= NUM_PTS; i++) {
                    const frac = i / NUM_PTS;
                    const bx = fx + dx * frac;
                    const by = fy + dy * frac;
                    // Perpendicular direction for wave
                    const perpX = -dy / totalLen;
                    const perpY = dx / totalLen;
                    // Sinusoidal offset, tapered at head and tail
                    const taper = Math.sin(frac * Math.PI);
                    const wave = Math.sin(frac * Math.PI * waveFreq) * waveAmp * taper;
                    pts.push({ x: bx + perpX * wave, y: by + perpY * wave });
                }

                // Draw body — outline first, then body, then belly stripe
                for (let pass = 0; pass < 3; pass++) {
                    ctx.beginPath();
                    ctx.moveTo(pts[0].x, pts[0].y);
                    for (let i = 1; i < pts.length - 1; i++) {
                        const cpx = (pts[i].x + pts[i + 1].x) / 2;
                        const cpy = (pts[i].y + pts[i + 1].y) / 2;
                        ctx.quadraticCurveTo(pts[i].x, pts[i].y, cpx, cpy);
                    }
                    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);

                    if (pass === 0) {
                        ctx.strokeStyle = sc.dark;
                        ctx.lineWidth = cs * 0.18;
                    } else if (pass === 1) {
                        ctx.strokeStyle = sc.body;
                        ctx.lineWidth = cs * 0.14;
                    } else {
                        ctx.strokeStyle = sc.belly;
                        ctx.lineWidth = cs * 0.05;
                    }
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                }

                // Spots/pattern along body
                ctx.fillStyle = sc.dark + '55';
                for (let i = 4; i < pts.length - 4; i += 5) {
                    ctx.beginPath();
                    ctx.arc(pts[i].x, pts[i].y, cs * 0.04, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Head — oval shape pointing toward body
                const headR = cs * 0.2;
                const h1 = pts[0], h2 = pts[2];
                const headAngle = Math.atan2(h2.y - h1.y, h2.x - h1.x);

                ctx.save();
                ctx.translate(h1.x, h1.y);
                ctx.rotate(headAngle);

                // Head shape (wider oval)
                ctx.fillStyle = sc.body;
                ctx.beginPath();
                ctx.ellipse(0, 0, headR * 1.2, headR * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = sc.dark;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Eyes — positioned on top of head
                const eyeY = -headR * 0.35;
                const eyeX = headR * 0.4;
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(-eyeX, eyeY, headR * 0.28, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeX, eyeY, headR * 0.28, 0, Math.PI * 2); ctx.fill();
                // Pupils
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(-eyeX + 1, eyeY, headR * 0.14, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eyeX + 1, eyeY, headR * 0.14, 0, Math.PI * 2); ctx.fill();

                // Forked tongue
                ctx.strokeStyle = '#f44336';
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                const tongueLen = headR * 1.2;
                ctx.beginPath();
                ctx.moveTo(headR * 1.1, 0);
                ctx.lineTo(headR * 1.1 + tongueLen, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(headR * 1.1 + tongueLen, 0);
                ctx.lineTo(headR * 1.1 + tongueLen + 4, -3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(headR * 1.1 + tongueLen, 0);
                ctx.lineTo(headR * 1.1 + tongueLen + 4, 3);
                ctx.stroke();

                ctx.restore();

                // Tail tip — tapers to a point
                const tl = pts.length - 1;
                const t2 = pts.length - 3;
                const tailAngle = Math.atan2(pts[tl].y - pts[t2].y, pts[tl].x - pts[t2].x);
                ctx.fillStyle = sc.body;
                ctx.beginPath();
                ctx.moveTo(pts[tl].x, pts[tl].y);
                ctx.lineTo(pts[tl].x + Math.cos(tailAngle) * cs * 0.2, pts[tl].y + Math.sin(tailAngle) * cs * 0.2);
                ctx.lineTo(pts[tl].x + Math.cos(tailAngle + 0.5) * cs * 0.06, pts[tl].y + Math.sin(tailAngle + 0.5) * cs * 0.06);
                ctx.closePath();
                ctx.fill();

                ctx.lineCap = 'butt';
            }

            // Draw markers for ladder/snake cells
            for (const [from, to] of Object.entries(LADDERS)) {
                const { x, y } = cellToXY(+from);
                ctx.fillStyle = '#4caf5066';
                ctx.font = `${cs * 0.3}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🪜', x * cs + cs / 2, y * cs + cs / 2);
            }
            for (const [from] of Object.entries(SNAKES)) {
                const { x, y } = cellToXY(+from);
                ctx.fillStyle = '#f4433666';
                ctx.font = `${cs * 0.3}px sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🐍', x * cs + cs / 2, y * cs + cs / 2);
            }

            // Draw tokens
            players.forEach((p, pi) => {
                if (p.pos < 1) return;
                const { x, y } = cellToXY(p.pos);
                const offset = pi * cs * 0.15;
                const tx = x * cs + cs * 0.3 + offset;
                const ty = y * cs + cs * 0.5;
                const r = cs * 0.18;

                // Shadow
                ctx.fillStyle = '#00000033';
                ctx.beginPath(); ctx.arc(tx + 1, ty + 2, r, 0, Math.PI * 2); ctx.fill();
                // Token
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill();
                // Shine
                ctx.fillStyle = '#ffffff55';
                ctx.beginPath(); ctx.arc(tx - r * 0.2, ty - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
                // Border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.stroke();
            });

            // Draw "100" finish marker
            const fin = cellToXY(100);
            ctx.fillStyle = '#ffd70066';
            ctx.fillRect(fin.x * cs, fin.y * cs, cs, cs);
            ctx.font = `bold ${cs * 0.25}px sans-serif`;
            ctx.fillStyle = '#ff6f00';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🏆', fin.x * cs + cs / 2, fin.y * cs + cs / 2);

            // Update player info panel
            renderPlayerPanel();
        }

        function renderPlayerPanel() {
            playersEl.innerHTML = '';
            players.forEach((p, pi) => {
                const isActive = pi === currentPlayer;
                const card = document.createElement('div');
                card.style.cssText = `display:flex;align-items:center;gap:clamp(6px,1.5vw,10px);padding:clamp(6px,1.5vw,10px);border-radius:8px;border:2px solid ${isActive ? p.color : '#333'};background:${isActive ? p.color + '18' : '#13132a'};transition:all 0.3s;`;
                card.innerHTML = `
                    <div style="width:clamp(20px,5vw,28px);height:clamp(20px,5vw,28px);border-radius:50%;background:${p.color};flex-shrink:0;box-shadow:0 2px 6px ${p.color}44;display:flex;align-items:center;justify-content:center;font-size:clamp(0.6rem,1.5vw,0.75rem);font-weight:700;color:#fff">${pi + 1}</div>
                    <div style="display:flex;flex-direction:column;gap:1px">
                        <div style="font-size:clamp(0.7rem,2vw,0.85rem);font-weight:700;color:${p.color}">${p.name}${p.isHuman ? ' (You)' : ' 🤖'}</div>
                        <div style="font-size:clamp(0.6rem,1.5vw,0.75rem);color:#888">Pos: ${p.pos || 'Start'}${isActive ? ' ◀' : ''}</div>
                    </div>
                `;
                playersEl.appendChild(card);
            });
        }

        /* ── Dice ───────────────────────────────── */
        function rollDice() {
            if (rolling || won || animating) return;
            rolling = true;
            rollBtn.disabled = true;

            let count = 0;
            const anim = setInterval(() => {
                dice = Math.floor(Math.random() * 6) + 1;
                diceEl.textContent = DICE_FACES[dice];
                count++;
                if (count >= 12) {
                    clearInterval(anim);
                    rolling = false;
                    executeMove();
                }
            }, 70);
        }

        /* ── Move with animation ────────────────── */
        function executeMove() {
            const p = players[currentPlayer];
            const target = p.pos + dice;

            if (target > TOTAL) {
                // Can't move past 100
                statusEl.textContent = `${p.name} rolled ${dice} — can't move past 100!`;
                setTimeout(() => nextTurn(), 1000);
                return;
            }

            // Animate step by step
            animating = true;
            let current = p.pos;
            const stepInterval = setInterval(() => {
                current++;
                p.pos = current;
                draw();

                if (current >= target) {
                    clearInterval(stepInterval);

                    // Check snake or ladder
                    if (MOVES[p.pos]) {
                        const dest = MOVES[p.pos];
                        const isLadder = dest > p.pos;
                        statusEl.textContent = isLadder
                            ? `🪜 ${p.name} climbs ladder to ${dest}!`
                            : `🐍 ${p.name} slides down to ${dest}!`;

                        // Animate snake/ladder
                        setTimeout(() => {
                            p.pos = dest;
                            draw();
                            afterMove(p);
                        }, 600);
                    } else {
                        afterMove(p);
                    }
                }
            }, 150);
        }

        function afterMove(p) {
            animating = false;

            if (p.pos >= TOTAL) {
                won = true;
                statusEl.textContent = `🎉 ${p.name} wins!`;
                statusEl.style.color = p.color;
                rollBtn.disabled = true;
                draw();
                return;
            }

            updateStatus();

            // Roll 6 = extra turn
            if (dice === 6) {
                statusEl.textContent = `${p.name} rolled 6 — extra turn!`;
                if (p.isHuman) {
                    rollBtn.disabled = false;
                } else {
                    setTimeout(rollDice, 800);
                }
            } else {
                nextTurn();
            }
        }

        function nextTurn() {
            currentPlayer = (currentPlayer + 1) % numPlayers;
            updateStatus();
            draw();

            if (!players[currentPlayer].isHuman) {
                setTimeout(rollDice, 700);
            } else {
                rollBtn.disabled = false;
            }
        }

        /* ── Events ─────────────────────────────── */
        rollBtn.addEventListener('click', rollDice);
        container.querySelector('#sl-new').addEventListener('click', () => {
            gameEl.classList.add('hidden');
            menuEl.classList.remove('hidden');
        });
        container.querySelector('#sl-menu').addEventListener('click', e => {
            const btn = e.target.closest('.sl-np');
            if (btn) startGame(parseInt(btn.dataset.n));
        });

        s._onResize = () => {
            if (!won && gameEl.style.display !== 'none') {
                const cs = getCellSize();
                canvas.width = canvas.height = cs * BOARD_SIZE;
                draw();
            }
        };
        window.addEventListener('resize', s._onResize);
    },

    destroy() {
        const s = this._state; if (!s) return;
        window.removeEventListener('resize', s._onResize);
        this._state = null;
    }
});
