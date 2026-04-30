/* ── Reaction Time Tester ─────────────────────── */
App.register({
    id: 'reaction-test',
    title: 'Reaction Time',
    icon: '⚡',
    description: 'Test your reflexes — click when the screen turns green!',
    tag: 'Reflex',
    tagClass: 'tag-reflex',
    _state: null,

    init(container) {
        const s = this._state = { timers: [] };
        let phase, startTime, results;

        container.innerHTML = `
            <div id="rt-box" style="width:min(90vw,500px);height:min(60vh,400px);border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:background 0.3s;background:#1a1a35;border:2px solid #333;gap:1rem;padding:2rem;text-align:center">
                <div id="rt-msg" style="font-size:clamp(1.2rem,4vw,1.8rem);font-weight:700;color:#eee"></div>
                <div id="rt-sub" style="font-size:1rem;color:#888"></div>
            </div>
            <div style="margin-top:1rem;display:flex;flex-direction:column;align-items:center;gap:0.5rem">
                <div id="rt-results" style="color:#aaa;font-size:0.95rem;text-align:center"></div>
                <button class="g-btn hidden" id="rt-again">Try Again</button>
            </div>
        `;

        const box = container.querySelector('#rt-box');
        const msg = container.querySelector('#rt-msg');
        const sub = container.querySelector('#rt-sub');
        const resEl = container.querySelector('#rt-results');
        const btnAgain = container.querySelector('#rt-again');

        function reset() {
            results = [];
            phase = 'idle';
            btnAgain.classList.add('hidden');
            resEl.textContent = '';
            showWait();
        }

        function showWait() {
            phase = 'waiting';
            box.style.background = '#8b0000';
            msg.textContent = 'Wait for green...';
            sub.textContent = 'Click too early = false start!';
            msg.style.color = '#ffcccc';
            const delay = 1500 + Math.random() * 3500;
            const t = setTimeout(showGo, delay);
            s.timers.push(t);
        }

        function showGo() {
            phase = 'ready';
            box.style.background = '#006400';
            msg.textContent = 'CLICK NOW!';
            msg.style.color = '#90ee90';
            sub.textContent = '';
            startTime = performance.now();
        }

        function showResult(ms) {
            results.push(ms);
            phase = 'result';
            box.style.background = '#1a1a35';
            msg.style.color = '#00e5ff';
            msg.textContent = `${Math.round(ms)} ms`;
            sub.textContent = results.length < 5 ? `Round ${results.length}/5 — Click to continue` : '';

            if (results.length >= 5) {
                const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
                resEl.innerHTML = results.map((r, i) => `#${i + 1}: ${Math.round(r)}ms`).join(' &nbsp;|&nbsp; ') +
                    `<br><strong style="color:#7c4dff;font-size:1.2rem">Average: ${avg}ms</strong>`;
                btnAgain.classList.remove('hidden');
                sub.textContent = 'Done!';
            }
        }

        function falseStart() {
            phase = 'false';
            s.timers.forEach(clearTimeout);
            s.timers = [];
            box.style.background = '#1a1a35';
            msg.textContent = 'Too soon! 😬';
            msg.style.color = '#ff4081';
            sub.textContent = 'Click to try again';
        }

        box.addEventListener('click', () => {
            if (phase === 'waiting') { falseStart(); }
            else if (phase === 'ready') { showResult(performance.now() - startTime); }
            else if (phase === 'result' && results.length < 5) { showWait(); }
            else if (phase === 'false' || phase === 'idle') { reset(); showWait(); }
        });

        btnAgain.addEventListener('click', reset);
        reset();
    },

    destroy() {
        const s = this._state; if (!s) return;
        s.timers.forEach(clearTimeout);
        this._state = null;
    }
});
