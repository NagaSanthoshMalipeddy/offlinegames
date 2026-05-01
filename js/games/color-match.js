/* ── Color Match (Stroop) Game ─────────────────── */
App.register({
    id: 'color-match',
    title: 'Color Match',
    icon: '🎨',
    description: 'Pick the COLOR of the word, not what it says!',
    tag: 'Reflex',
    tagClass: 'tag-reflex',
    _state: null,

    init(container) {
        const s = this._state = { timer: null };
        const COLORS = [
            { name: 'Red',    hex: '#ef5350' },
            { name: 'Blue',   hex: '#42a5f5' },
            { name: 'Green',  hex: '#66bb6a' },
            { name: 'Yellow', hex: '#ffee58' },
            { name: 'Purple', hex: '#ab47bc' },
            { name: 'Orange', hex: '#ffa726' },
        ];
        let score, timeLeft, running, word, wordColor, round;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;width:100%">
                <h2 class="g-title">COLOR MATCH</h2>
                <p style="color:#888;font-size:0.9rem;text-align:center;max-width:400px">Pick the <strong style="color:#fff">COLOR</strong> the word is displayed in, <em>not</em> the word itself!</p>
                <div style="display:flex;gap:2rem;font-size:1rem;color:#aaa">
                    <span>Score: <strong id="cm-score" style="color:#00e5ff">0</strong></span>
                    <span>Time: <strong id="cm-time" style="color:#ff4081">30</strong>s</span>
                </div>
                <div id="cm-word" style="font-size:clamp(2.5rem,10vw,5rem);font-weight:900;height:1.5em;display:flex;align-items:center;justify-content:center;letter-spacing:0.05em"></div>
                <div id="cm-choices" class="g-row" style="max-width:500px"></div>
                <div id="cm-feedback" style="font-size:1rem;min-height:1.5em;font-weight:600"></div>
                <button class="g-btn" id="cm-start">Start Game</button>
                <div id="cm-result" style="font-size:1.3rem;font-weight:700;min-height:1.5em"></div>
            </div>
        `;

        const wordEl = container.querySelector('#cm-word');
        const choicesEl = container.querySelector('#cm-choices');
        const scoreEl = container.querySelector('#cm-score');
        const timeEl = container.querySelector('#cm-time');
        const feedbackEl = container.querySelector('#cm-feedback');
        const startBtn = container.querySelector('#cm-start');
        const resultEl = container.querySelector('#cm-result');

        function startGame() {
            score = 0; timeLeft = 30; running = true; round = 0;
            scoreEl.textContent = '0'; timeEl.textContent = '30';
            feedbackEl.textContent = ''; resultEl.textContent = '';
            startBtn.classList.add('hidden');
            nextRound();
            s.timer = setInterval(() => {
                timeLeft--;
                timeEl.textContent = timeLeft;
                if (timeLeft <= 0) endGame();
            }, 1000);
        }

        function nextRound() {
            if (!running) return;
            round++;
            const wordIdx = Math.floor(Math.random() * COLORS.length);
            let colorIdx;
            do { colorIdx = Math.floor(Math.random() * COLORS.length); } while (colorIdx === wordIdx && Math.random() > 0.3);
            word = COLORS[wordIdx].name;
            wordColor = COLORS[colorIdx];

            wordEl.textContent = word;
            wordEl.style.color = wordColor.hex;

            // Build choices: always include correct answer + random others
            const choiceSet = new Set([colorIdx]);
            while (choiceSet.size < Math.min(4, COLORS.length)) {
                choiceSet.add(Math.floor(Math.random() * COLORS.length));
            }
            const choices = shuffle([...choiceSet]);

            choicesEl.innerHTML = '';
            choices.forEach(ci => {
                const btn = document.createElement('button');
                btn.className = 'g-btn-sm';
                btn.style.cssText = `padding:0.5rem 1.2rem;font-size:1rem;font-weight:600;border-color:${COLORS[ci].hex};color:${COLORS[ci].hex};min-width:80px`;
                btn.textContent = COLORS[ci].name;
                btn.addEventListener('click', () => handleChoice(ci));
                choicesEl.appendChild(btn);
            });
        }

        function handleChoice(ci) {
            if (!running) return;
            if (ci === COLORS.indexOf(wordColor)) {
                score++;
                scoreEl.textContent = score;
                feedbackEl.textContent = '✓ Correct!';
                feedbackEl.style.color = '#66bb6a';
            } else {
                feedbackEl.textContent = `✗ It was ${wordColor.name}`;
                feedbackEl.style.color = '#ff4081';
            }
            nextRound();
        }

        function endGame() {
            running = false;
            clearInterval(s.timer); s.timer = null;
            wordEl.textContent = ''; choicesEl.innerHTML = '';
            feedbackEl.textContent = '';
            let rating = '';
            if (score >= 25) rating = '🧠 Genius!';
            else if (score >= 18) rating = '⚡ Sharp!';
            else if (score >= 12) rating = '👍 Nice';
            else rating = '🐢 Keep going!';
            resultEl.innerHTML = `Score: <span style="color:#7c4dff">${score}</span> &nbsp;${rating}`;
            startBtn.textContent = 'Play Again';
            startBtn.classList.remove('hidden');
        }

        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
            return arr;
        }

        startBtn.addEventListener('click', startGame);
    },

    destroy() {
        const s = this._state; if (!s) return;
        if (s.timer) clearInterval(s.timer);
        this._state = null;
    }
});
