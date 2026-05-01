/* ── App Controller / Router ──────────────────── */
/* ── Theme System ───────────────────────────── */
(() => {
    const toggle = document.getElementById('theme-toggle');
    const overlay = document.getElementById('theme-overlay');
    const saved = localStorage.getItem('theme');

    // Apply saved theme on load (no animation)
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        toggle.textContent = '☀️';
    }

    toggle.addEventListener('click', (e) => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const nextTheme = isLight ? 'dark' : 'light';
        const nextBg = isLight ? '#0a0a1a' : '#f0f2f5';

        // Get button position for circle origin (top-right)
        const rect = toggle.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // 1) Set overlay to NEXT theme's background color
        overlay.style.background = nextBg;
        overlay.style.setProperty('--cx', cx + 'px');
        overlay.style.setProperty('--cy', cy + 'px');

        // 2) Start circle expanding from toggle button
        overlay.classList.remove('expanding');
        void overlay.offsetWidth;
        overlay.classList.add('expanding');

        // 3) Switch theme when circle fully covers screen
        setTimeout(() => {
            if (nextTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                toggle.textContent = '☀️';
            } else {
                document.documentElement.removeAttribute('data-theme');
                toggle.textContent = '🌙';
            }
            localStorage.setItem('theme', nextTheme);
        }, 600);

        // 4) Clean up after animation
        setTimeout(() => {
            overlay.classList.remove('expanding');
            overlay.style.clipPath = 'circle(0% at 50% 50%)';
            overlay.style.background = 'transparent';
        }, 750);
    });
})();
const App = (() => {
    'use strict';

    const games = [];
    let activeGame = null;

    const homeScreen    = document.getElementById('home-screen');
    const gameScreen    = document.getElementById('game-screen');
    const gameContainer = document.getElementById('game-container');
    const btnHome       = document.getElementById('btn-home');
    const gameGrid      = document.getElementById('game-grid');

    /* Register a game */
    function register(config) {
        // config: { id, title, icon, description, tag, tagClass, init(container), destroy() }
        games.push(config);
    }

    /* Category display order & icons */
    const CATEGORY_META = {
        'Puzzle':     { icon: '🧩', label: 'Logic & Puzzle' },
        'Reflex':     { icon: '⚡', label: 'Reflex & Casual' },
        'Classic':    { icon: '🕹️', label: 'Classic' },
        'Simulation': { icon: '🎮', label: 'Simulation & Action' },
    };

    /* Render home screen cards grouped by category */
    function renderHome() {
        gameGrid.innerHTML = '';

        // Group games by tag
        const groups = {};
        games.forEach(g => {
            const tag = g.tag || 'Other';
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(g);
        });

        // Render in defined order
        const order = Object.keys(CATEGORY_META);
        // Add any tags not in order
        Object.keys(groups).forEach(t => { if (!order.includes(t)) order.push(t); });

        order.forEach(tag => {
            const list = groups[tag];
            if (!list || !list.length) return;

            const meta = CATEGORY_META[tag] || { icon: '🎯', label: tag };

            // Section header
            const header = document.createElement('div');
            header.className = 'section-header';
            header.innerHTML = `<span class="section-icon">${meta.icon}</span> ${meta.label}`;
            gameGrid.appendChild(header);

            // Cards grid for this section
            const grid = document.createElement('div');
            grid.className = 'section-grid';

            list.forEach(g => {
                const card = document.createElement('div');
                card.className = 'game-card';
                card.tabIndex = 0;
                card.innerHTML = `
                    <div class="card-icon">${g.icon}</div>
                    <div class="card-title">${g.title}</div>
                    <div class="card-desc">${g.description}</div>
                    <span class="card-tag ${g.tagClass}">${g.tag}</span>
                `;
                card.addEventListener('click', () => launchGame(g, card));
                card.addEventListener('keydown', e => { if (e.key === 'Enter') launchGame(g, card); });
                grid.appendChild(card);
            });

            gameGrid.appendChild(grid);
        });
    }

    /* Launch a game with card expand animation */
    function launchGame(game, cardEl) {
        activeGame = game;

        if (!cardEl) {
            // Fallback: no animation
            homeScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            gameContainer.innerHTML = '';
            game.init(gameContainer);
            return;
        }

        // Get card position
        const rect = cardEl.getBoundingClientRect();

        // Create expanding clone
        const clone = cardEl.cloneNode(true);
        clone.className = 'game-card card-expand-clone';
        clone.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            margin: 0;
            z-index: 9000;
            pointer-events: none;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: center;
            border-color: var(--accent);
            box-shadow: 0 8px 40px var(--card-hover-shadow);
        `;
        document.body.appendChild(clone);

        // Force reflow then expand to full screen
        void clone.offsetWidth;
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.width = '100vw';
        clone.style.height = '100vh';
        clone.style.borderRadius = '0';
        clone.style.opacity = '0.3';

        // After animation, switch to game screen
        setTimeout(() => {
            clone.remove();
            homeScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            gameContainer.innerHTML = '';
            game.init(gameContainer);
        }, 500);
    }

    /* Go home */
    function goHome() {
        if (activeGame && activeGame.destroy) activeGame.destroy();
        activeGame = null;
        gameScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
    }

    btnHome.addEventListener('click', goHome);

    /* Init on DOMContentLoaded (games register synchronously via script tags) */
    window.addEventListener('DOMContentLoaded', () => {
        renderHome();
    });

    return { register, goHome };
})();
