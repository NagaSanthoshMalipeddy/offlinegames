/* ── Click Speed Test ─────────────────────────── */
App.register({
    id: 'click-speed',
    title: 'Click Speed',
    icon: '🖱️',
    description: 'Click as fast as you can in 10 seconds!',
    tag: 'Reflex',
    tagClass: 'tag-reflex',
    _state: null,

    init(container) {
        const s = this._state = { timer: null };
        let clicks, timeLeft, running, startTime;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;width:100%">
                <h2 class="g-title">CLICK SPEED TEST</h2>
                <div style="display:flex;gap:2rem;font-size:1.1rem;color:#aaa">
                    <span>Clicks: <strong id="cs-clicks" style="color:#00e5ff">0</strong></span>
                    <span>Time: <strong id="cs-time" style="color:#ff4081">10.0</strong>s</span>
                    <span>CPS: <strong id="cs-cps" style="color:#7c4dff">0.0</strong></span>
                </div>
                <button id="cs-target" style="width:min(80vw,300px);height:min(40vh,250px);border-radius:16px;border:3px solid #7c4dff;background:#1a1a35;cursor:pointer;font-size:clamp(1.2rem,4vw,1.8rem);font-weight:700;color:#eee;transition:transform 0.05s,background 0.1s;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0.5rem">
                    <span id="cs-label">Click to Start!</span>
                </button>
                <div id="cs-result" style="font-size:1.3rem;font-weight:700;min-height:1.5em;text-align:center"></div>
                <button class="g-btn hidden" id="cs-again">Try Again</button>
            </div>
        `;

        const DURATION = 10;
        const clicksEl = container.querySelector('#cs-clicks');
        const timeEl = container.querySelector('#cs-time');
        const cpsEl = container.querySelector('#cs-cps');
        const target = container.querySelector('#cs-target');
        const label = container.querySelector('#cs-label');
        const resultEl = container.querySelector('#cs-result');
        const againBtn = container.querySelector('#cs-again');

        function reset() {
            clicks = 0; timeLeft = DURATION; running = false; startTime = null;
            clicksEl.textContent = '0'; timeEl.textContent = '10.0'; cpsEl.textContent = '0.0';
            label.textContent = 'Click to Start!';
            resultEl.textContent = '';
            againBtn.classList.add('hidden');
            target.style.borderColor = '#7c4dff';
            if (s.timer) { clearInterval(s.timer); s.timer = null; }
        }

        function start() {
            running = true; startTime = performance.now();
            label.textContent = 'CLICK!';
            target.style.borderColor = '#00e5ff';
            s.timer = setInterval(tick, 50);
        }

        function tick() {
            const elapsed = (performance.now() - startTime) / 1000;
            timeLeft = Math.max(0, DURATION - elapsed);
            timeEl.textContent = timeLeft.toFixed(1);
            cpsEl.textContent = elapsed > 0 ? (clicks / elapsed).toFixed(1) : '0.0';
            if (timeLeft <= 0) endGame();
        }

        function endGame() {
            running = false;
            clearInterval(s.timer); s.timer = null;
            const cps = (clicks / DURATION).toFixed(2);
            label.textContent = 'Done!';
            target.style.borderColor = '#7c4dff';
            resultEl.innerHTML = `Total: <span style="color:#00e5ff">${clicks}</span> clicks &nbsp;|&nbsp; CPS: <span style="color:#7c4dff">${cps}</span>`;
            let rating = '';
            if (cps >= 10) rating = '🐆 Superhuman!';
            else if (cps >= 8) rating = '⚡ Lightning Fast!';
            else if (cps >= 6) rating = '🔥 Fast!';
            else if (cps >= 4) rating = '👍 Good';
            else rating = '🐢 Keep Practicing';
            resultEl.innerHTML += `<br><span style="font-size:1.5rem">${rating}</span>`;
            againBtn.classList.remove('hidden');
        }

        target.addEventListener('click', () => {
            if (!running && !startTime) { start(); }
            if (running) {
                clicks++;
                clicksEl.textContent = clicks;
                target.style.transform = 'scale(0.97)';
                setTimeout(() => target.style.transform = 'scale(1)', 50);
            }
        });

        againBtn.addEventListener('click', reset);
        reset();
    },

    destroy() {
        const s = this._state; if (!s) return;
        if (s.timer) clearInterval(s.timer);
        this._state = null;
    }
});
