/* ── App Controller / Router ──────────────────── */
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
        'Simulation': { icon: '🎮', label: 'Simulation & Action' },
        'Puzzle':     { icon: '🧩', label: 'Logic & Puzzle' },
        'Reflex':     { icon: '⚡', label: 'Reflex & Casual' },
        'Classic':    { icon: '🕹️', label: 'Classic' },
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
                card.addEventListener('click', () => launchGame(g));
                card.addEventListener('keydown', e => { if (e.key === 'Enter') launchGame(g); });
                grid.appendChild(card);
            });

            gameGrid.appendChild(grid);
        });
    }

    /* Launch a game */
    function launchGame(game) {
        activeGame = game;
        homeScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        gameContainer.innerHTML = '';
        game.init(gameContainer);
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
