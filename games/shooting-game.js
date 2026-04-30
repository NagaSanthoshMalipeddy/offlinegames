/* ── 3D Target Shooting Game (Three.js) ──────── */
App.register({
    id: 'shooting-game',
    title: 'Target Shooting',
    icon: '🔫',
    description: 'FPS target practice — aim, shoot, score! Beat the clock.',
    tag: 'Simulation',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = { running: false, raf: null };

        container.innerHTML = `
            <div id="sg-menu" style="display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
                <h2 class="g-title">🔫 TARGET SHOOTING</h2>
                <p style="color:#888;max-width:420px;font-size:0.9rem">First-person target practice. Click to shoot targets before time runs out!</p>
                <div class="g-row">
                    <button class="g-btn sg-d" data-d="easy">Easy (60s)</button>
                    <button class="g-btn sg-d" data-d="medium">Medium (45s)</button>
                    <button class="g-btn sg-d" data-d="hard">Hard (30s)</button>
                </div>
                <p style="color:#555;font-size:0.8rem">Mouse to aim &nbsp;|&nbsp; Click to shoot &nbsp;|&nbsp; WASD to move</p>
            </div>
            <div id="sg-wrap" class="hidden" style="position:relative;width:100%;height:100%;cursor:crosshair">
                <div id="sg-hud" style="position:absolute;top:8px;left:8px;right:8px;z-index:10;display:flex;justify-content:space-between;pointer-events:none;font-size:clamp(0.75rem,2vw,1rem);color:#fff;text-shadow:0 1px 4px #000a">
                    <div>🎯 Hits: <strong id="sg-hits">0</strong></div>
                    <div>⏱️ <strong id="sg-time">60</strong>s</div>
                    <div>💥 Streak: <strong id="sg-streak">0</strong></div>
                    <div>🏆 Score: <strong id="sg-score">0</strong></div>
                </div>
                <div id="sg-ammo" style="position:absolute;bottom:12px;right:16px;z-index:10;pointer-events:none;font-size:1rem;color:#fff;text-shadow:0 1px 3px #000">🔫 <span id="sg-bullets">6</span> / 6 &nbsp;<span id="sg-reload-msg" style="color:#ff4081"></span></div>
                <!-- Crosshair -->
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;pointer-events:none">
                    <svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" stroke="#fff8" stroke-width="1.5" fill="none"/><line x1="20" y1="2" x2="20" y2="12" stroke="#fff8" stroke-width="1.5"/><line x1="20" y1="28" x2="20" y2="38" stroke="#fff8" stroke-width="1.5"/><line x1="2" y1="20" x2="12" y2="20" stroke="#fff8" stroke-width="1.5"/><line x1="28" y1="20" x2="38" y2="20" stroke="#fff8" stroke-width="1.5"/><circle cx="20" cy="20" r="2" fill="#f44"/></svg>
                </div>
                <canvas id="sg-canvas" style="display:block;width:100%;height:100%"></canvas>
                <!-- Hit marker -->
                <div id="sg-hitmark" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:11;pointer-events:none;font-size:1.5rem;opacity:0;transition:opacity 0.15s;color:#ff0">✕</div>

                <div id="sg-over" class="hidden" style="position:absolute;inset:0;background:#000c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;z-index:20">
                    <h2 style="font-size:clamp(1.5rem,5vw,2.5rem);color:#ff4081">TIME'S UP!</h2>
                    <div id="sg-final" style="font-size:1.1rem;color:#ccc;text-align:center"></div>
                    <button class="g-btn" id="sg-retry">Play Again</button>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#sg-menu');
        const wrapEl = container.querySelector('#sg-wrap');
        const canvasEl = container.querySelector('#sg-canvas');
        const overEl = container.querySelector('#sg-over');
        const hitMark = container.querySelector('#sg-hitmark');
        const hudHits = container.querySelector('#sg-hits');
        const hudTime = container.querySelector('#sg-time');
        const hudStreak = container.querySelector('#sg-streak');
        const hudScore = container.querySelector('#sg-score');
        const hudBullets = container.querySelector('#sg-bullets');
        const reloadMsg = container.querySelector('#sg-reload-msg');
        const finalEl = container.querySelector('#sg-final');

        const CLIP_SIZE = 6;
        const RELOAD_TIME = 1.5;
        let scene, camera, renderer, clock;
        let targets = [];
        let score, hits, streak, bestStreak, timeLeft, bullets, reloading;
        let difficulty;
        let timerInterval;
        let euler, camYaw = 0, camPitch = 0;
        const keys = {};
        const playerPos = { x: 0, z: 0 };

        function initThree() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x334455);
            scene.fog = new THREE.Fog(0x334455, 40, 100);

            camera = new THREE.PerspectiveCamera(65, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 200);
            camera.position.set(0, 2, 0);

            renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
            renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
            renderer.shadowMap.enabled = true;

            clock = new THREE.Clock();

            scene.add(new THREE.AmbientLight(0xffffff, 0.4));
            const light = new THREE.DirectionalLight(0xffffff, 0.7);
            light.position.set(10, 30, 5);
            light.castShadow = true;
            scene.add(light);

            // Ground (shooting range)
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 100),
                new THREE.MeshLambertMaterial({ color: 0x445544 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);

            // Walls
            const wallMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
            // Back wall
            const bw = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 0.5), wallMat);
            bw.position.set(0, 3, -25);
            scene.add(bw);
            // Side walls
            for (const side of [-1, 1]) {
                const sw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 50), wallMat);
                sw.position.set(side * 15, 3, 0);
                scene.add(sw);
            }

            // Lane dividers
            const laneMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
            for (let x = -10; x <= 10; x += 5) {
                const lane = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 50), laneMat);
                lane.position.set(x, 0.01, 0);
                scene.add(lane);
            }

            // Ceiling lights
            const lightGeo = new THREE.BoxGeometry(1, 0.2, 12);
            const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
            for (let x = -8; x <= 8; x += 8) {
                const l = new THREE.Mesh(lightGeo, lightMat);
                l.position.set(x, 5.9, -10);
                scene.add(l);
            }

            spawnTargets();
        }

        function spawnTargets() {
            targets.forEach(t => scene.remove(t.group));
            targets = [];

            const count = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 10;
            const targetColors = [0xff4444, 0x44ff44, 0x4488ff, 0xffaa00, 0xff44ff];

            for (let i = 0; i < count; i++) {
                const group = new THREE.Group();

                // Target disc
                const discGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 24);
                const discMat = new THREE.MeshLambertMaterial({ color: targetColors[i % targetColors.length] });
                const disc = new THREE.Mesh(discGeo, discMat);
                disc.rotation.x = Math.PI / 2;
                group.add(disc);

                // Bullseye
                const bullGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16);
                const bullMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const bull = new THREE.Mesh(bullGeo, bullMat);
                bull.rotation.x = Math.PI / 2;
                bull.position.z = -0.05;
                group.add(bull);

                // Stand
                const standGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
                const standMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
                const stand = new THREE.Mesh(standGeo, standMat);
                stand.position.y = -1;
                group.add(stand);

                const x = -10 + Math.random() * 20;
                const z = -8 - Math.random() * 15;
                const y = 1.5 + Math.random() * 2;
                group.position.set(x, y, z);
                scene.add(group);

                const moveType = Math.random();
                targets.push({
                    group,
                    baseX: x, baseY: y, baseZ: z,
                    moveX: moveType < 0.3 ? (1 + Math.random() * 2) : 0,
                    moveY: moveType > 0.6 ? (0.5 + Math.random()) : 0,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.5 + Math.random() * 1.5,
                    alive: true
                });
            }
        }

        function shoot() {
            if (reloading || bullets <= 0 || !s.running) return;

            bullets--;
            hudBullets.textContent = bullets;

            // Raycast from center of screen
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

            let hit = false;
            for (const t of targets) {
                if (!t.alive) continue;
                const intersects = raycaster.intersectObjects(t.group.children, true);
                if (intersects.length > 0) {
                    t.alive = false;
                    scene.remove(t.group);
                    hits++;
                    streak++;
                    if (streak > bestStreak) bestStreak = streak;
                    const pts = 10 + streak * 2;
                    score += pts;
                    hudHits.textContent = hits;
                    hudStreak.textContent = streak;
                    hudScore.textContent = score;

                    // Hit marker flash
                    hitMark.style.opacity = '1';
                    setTimeout(() => hitMark.style.opacity = '0', 200);

                    hit = true;
                    break;
                }
            }

            if (!hit) {
                streak = 0;
                hudStreak.textContent = 0;
            }

            // Auto-reload when empty
            if (bullets <= 0) reload();

            // Respawn targets if all dead
            if (targets.every(t => !t.alive)) {
                setTimeout(spawnTargets, 500);
            }
        }

        function reload() {
            if (reloading) return;
            reloading = true;
            reloadMsg.textContent = 'Reloading...';
            setTimeout(() => {
                bullets = CLIP_SIZE;
                hudBullets.textContent = bullets;
                reloading = false;
                reloadMsg.textContent = '';
            }, RELOAD_TIME * 1000);
        }

        function updateTargets(dt) {
            for (const t of targets) {
                if (!t.alive) continue;
                t.phase += dt * t.speed;
                t.group.position.x = t.baseX + Math.sin(t.phase) * t.moveX;
                t.group.position.y = t.baseY + Math.sin(t.phase * 1.3) * t.moveY;
            }
        }

        function updateCamera() {
            camera.rotation.order = 'YXZ';
            camera.rotation.y = camYaw;
            camera.rotation.x = camPitch;
            // Simple WASD movement
            const spd = 0.08;
            const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
            if (keys['w']) { playerPos.x -= sin * spd; playerPos.z -= cos * spd; }
            if (keys['s']) { playerPos.x += sin * spd; playerPos.z += cos * spd; }
            if (keys['a']) { playerPos.x -= cos * spd; playerPos.z += sin * spd; }
            if (keys['d']) { playerPos.x += cos * spd; playerPos.z -= sin * spd; }
            playerPos.x = Math.max(-14, Math.min(14, playerPos.x));
            playerPos.z = Math.max(-5, Math.min(10, playerPos.z));
            camera.position.x = playerPos.x;
            camera.position.z = playerPos.z;
        }

        function endGame() {
            s.running = false;
            clearInterval(timerInterval);
            let rating;
            if (score >= 200) rating = '🏆 Elite Marksman!';
            else if (score >= 120) rating = '🎯 Sharpshooter!';
            else if (score >= 60) rating = '👍 Nice Shooting';
            else rating = '🎓 Keep Practicing';
            finalEl.innerHTML = `
                <p>Score: <span style="color:#ffeb3b;font-size:1.4rem">${score}</span></p>
                <p>Hits: ${hits} &nbsp;|&nbsp; Best Streak: ${bestStreak}</p>
                <p style="font-size:1.3rem;margin-top:0.5rem">${rating}</p>
            `;
            overEl.classList.remove('hidden');
        }

        /* ── Loop ────────────────────────────────── */
        function animate() {
            if (!s.running) return;
            s.raf = requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.05);
            updateTargets(dt);
            updateCamera();
            renderer.render(scene, camera);
        }

        function startGame(diff) {
            difficulty = diff;
            score = 0; hits = 0; streak = 0; bestStreak = 0;
            bullets = CLIP_SIZE; reloading = false;
            timeLeft = diff === 'easy' ? 60 : diff === 'medium' ? 45 : 30;
            camYaw = 0; camPitch = 0;
            playerPos.x = 0; playerPos.z = 5;

            hudHits.textContent = 0; hudScore.textContent = 0;
            hudStreak.textContent = 0; hudBullets.textContent = bullets;
            hudTime.textContent = timeLeft; reloadMsg.textContent = '';

            menuEl.classList.add('hidden');
            wrapEl.classList.remove('hidden');
            wrapEl.style.display = 'block';
            overEl.classList.add('hidden');

            const w = wrapEl.clientWidth || window.innerWidth;
            const h = wrapEl.clientHeight || window.innerHeight - 50;
            canvasEl.width = w; canvasEl.height = h;

            initThree();
            s.running = true;

            timerInterval = setInterval(() => {
                timeLeft--;
                hudTime.textContent = timeLeft;
                if (timeLeft <= 0) endGame();
            }, 1000);

            animate();
        }

        function resetGame() {
            s.running = false;
            if (s.raf) cancelAnimationFrame(s.raf);
            if (timerInterval) clearInterval(timerInterval);
            if (renderer) {
                renderer.dispose();
                scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose(); } });
            }
            scene = null; camera = null; renderer = null; targets = [];
            startGame(difficulty);
        }

        /* Events */
        s._onKey = e => { keys[e.key.toLowerCase()] = e.type === 'keydown'; if (e.key.toLowerCase() === 'r' && e.type === 'keydown') reload(); };
        document.addEventListener('keydown', s._onKey);
        document.addEventListener('keyup', s._onKey);

        canvasEl.addEventListener('click', e => {
            if (!s.running) return;
            // Request pointer lock for mouse look
            if (!document.pointerLockElement) {
                canvasEl.requestPointerLock();
            }
            shoot();
        });

        s._onMouseMove = e => {
            if (document.pointerLockElement !== canvasEl) return;
            camYaw -= e.movementX * 0.002;
            camPitch -= e.movementY * 0.002;
            camPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camPitch));
        };
        document.addEventListener('mousemove', s._onMouseMove);

        // Touch support (tap to shoot, drag to aim)
        let touchAimId = null;
        canvasEl.addEventListener('touchstart', e => {
            e.preventDefault();
            if (!s.running) return;
            shoot();
            touchAimId = e.touches[0].identifier;
        }, { passive: false });
        canvasEl.addEventListener('touchmove', e => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === touchAimId) {
                    camYaw -= (t.clientX - (canvasEl.clientWidth / 2)) * 0.0001;
                    camPitch -= (t.clientY - (canvasEl.clientHeight / 2)) * 0.0001;
                    camPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, camPitch));
                }
            }
        }, { passive: false });

        s._onResize = () => {
            if (!renderer || !camera) return;
            const w = wrapEl.clientWidth || window.innerWidth;
            const h = wrapEl.clientHeight || window.innerHeight - 50;
            canvasEl.width = w; canvasEl.height = h;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', s._onResize);

        container.querySelector('#sg-menu').addEventListener('click', e => {
            const btn = e.target.closest('.sg-d'); if (btn) startGame(btn.dataset.d);
        });
        container.querySelector('#sg-retry').addEventListener('click', resetGame);
    },

    destroy() {
        const s = this._state; if (!s) return;
        s.running = false;
        if (s.raf) cancelAnimationFrame(s.raf);
        document.removeEventListener('keydown', s._onKey);
        document.removeEventListener('keyup', s._onKey);
        document.removeEventListener('mousemove', s._onMouseMove);
        window.removeEventListener('resize', s._onResize);
        if (document.pointerLockElement) document.exitPointerLock();
        this._state = null;
    }
});
