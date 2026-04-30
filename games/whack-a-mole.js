/* ── Whack-a-Mole ─────────────────────────────── */
App.register({
    id: 'whack-a-mole',
    title: 'Whack-a-Mole',
    icon: '🐹',
    description: 'Whack moles as fast as you can!',
    tag: 'Reflex',
    tagClass: 'tag-reflex',
    _state: null,

    init(container) {
        const s = this._state = { timers: [] };
        let score, timeLeft, moleIdx, running, interval, countdown;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:1rem">
                <h2 class="g-title">WHACK-A-MOLE</h2>
                <div id="wm-bar" style="display:flex;gap:2rem;font-size:1rem;color:#aaa">
                    <span>Score: <strong id="wm-score" style="color:#00e5ff">0</strong></span>
                    <span>Time: <strong id="wm-time" style="color:#ff4081">30</strong>s</span>
                </div>
                <div id="wm-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:min(85vw,360px)"></div>
                <div id="wm-msg" style="font-size:1.3rem;font-weight:700;min-height:1.5em"></div>
                <button class="g-btn" id="wm-start">Start Game</button>
            </div>
        `;

        const gridEl = container.querySelector('#wm-grid');
        const scoreEl = container.querySelector('#wm-score');
        const timeEl = container.querySelector('#wm-time');
        const msgEl = container.querySelector('#wm-msg');
        const startBtn = container.querySelector('#wm-start');

        function buildGrid() {
            gridEl.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const hole = document.createElement('button');
                hole.style.cssText = `aspect-ratio:1;border-radius:50%;border:3px solid #333;background:${i===moleIdx?'#4a2800':'#1a1a35'};font-size:clamp(2rem,7vw,3rem);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.1s,transform 0.1s;`;
                hole.textContent = i === moleIdx ? '🐹' : '';
                hole.addEventListener('click', () => whack(i));
                if (i === moleIdx) {
                    hole.style.transform = 'scale(1.05)';
                    hole.style.boxShadow = '0 0 20px #ff980055';
                }
                gridEl.appendChild(hole);
            }
        }

        function startGame() {
            score = 0; timeLeft = 30; moleIdx = -1; running = true;
            scoreEl.textContent = '0'; timeEl.textContent = '30';
            msgEl.textContent = ''; startBtn.classList.add('hidden');
            buildGrid();
            showMole();
            countdown = setInterval(() => {
                timeLeft--;
                timeEl.textContent = timeLeft;
                if (timeLeft <= 0) endGame();
            }, 1000);
            s.timers.push(countdown);
        }

        function showMole() {
            if (!running) return;
            let next;
            do { next = Math.floor(Math.random() * 9); } while (next === moleIdx);
            moleIdx = next;
            buildGrid();
            const dur = Math.max(500, 1200 - score * 20);
            const t = setTimeout(() => { if (running) { moleIdx = -1; buildGrid(); showMole(); } }, dur);
            s.timers.push(t);
        }

        function whack(i) {
            if (!running) return;
            if (i === moleIdx) {
                score++;
                scoreEl.textContent = score;
                moleIdx = -1;
                buildGrid();
                showMole();
            }
        }

        function endGame() {
            running = false;
            s.timers.forEach(clearTimeout);
            s.timers.forEach(clearInterval);
            s.timers = [];
            moleIdx = -1; buildGrid();
            msgEl.textContent = `🎉 Score: ${score}`;
            msgEl.style.color = '#7c4dff';
            startBtn.textContent = 'Play Again';
            startBtn.classList.remove('hidden');
        }

        startBtn.addEventListener('click', startGame);
        buildGrid();
    },

    destroy() {
        const s = this._state; if (!s) return;
        s.timers.forEach(clearTimeout);
        s.timers.forEach(clearInterval);
        this._state = null;
    }
});
