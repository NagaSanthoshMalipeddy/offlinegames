/* ── Snake Game ───────────────────────────────── */
App.register({
    id: 'snake',
    title: 'Snake',
    icon: '🐍',
    description: 'Classic snake — eat food, grow, don\'t crash! Swipe or arrow keys.',
    tag: 'Classic',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = { interval: null };
        const GRID = 20;
        const SPEEDS = { easy: 150, medium: 100, hard: 60 };

        let snake, dir, nextDir, food, score, highScore, speed, running, gameOver;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.75rem">
                <h2 class="g-title">🐍 SNAKE</h2>
                <div id="sn-menu" class="g-col">
                    <span class="g-info">Speed</span>
                    <div class="g-row">
                        <button class="g-btn sn-sp" data-sp="easy">Slow</button>
                        <button class="g-btn sn-sp" data-sp="medium">Normal</button>
                        <button class="g-btn sn-sp" data-sp="hard">Fast</button>
                    </div>
                </div>
                <div id="sn-game" class="hidden" style="display:flex;flex-direction:column;align-items:center;gap:0.5rem">
                    <div style="display:flex;gap:2rem;font-size:1rem;color:#aaa">
                        <span>🍎 Score: <strong id="sn-score" style="color:#4caf50">0</strong></span>
                        <span>🏆 Best: <strong id="sn-best" style="color:#ffeb3b">0</strong></span>
                    </div>
                    <canvas id="sn-canvas" style="border:2px solid #333;border-radius:6px;background:#111;display:block"></canvas>
                    <div id="sn-msg" style="font-size:1.2rem;font-weight:700;min-height:1.5em;text-align:center"></div>
                    <!-- Mobile controls -->
                    <div style="display:grid;grid-template-columns:repeat(3,clamp(40px,12vw,56px));grid-template-rows:repeat(3,clamp(40px,12vw,56px));gap:4px;margin-top:0.25rem">
                        <div></div>
                        <button class="g-btn-sm sn-dir" data-d="up" style="font-size:1.3rem;display:flex;align-items:center;justify-content:center">▲</button>
                        <div></div>
                        <button class="g-btn-sm sn-dir" data-d="left" style="font-size:1.3rem;display:flex;align-items:center;justify-content:center">◀</button>
                        <div></div>
                        <button class="g-btn-sm sn-dir" data-d="right" style="font-size:1.3rem;display:flex;align-items:center;justify-content:center">▶</button>
                        <div></div>
                        <button class="g-btn-sm sn-dir" data-d="down" style="font-size:1.3rem;display:flex;align-items:center;justify-content:center">▼</button>
                        <div></div>
                    </div>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#sn-menu');
        const gameEl = container.querySelector('#sn-game');
        const canvas = container.querySelector('#sn-canvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = container.querySelector('#sn-score');
        const bestEl = container.querySelector('#sn-best');
        const msgEl = container.querySelector('#sn-msg');

        highScore = parseInt(localStorage.getItem('snake_best') || '0');

        function cellSize() { return Math.min(Math.floor(Math.min(window.innerWidth * 0.85, 500) / GRID), 25); }

        function startGame(sp) {
            speed = SPEEDS[sp];
            const cs = cellSize();
            canvas.width = canvas.height = cs * GRID;

            snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
            dir = 'right'; nextDir = 'right';
            score = 0; gameOver = false; running = true;
            spawnFood();

            scoreEl.textContent = 0;
            bestEl.textContent = highScore;
            msgEl.textContent = '';

            menuEl.classList.add('hidden');
            gameEl.classList.remove('hidden');
            gameEl.style.display = 'flex';

            if (s.interval) clearInterval(s.interval);
            s.interval = setInterval(tick, speed);
            draw();
        }

        function spawnFood() {
            let pos;
            do {
                pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
            } while (snake.some(s => s.x === pos.x && s.y === pos.y));
            food = pos;
        }

        function tick() {
            if (!running || gameOver) return;
            dir = nextDir;

            const head = { ...snake[0] };
            if (dir === 'right') head.x++;
            else if (dir === 'left') head.x--;
            else if (dir === 'up') head.y--;
            else if (dir === 'down') head.y++;

            // Wrap through walls
            if (head.x < 0) head.x = GRID - 1;
            else if (head.x >= GRID) head.x = 0;
            if (head.y < 0) head.y = GRID - 1;
            else if (head.y >= GRID) head.y = 0;
            // Self collision (game over only when biting itself)
            if (snake.some(s => s.x === head.x && s.y === head.y)) { endGame(); return; }

            snake.unshift(head);

            if (head.x === food.x && head.y === food.y) {
                score++;
                scoreEl.textContent = score;
                if (score > highScore) { highScore = score; bestEl.textContent = highScore; localStorage.setItem('snake_best', highScore); }
                spawnFood();
            } else {
                snake.pop();
            }

            draw();
        }

        function draw() {
            const cs = canvas.width / GRID;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Grid lines (subtle)
            ctx.strokeStyle = '#1a1a2a';
            ctx.lineWidth = 0.5;
            for (let i = 0; i <= GRID; i++) {
                ctx.beginPath(); ctx.moveTo(i * cs, 0); ctx.lineTo(i * cs, canvas.height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * cs); ctx.lineTo(canvas.width, i * cs); ctx.stroke();
            }

            // Food
            ctx.fillStyle = '#f44336';
            ctx.shadowColor = '#f44336';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(food.x * cs + cs / 2, food.y * cs + cs / 2, cs / 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Food stem
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(food.x * cs + cs / 2 - 1, food.y * cs + cs * 0.15, 2, cs * 0.2);

            // Snake
            snake.forEach((seg, i) => {
                const t = i / snake.length;
                const r = Math.floor(76 - t * 40);
                const g = Math.floor(175 + t * 30);
                const b = Math.floor(80 - t * 40);
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.shadowColor = i === 0 ? '#4caf50' : 'transparent';
                ctx.shadowBlur = i === 0 ? 6 : 0;

                const pad = i === 0 ? 0.5 : 1;
                ctx.beginPath();
                ctx.roundRect(seg.x * cs + pad, seg.y * cs + pad, cs - pad * 2, cs - pad * 2, i === 0 ? cs / 4 : cs / 6);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Eyes on head
                if (i === 0) {
                    ctx.fillStyle = '#fff';
                    const eyeSize = cs * 0.15;
                    let ex1, ey1, ex2, ey2;
                    if (dir === 'right') { ex1 = seg.x * cs + cs * 0.65; ey1 = seg.y * cs + cs * 0.25; ex2 = ex1; ey2 = seg.y * cs + cs * 0.65; }
                    else if (dir === 'left') { ex1 = seg.x * cs + cs * 0.3; ey1 = seg.y * cs + cs * 0.25; ex2 = ex1; ey2 = seg.y * cs + cs * 0.65; }
                    else if (dir === 'up') { ex1 = seg.x * cs + cs * 0.25; ey1 = seg.y * cs + cs * 0.3; ex2 = seg.x * cs + cs * 0.65; ey2 = ey1; }
                    else { ex1 = seg.x * cs + cs * 0.25; ey1 = seg.y * cs + cs * 0.65; ex2 = seg.x * cs + cs * 0.65; ey2 = ey1; }
                    ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#111';
                    ctx.beginPath(); ctx.arc(ex1, ey1, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(ex2, ey2, eyeSize * 0.5, 0, Math.PI * 2); ctx.fill();
                }
            });
        }

        function endGame() {
            gameOver = true; running = false;
            if (s.interval) { clearInterval(s.interval); s.interval = null; }

            // Flash effect
            ctx.fillStyle = '#ff000033';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let rating;
            if (score >= 30) rating = '🏆 Legend!';
            else if (score >= 20) rating = '🐍 Amazing!';
            else if (score >= 10) rating = '👍 Nice!';
            else rating = '🎯 Try again!';

            msgEl.innerHTML = `💀 Game Over! &nbsp;Score: ${score} &nbsp;${rating}<br><button class="g-btn" id="sn-retry" style="margin-top:0.5rem">Play Again</button>`;
            container.querySelector('#sn-retry').addEventListener('click', () => startGame(
                speed === 150 ? 'easy' : speed === 100 ? 'medium' : 'hard'
            ));
        }

        // Keyboard
        s._onKey = e => {
            const map = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
            const d = map[e.key.toLowerCase()];
            if (!d) return;
            e.preventDefault();
            const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
            if (d !== opposites[dir]) nextDir = d;
        };
        document.addEventListener('keydown', s._onKey);

        // Mobile buttons
        container.querySelectorAll('.sn-dir').forEach(btn => {
            btn.addEventListener('click', () => {
                const d = btn.dataset.d;
                const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
                if (d !== opposites[dir]) nextDir = d;
            });
        });

        // Swipe
        let touchX, touchY;
        canvas.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
        canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - touchX;
            const dy = e.changedTouches[0].clientY - touchY;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
            const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
            let d;
            if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? 'right' : 'left';
            else d = dy > 0 ? 'down' : 'up';
            if (d !== opposites[dir]) nextDir = d;
        }, { passive: true });

        // Menu
        container.querySelector('#sn-menu').addEventListener('click', e => {
            const btn = e.target.closest('.sn-sp');
            if (btn) startGame(btn.dataset.sp);
        });
    },

    destroy() {
        const s = this._state; if (!s) return;
        if (s.interval) clearInterval(s.interval);
        document.removeEventListener('keydown', s._onKey);
        this._state = null;
    }
});
