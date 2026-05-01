/* ── Memory Card Flip Game ─────────────────────── */
App.register({
    id: 'memory-game',
    title: 'Memory Cards',
    icon: '🃏',
    description: 'Flip cards and find matching pairs.',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};
        const EMOJIS = ['🍎','🍊','🍋','🍇','🍉','🍓','🫐','🥝','🍒','🥥','🍑','🌶️','🎯','🎲','🚀','⚡','🌈','💎'];
        let cards, first, second, locked, moves, matched, pairs, cols;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;width:100%">
                <h2 class="g-title">MEMORY CARDS</h2>
                <div id="mc-menu" class="g-col">
                    <span class="g-info">Grid Size</span>
                    <div class="g-row">
                        <button class="g-btn-sm mc-sz" data-s="4">4×3 (Easy)</button>
                        <button class="g-btn-sm mc-sz" data-s="6">4×5 (Medium)</button>
                        <button class="g-btn-sm mc-sz" data-s="8">4×7 (Hard)</button>
                    </div>
                </div>
                <div id="mc-info" class="hidden" style="display:flex;gap:2rem;font-size:1rem;color:#aaa">
                    <span>Moves: <strong id="mc-moves" style="color:#00e5ff">0</strong></span>
                    <span>Pairs: <strong id="mc-matched" style="color:#7c4dff">0</strong>/<span id="mc-total">0</span></span>
                </div>
                <div id="mc-grid" style="display:grid;gap:8px;width:100%;max-width:600px;justify-content:center"></div>
                <div id="mc-win" class="hidden" style="font-size:1.4rem;color:#7c4dff;font-weight:700"></div>
                <button class="g-btn hidden" id="mc-restart">Play Again</button>
            </div>
        `;

        function startGame(pairCount) {
            pairs = pairCount;
            const total = pairs * 2;
            cols = pairs <= 6 ? 4 : 4;
            const rows = Math.ceil(total / cols);
            const emojis = EMOJIS.slice(0, pairs);
            cards = shuffle([...emojis, ...emojis].map((v, i) => ({ id: i, value: v, flipped: false, matched: false })));
            first = second = null; locked = false; moves = 0; matched = 0;

            container.querySelector('#mc-menu').classList.add('hidden');
            container.querySelector('#mc-info').classList.remove('hidden');
            container.querySelector('#mc-info').style.display = 'flex';
            container.querySelector('#mc-win').classList.add('hidden');
            container.querySelector('#mc-restart').classList.add('hidden');
            container.querySelector('#mc-moves').textContent = '0';
            container.querySelector('#mc-matched').textContent = '0';
            container.querySelector('#mc-total').textContent = pairs;

            const grid = container.querySelector('#mc-grid');
            grid.style.gridTemplateColumns = `repeat(${cols}, minmax(50px, 80px))`;
            grid.style.display = 'grid';
            renderCards();
        }

        function renderCards() {
            const grid = container.querySelector('#mc-grid');
            grid.innerHTML = '';
            cards.forEach((c, i) => {
                const el = document.createElement('button');
                el.style.cssText = `aspect-ratio:1;border-radius:10px;font-size:clamp(1.5rem,5vw,2.2rem);border:2px solid ${c.matched?'#7c4dff':c.flipped?'#00e5ff':'#333'};cursor:pointer;transition:transform 0.3s,background 0.3s;display:flex;align-items:center;justify-content:center;`;
                if (c.flipped || c.matched) {
                    el.style.background = '#1e1e3a';
                    el.textContent = c.value;
                    el.style.transform = 'rotateY(0)';
                } else {
                    el.style.background = '#252550';
                    el.textContent = '?';
                    el.style.color = '#555';
                }
                el.addEventListener('click', () => flipCard(i));
                grid.appendChild(el);
            });
        }

        function flipCard(i) {
            const c = cards[i];
            if (locked || c.flipped || c.matched) return;
            c.flipped = true;
            renderCards();

            if (!first) { first = c; return; }
            second = c; locked = true; moves++;
            container.querySelector('#mc-moves').textContent = moves;

            if (first.value === second.value) {
                first.matched = second.matched = true; matched++;
                container.querySelector('#mc-matched').textContent = matched;
                first = second = null; locked = false;
                renderCards();
                if (matched === pairs) {
                    container.querySelector('#mc-win').textContent = `🎉 You won in ${moves} moves!`;
                    container.querySelector('#mc-win').classList.remove('hidden');
                    container.querySelector('#mc-restart').classList.remove('hidden');
                }
            } else {
                setTimeout(() => {
                    first.flipped = second.flipped = false;
                    first = second = null; locked = false;
                    renderCards();
                }, 800);
            }
        }

        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        container.querySelector('#mc-menu').addEventListener('click', e => {
            const btn = e.target.closest('.mc-sz');
            if (!btn) return;
            const sizes = { '4': 6, '6': 10, '8': 14 };
            startGame(sizes[btn.dataset.s]);
        });
        container.querySelector('#mc-restart').addEventListener('click', () => startGame(pairs));
    },

    destroy() { this._state = null; }
});
