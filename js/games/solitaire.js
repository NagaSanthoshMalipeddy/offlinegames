/* ── Solitaire (Klondike) ─────────────────────── */
App.register({
    id: 'solitaire',
    title: 'Solitaire',
    icon: '🃏',
    description: 'Classic Klondike Solitaire — drag cards, build foundations Ace to King!',
    tag: 'Puzzle',
    tagClass: 'tag-puzzle',
    _state: null,

    init(container) {
        const s = this._state = {};

        const SUITS = ['♠','♥','♦','♣'];
        const SUIT_COLORS = { '♠':'black','♣':'black','♥':'red','♦':'red' };
        const VALUE_NAMES = ['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];

        let stock, waste, foundations, tableau, moves, timer, timerInterval, won;
        let selectedCards, selectedSource, undoStack;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;width:100%;max-width:800px;margin:0 auto">
                <h2 class="g-title">🃏 SOLITAIRE</h2>
                <div id="sol-bar" style="display:flex;gap:1.5rem;align-items:center;font-size:0.9rem;color:#aaa;flex-wrap:wrap;justify-content:center">
                    <span>⏱️ <strong id="sol-time" style="color:#00e5ff">0:00</strong></span>
                    <span>🔄 Moves: <strong id="sol-moves" style="color:#7c4dff">0</strong></span>
                    <button class="g-btn-sm" id="sol-undo">↩ Undo</button>
                    <button class="g-btn-sm" id="sol-new">New Game</button>
                </div>
                <div id="sol-top" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:4px">
                    <div id="sol-stock" class="sol-pile sol-clickable" title="Draw card"></div>
                    <div id="sol-waste" class="sol-pile"></div>
                    <div style="width:30px"></div>
                    <div id="sol-f0" class="sol-pile sol-foundation" data-f="0"></div>
                    <div id="sol-f1" class="sol-pile sol-foundation" data-f="1"></div>
                    <div id="sol-f2" class="sol-pile sol-foundation" data-f="2"></div>
                    <div id="sol-f3" class="sol-pile sol-foundation" data-f="3"></div>
                </div>
                <div id="sol-tableau" style="display:flex;gap:8px;justify-content:center;align-items:flex-start;flex-wrap:nowrap;width:100%;overflow-x:auto"></div>
                <div id="sol-win" class="hidden" style="font-size:1.5rem;font-weight:700;color:#4caf50;text-align:center;margin-top:1rem"></div>
            </div>
            <style>
                .sol-pile{width:clamp(40px,11vw,72px);min-height:clamp(56px,15vw,100px);border:2px dashed #444;border-radius:6px;position:relative;flex-shrink:0}
                .sol-foundation{border-color:#555}
                .sol-card{position:absolute;width:100%;border-radius:5px;border:1px solid #555;font-weight:700;display:flex;flex-direction:column;justify-content:flex-start;padding:3px 4px;font-size:clamp(0.55rem,1.8vw,0.9rem);cursor:pointer;user-select:none;transition:box-shadow 0.15s;aspect-ratio:5/7;box-sizing:border-box;line-height:1.1}
                .sol-card.face-up{background:#fff}
                .sol-card.face-down{background:linear-gradient(135deg,#1565c0,#1a237e);border-color:#1565c0;cursor:default}
                .sol-card.face-down::after{content:'♠♥♦♣';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#ffffff33;letter-spacing:2px}
                .sol-card.red{color:#d32f2f}
                .sol-card.black{color:#222}
                .sol-card.selected{box-shadow:0 0 0 3px #7c4dff;z-index:100!important}
                .sol-card:hover.face-up{box-shadow:0 2px 8px #0005}
                .sol-card.face-up{cursor:grab}
                .sol-card.dragging{opacity:0.85;box-shadow:0 8px 24px #0008;pointer-events:none;z-index:10000!important;cursor:grabbing}
                .sol-clickable{cursor:pointer}
                .sol-pile-label{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.5rem;color:#555;pointer-events:none}
                .sol-tab-col{position:relative;width:clamp(40px,11vw,72px);min-height:clamp(56px,15vw,100px);flex-shrink:0}
                .sol-drag-ghost{position:fixed;z-index:10000;pointer-events:none;opacity:0.9}
                .sol-drop-highlight{box-shadow:0 0 0 3px #4caf50!important}
            </style>
        `;

        const stockEl = container.querySelector('#sol-stock');
        const wasteEl = container.querySelector('#sol-waste');
        const foundEls = [0,1,2,3].map(i => container.querySelector(`#sol-f${i}`));
        const tableauEl = container.querySelector('#sol-tableau');
        const timeEl = container.querySelector('#sol-time');
        const movesEl = container.querySelector('#sol-moves');
        const winEl = container.querySelector('#sol-win');

        /* ── Deck ──────────────────────────────── */
        function createDeck() {
            const deck = [];
            for (const suit of SUITS) {
                for (let v = 1; v <= 13; v++) {
                    deck.push({ suit, value: v, color: SUIT_COLORS[suit], faceUp: false });
                }
            }
            return shuffle(deck);
        }

        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        /* ── Init ──────────────────────────────── */
        function newGame() {
            const deck = createDeck();
            tableau = [];
            for (let col = 0; col < 7; col++) {
                const pile = [];
                for (let row = 0; row <= col; row++) {
                    const card = deck.pop();
                    card.faceUp = row === col;
                    pile.push(card);
                }
                tableau.push(pile);
            }
            stock = deck; // remaining cards
            stock.forEach(c => c.faceUp = false);
            waste = [];
            foundations = [[], [], [], []];
            moves = 0; won = false;
            selectedCards = null; selectedSource = null;
            undoStack = [];
            winEl.classList.add('hidden');

            // Timer
            if (timerInterval) clearInterval(timerInterval);
            timer = 0;
            timerInterval = setInterval(() => {
                if (won) return;
                timer++;
                const m = Math.floor(timer / 60);
                const sec = timer % 60;
                timeEl.textContent = `${m}:${sec.toString().padStart(2, '0')}`;
            }, 1000);
            s.timerInterval = timerInterval;

            render();
        }

        /* ── Render ─────────────────────────────── */
        function render() {
            movesEl.textContent = moves;

            // Stock
            stockEl.innerHTML = '';
            if (stock.length > 0) {
                const card = renderCard(stock[stock.length - 1], false);
                card.style.position = 'absolute'; card.style.top = '0'; card.style.left = '0';
                stockEl.appendChild(card);
                const label = document.createElement('div');
                label.style.cssText = 'position:absolute;bottom:2px;right:4px;font-size:0.6rem;color:#fff8';
                label.textContent = stock.length;
                stockEl.appendChild(label);
            } else {
                const lbl = document.createElement('div');
                lbl.className = 'sol-pile-label';
                lbl.textContent = '↻';
                stockEl.appendChild(lbl);
            }

            // Waste
            wasteEl.innerHTML = '';
            if (waste.length > 0) {
                const card = renderCard(waste[waste.length - 1], true);
                card.style.position = 'absolute'; card.style.top = '0'; card.style.left = '0';
                card.addEventListener('click', () => selectCard([waste[waste.length - 1]], 'waste'));
                markSelected(card, waste[waste.length - 1]);
                wasteEl.appendChild(card);
            }

            // Foundations
            for (let f = 0; f < 4; f++) {
                foundEls[f].innerHTML = '';
                const pile = foundations[f];
                if (pile.length > 0) {
                    const card = renderCard(pile[pile.length - 1], true);
                    card.style.position = 'absolute'; card.style.top = '0'; card.style.left = '0';
                    foundEls[f].appendChild(card);
                } else {
                    const lbl = document.createElement('div');
                    lbl.className = 'sol-pile-label';
                    lbl.textContent = SUITS[f];
                    foundEls[f].appendChild(lbl);
                }
            }

            // Tableau
            tableauEl.innerHTML = '';
            for (let col = 0; col < 7; col++) {
                const colDiv = document.createElement('div');
                colDiv.className = 'sol-tab-col';
                const pile = tableau[col];
                const offset = Math.min(22, Math.max(14, 180 / Math.max(pile.length, 1)));

                if (pile.length === 0) {
                    colDiv.style.border = '2px dashed #444';
                    colDiv.style.borderRadius = '6px';
                }

                pile.forEach((c, idx) => {
                    const card = renderCard(c, c.faceUp);
                    card.style.position = 'absolute';
                    card.style.top = (idx * offset) + 'px';
                    card.style.left = '0';
                    card.style.zIndex = idx + 1;

                    if (c.faceUp) {
                        card.addEventListener('click', () => {
                            const cardsToMove = pile.slice(idx);
                            selectCard(cardsToMove, { type: 'tableau', col, idx });
                        });
                        markSelected(card, c);
                    }
                    colDiv.appendChild(card);
                });

                // Adjust column height
                colDiv.style.minHeight = (pile.length * offset + 100) + 'px';

                // Click empty column (for King)
                if (pile.length === 0) {
                    colDiv.addEventListener('click', () => {
                        if (selectedCards && selectedCards[0].value === 13) {
                            doMove(selectedSource, { type: 'tableau', col });
                        }
                    });
                }

                tableauEl.appendChild(colDiv);
            }

            // Foundation click handlers
            for (let f = 0; f < 4; f++) {
                foundEls[f].onclick = () => {
                    if (selectedCards && selectedCards.length === 1) {
                        if (canMoveToFoundation(selectedCards[0], f)) {
                            doMove(selectedSource, { type: 'foundation', idx: f });
                        }
                    }
                };
            }
        }

        function renderCard(card, faceUp) {
            const el = document.createElement('div');
            el.className = `sol-card ${faceUp ? 'face-up ' + card.color : 'face-down'}`;
            if (faceUp) {
                el.innerHTML = `<span>${VALUE_NAMES[card.value]}${card.suit}</span>`;
            }
            return el;
        }

        function markSelected(el, card) {
            if (selectedCards && selectedCards.includes(card)) {
                el.classList.add('selected');
            }
        }

        /* ── Selection / Moving ─────────────────── */
        function selectCard(cards, source) {
            if (won) return;

            // If already selected, try auto-move
            if (selectedCards && selectedCards === cards) {
                // Try auto-move to foundation
                if (cards.length === 1) {
                    for (let f = 0; f < 4; f++) {
                        if (canMoveToFoundation(cards[0], f)) {
                            doMove(source, { type: 'foundation', idx: f });
                            return;
                        }
                    }
                }
                // Deselect
                selectedCards = null; selectedSource = null;
                render();
                return;
            }

            // If something already selected, try moving to this location
            if (selectedCards && source.type === 'tableau') {
                const targetPile = tableau[source.col];
                const targetCard = targetPile.length > 0 ? targetPile[targetPile.length - 1] : null;

                if (canPlaceOnTableau(selectedCards[0], targetCard)) {
                    doMove(selectedSource, { type: 'tableau', col: source.col });
                    return;
                }
            }

            // Select new cards
            selectedCards = cards;
            selectedSource = source;
            render();
        }

        function doMove(from, to) {
            // Save undo state
            undoStack.push({
                stock: stock.map(c => ({ ...c })),
                waste: waste.map(c => ({ ...c })),
                foundations: foundations.map(f => f.map(c => ({ ...c }))),
                tableau: tableau.map(col => col.map(c => ({ ...c }))),
                moves
            });

            const cards = selectedCards;

            // Remove from source
            if (from === 'waste') {
                waste.pop();
            } else if (from.type === 'tableau') {
                tableau[from.col].splice(from.idx);
                // Flip top card
                const col = tableau[from.col];
                if (col.length > 0 && !col[col.length - 1].faceUp) {
                    col[col.length - 1].faceUp = true;
                }
            }

            // Place at destination
            if (to.type === 'foundation') {
                foundations[to.idx].push(cards[0]);
            } else if (to.type === 'tableau') {
                tableau[to.col].push(...cards);
            }

            moves++;
            selectedCards = null;
            selectedSource = null;
            render();
            checkWin();
        }

        /* ── Rules ──────────────────────────────── */
        function canPlaceOnTableau(card, targetCard) {
            if (!targetCard) return card.value === 13; // Only King on empty
            return card.color !== targetCard.color && card.value === targetCard.value - 1;
        }

        function canMoveToFoundation(card, fIdx) {
            const pile = foundations[fIdx];
            if (pile.length === 0) return card.value === 1;
            const top = pile[pile.length - 1];
            return card.suit === top.suit && card.value === top.value + 1;
        }

        /* ── Stock click ────────────────────────── */
        stockEl.addEventListener('click', () => {
            if (won) return;
            selectedCards = null; selectedSource = null;

            if (stock.length > 0) {
                undoStack.push({
                    stock: stock.map(c => ({ ...c })),
                    waste: waste.map(c => ({ ...c })),
                    foundations: foundations.map(f => f.map(c => ({ ...c }))),
                    tableau: tableau.map(col => col.map(c => ({ ...c }))),
                    moves
                });
                const card = stock.pop();
                card.faceUp = true;
                waste.push(card);
                moves++;
            } else {
                // Reset stock from waste
                undoStack.push({
                    stock: stock.map(c => ({ ...c })),
                    waste: waste.map(c => ({ ...c })),
                    foundations: foundations.map(f => f.map(c => ({ ...c }))),
                    tableau: tableau.map(col => col.map(c => ({ ...c }))),
                    moves
                });
                stock = waste.reverse().map(c => ({ ...c, faceUp: false }));
                waste = [];
            }
            render();
        });

        /* ── Auto-complete ──────────────────────── */
        function checkWin() {
            const total = foundations.reduce((s, f) => s + f.length, 0);
            if (total === 52) {
                won = true;
                if (timerInterval) clearInterval(timerInterval);
                winEl.textContent = `🎉 You Won! Time: ${timeEl.textContent} | Moves: ${moves}`;
                winEl.classList.remove('hidden');
            }
        }

        /* ── Undo ───────────────────────────────── */
        container.querySelector('#sol-undo').addEventListener('click', () => {
            if (undoStack.length === 0 || won) return;
            const state = undoStack.pop();
            stock = state.stock;
            waste = state.waste;
            foundations = state.foundations;
            tableau = state.tableau;
            moves = state.moves;
            selectedCards = null; selectedSource = null;
            render();
        });

        /* ── New game ───────────────────────────── */
        container.querySelector('#sol-new').addEventListener('click', newGame);

        /* ── Double-click auto-move to foundation ─ */
        container.addEventListener('dblclick', (e) => {
            if (won) return;
            const cardEl = e.target.closest('.sol-card.face-up');
            if (!cardEl) return;

            // Find which card was double-clicked
            let card = null, source = null;

            // Check waste
            if (waste.length > 0 && wasteEl.contains(cardEl)) {
                card = waste[waste.length - 1];
                source = 'waste';
            }

            // Check tableau top cards
            if (!card) {
                for (let col = 0; col < 7; col++) {
                    const pile = tableau[col];
                    if (pile.length > 0 && pile[pile.length - 1].faceUp) {
                        // Check if this card element is the last in this column
                        const colDiv = tableauEl.children[col];
                        if (colDiv && colDiv.contains(cardEl)) {
                            card = pile[pile.length - 1];
                            source = { type: 'tableau', col, idx: pile.length - 1 };
                            break;
                        }
                    }
                }
            }

            if (!card) return;

            // Try to auto-move to foundation
            for (let f = 0; f < 4; f++) {
                if (canMoveToFoundation(card, f)) {
                    selectedCards = [card];
                    selectedSource = source;
                    doMove(source, { type: 'foundation', idx: f });
                    return;
                }
            }
        });

        /* ── Drag and Drop system ────────────────── */
        let dragState = null; // { cards, source, ghost, offsetX, offsetY }

        function startDrag(e, cards, source) {
            if (won || !cards || !cards[0].faceUp) return;
            e.preventDefault();

            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            const target = e.target.closest('.sol-card');
            if (!target) return;

            const rect = target.getBoundingClientRect();
            const cardW = rect.width;
            const cardH = rect.height;
            const offset = Math.min(22, 16);

            // Create ghost element
            const ghost = document.createElement('div');
            ghost.className = 'sol-drag-ghost';
            ghost.style.width = cardW + 'px';

            cards.forEach((c, i) => {
                const cardEl = renderCard(c, true);
                cardEl.style.position = 'absolute';
                cardEl.style.top = (i * offset) + 'px';
                cardEl.style.left = '0';
                cardEl.style.width = cardW + 'px';
                cardEl.classList.add('dragging');
                ghost.appendChild(cardEl);
            });

            ghost.style.height = ((cards.length - 1) * offset + cardH) + 'px';
            document.body.appendChild(ghost);

            dragState = {
                cards, source, ghost,
                offsetX: clientX - rect.left,
                offsetY: clientY - rect.top
            };

            moveGhost(clientX, clientY);

            // Hide original cards visually
            selectedCards = cards;
            selectedSource = source;
            render();
        }

        function moveGhost(clientX, clientY) {
            if (!dragState) return;
            dragState.ghost.style.left = (clientX - dragState.offsetX) + 'px';
            dragState.ghost.style.top = (clientY - dragState.offsetY) + 'px';
        }

        function endDrag(clientX, clientY) {
            if (!dragState) return;

            const { cards, source, ghost } = dragState;
            ghost.remove();

            // Find drop target
            const dropTarget = findDropTarget(clientX, clientY);

            if (dropTarget) {
                selectedCards = cards;
                selectedSource = source;
                doMove(source, dropTarget);
            } else {
                selectedCards = null;
                selectedSource = null;
                render();
            }

            dragState = null;
        }

        function findDropTarget(x, y) {
            // Check foundations
            for (let f = 0; f < 4; f++) {
                const rect = foundEls[f].getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    if (dragState.cards.length === 1 && canMoveToFoundation(dragState.cards[0], f)) {
                        return { type: 'foundation', idx: f };
                    }
                }
            }

            // Check tableau columns
            for (let col = 0; col < 7; col++) {
                const colEl = tableauEl.children[col];
                if (!colEl) continue;
                const rect = colEl.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    const pile = tableau[col];
                    const targetCard = pile.length > 0 ? pile[pile.length - 1] : null;
                    if (canPlaceOnTableau(dragState.cards[0], targetCard)) {
                        return { type: 'tableau', col };
                    }
                }
            }

            return null;
        }

        // Mouse events
        container.addEventListener('mousedown', (e) => {
            const cardEl = e.target.closest('.sol-card.face-up');
            if (!cardEl) return;

            // Find which card
            // Check waste
            if (wasteEl.contains(cardEl) && waste.length > 0) {
                startDrag(e, [waste[waste.length - 1]], 'waste');
                return;
            }

            // Check tableau
            for (let col = 0; col < 7; col++) {
                const colDiv = tableauEl.children[col];
                if (!colDiv || !colDiv.contains(cardEl)) continue;
                const pile = tableau[col];
                // Find which card index by position
                const cardEls = colDiv.querySelectorAll('.sol-card.face-up');
                for (let ci = 0; ci < cardEls.length; ci++) {
                    if (cardEls[ci] === cardEl) {
                        // Find actual index in pile
                        const faceUpStart = pile.findIndex(c => c.faceUp);
                        const idx = faceUpStart + ci;
                        const cardsToMove = pile.slice(idx);
                        startDrag(e, cardsToMove, { type: 'tableau', col, idx });
                        return;
                    }
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragState) return;
            e.preventDefault();
            moveGhost(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', (e) => {
            if (!dragState) return;
            endDrag(e.clientX, e.clientY);
        });

        // Touch events
        container.addEventListener('touchstart', (e) => {
            const cardEl = e.target.closest('.sol-card.face-up');
            if (!cardEl) return;

            // Delay to distinguish tap from drag
            const touch = e.touches[0];

            // Check waste
            if (wasteEl.contains(cardEl) && waste.length > 0) {
                startDrag(e, [waste[waste.length - 1]], 'waste');
                return;
            }

            // Check tableau
            for (let col = 0; col < 7; col++) {
                const colDiv = tableauEl.children[col];
                if (!colDiv || !colDiv.contains(cardEl)) continue;
                const pile = tableau[col];
                const cardEls = colDiv.querySelectorAll('.sol-card.face-up');
                for (let ci = 0; ci < cardEls.length; ci++) {
                    if (cardEls[ci] === cardEl) {
                        const faceUpStart = pile.findIndex(c => c.faceUp);
                        const idx = faceUpStart + ci;
                        const cardsToMove = pile.slice(idx);
                        startDrag(e, cardsToMove, { type: 'tableau', col, idx });
                        return;
                    }
                }
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!dragState) return;
            e.preventDefault();
            const t = e.touches[0];
            moveGhost(t.clientX, t.clientY);
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!dragState) return;
            const t = e.changedTouches[0];
            endDrag(t.clientX, t.clientY);
        });

        /* ── Start ──────────────────────────────── */
        newGame();
    },

    destroy() {
        const s = this._state; if (!s) return;
        if (s.timerInterval) clearInterval(s.timerInterval);
        this._state = null;
    }
});
