/* ── 3D Archery Game (Three.js) ───────────────── */
App.register({
    id: 'archery-game',
    title: 'Archery',
    icon: '🏹',
    description: 'Aim, draw, and shoot arrows at the target — bullseye for max points!',
    tag: 'Simulation',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = { running: false, raf: null };

        container.innerHTML = `
            <div id="ar-menu" style="display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
                <h2 class="g-title">🏹 ARCHERY</h2>
                <p style="color:#888;max-width:400px;font-size:0.9rem">Click & drag to aim. Release to shoot. Hit the bullseye!</p>
                <div class="g-row">
                    <button class="g-btn" id="ar-start">Start Game</button>
                </div>
                <p style="color:#555;font-size:0.8rem">Click & drag down to aim up, left/right to aim sideways</p>
            </div>
            <div id="ar-wrap" class="hidden" style="position:relative;width:100%;height:100%">
                <div id="ar-hud" style="position:absolute;top:8px;left:8px;right:8px;z-index:10;display:flex;justify-content:space-between;pointer-events:none;font-size:clamp(0.75rem,2vw,1rem);color:#fff;text-shadow:0 1px 4px #000a">
                    <div>🏹 Arrows: <strong id="ar-arrows">10</strong></div>
                    <div>🎯 Score: <strong id="ar-score">0</strong></div>
                    <div>Round: <strong id="ar-round">1</strong>/10</div>
                </div>
                <div id="ar-wind" style="position:absolute;top:30px;left:50%;transform:translateX(-50%);z-index:10;pointer-events:none;font-size:0.85rem;color:#adf;text-shadow:0 1px 3px #000">🌬️ Wind: <span id="ar-wind-val">0</span></div>
                <!-- crosshair -->
                <div id="ar-cross" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;pointer-events:none;font-size:2rem;color:#fff8;text-shadow:0 0 6px #000">+</div>
                <canvas id="ar-canvas" style="display:block;width:100%;height:100%"></canvas>
                <!-- power bar -->
                <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);z-index:10;pointer-events:none;width:clamp(120px,40vw,200px);height:12px;background:#0005;border-radius:6px;overflow:hidden">
                    <div id="ar-power" style="height:100%;width:0%;background:linear-gradient(90deg,#4caf50,#ffeb3b,#f44336);border-radius:6px;transition:width 0.05s"></div>
                </div>
                <div id="ar-over" class="hidden" style="position:absolute;inset:0;background:#000c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;z-index:20">
                    <h2 style="font-size:clamp(1.5rem,5vw,2.5rem);color:#ffeb3b">GAME OVER</h2>
                    <div id="ar-final" style="font-size:1.2rem;color:#ccc;text-align:center"></div>
                    <button class="g-btn" id="ar-retry">Play Again</button>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#ar-menu');
        const wrapEl = container.querySelector('#ar-wrap');
        const canvasEl = container.querySelector('#ar-canvas');
        const overEl = container.querySelector('#ar-over');
        const powerBar = container.querySelector('#ar-power');
        const hudArrows = container.querySelector('#ar-arrows');
        const hudScore = container.querySelector('#ar-score');
        const hudRound = container.querySelector('#ar-round');
        const hudWind = container.querySelector('#ar-wind-val');
        const finalEl = container.querySelector('#ar-final');

        const TOTAL_ARROWS = 10;
        const GRAVITY = 9.81;
        const TARGET_DIST = 40;

        let scene, camera, renderer, clock;
        let targetGroup, arrowMesh;
        let arrows = [], activeArrow = null;
        let score, arrowsLeft, round;
        let wind, targetMoving, targetOscY;
        let dragging = false, dragStart = null, aimX = 0, aimY = 0, power = 0;

        function initThree() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x5599cc);
            scene.fog = new THREE.Fog(0x5599cc, 60, 150);

            camera = new THREE.PerspectiveCamera(55, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 200);
            camera.position.set(0, 2, 0);
            camera.lookAt(0, 2, -TARGET_DIST);

            renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
            renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
            renderer.shadowMap.enabled = true;

            clock = new THREE.Clock();

            // Lights
            scene.add(new THREE.AmbientLight(0xffffff, 0.5));
            const sun = new THREE.DirectionalLight(0xffffff, 0.8);
            sun.position.set(20, 40, 10);
            sun.castShadow = true;
            scene.add(sun);

            // Ground
            const groundGeo = new THREE.PlaneGeometry(200, 200);
            const groundMat = new THREE.MeshLambertMaterial({ color: 0x4a8c3f });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);

            // Distant mountains
            for (let i = 0; i < 8; i++) {
                const h = 15 + Math.random() * 25;
                const geo = new THREE.ConeGeometry(12 + Math.random() * 15, h, 5);
                const mat = new THREE.MeshLambertMaterial({ color: 0x556677 });
                const m = new THREE.Mesh(geo, mat);
                m.position.set(-60 + i * 17 + Math.random() * 10, h / 2, -80 - Math.random() * 30);
                scene.add(m);
            }

            // Trees
            for (let i = 0; i < 12; i++) {
                const tx = -20 + Math.random() * 40;
                const tz = -10 - Math.random() * 50;
                if (Math.abs(tx) < 4 && tz > -TARGET_DIST - 5) continue;
                addTree(tx, tz);
            }

            // Target
            buildTarget();

            // Bow hint (visual)
            const bowGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 24, Math.PI);
            const bowMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const bow = new THREE.Mesh(bowGeo, bowMat);
            bow.position.set(0.4, 1.5, -0.8);
            bow.rotation.z = Math.PI / 2;
            scene.add(bow);
        }

        function addTree(x, z) {
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.25, 2.5, 6),
                new THREE.MeshLambertMaterial({ color: 0x8B4513 })
            );
            trunk.position.set(x, 1.25, z);
            scene.add(trunk);

            const leaf = new THREE.Mesh(
                new THREE.ConeGeometry(1.5, 3, 6),
                new THREE.MeshLambertMaterial({ color: 0x2d7a2d })
            );
            leaf.position.set(x, 3.5, z);
            scene.add(leaf);
        }

        function buildTarget() {
            targetGroup = new THREE.Group();
            const rings = [
                { r: 2.0, color: 0xffffff },
                { r: 1.6, color: 0x333333 },
                { r: 1.2, color: 0x2196F3 },
                { r: 0.8, color: 0xf44336 },
                { r: 0.4, color: 0xffeb3b },
            ];
            rings.forEach((ring, i) => {
                const geo = new THREE.CylinderGeometry(ring.r, ring.r, 0.15, 32);
                const mat = new THREE.MeshLambertMaterial({ color: ring.color });
                const m = new THREE.Mesh(geo, mat);
                m.rotation.x = Math.PI / 2;
                m.position.z = -0.01 * i;
                targetGroup.add(m);
            });
            // Stand
            const standGeo = new THREE.BoxGeometry(0.2, 3, 0.2);
            const standMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const stand = new THREE.Mesh(standGeo, standMat);
            stand.position.set(0, -1.5, 0.2);
            targetGroup.add(stand);

            targetGroup.position.set(0, 2.5, -TARGET_DIST);
            scene.add(targetGroup);
        }

        function createArrow() {
            const group = new THREE.Group();
            // Shaft
            const shaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6),
                new THREE.MeshLambertMaterial({ color: 0xc49a6c })
            );
            shaft.rotation.x = Math.PI / 2;
            group.add(shaft);
            // Tip
            const tip = new THREE.Mesh(
                new THREE.ConeGeometry(0.04, 0.15, 6),
                new THREE.MeshLambertMaterial({ color: 0x888888 })
            );
            tip.rotation.x = -Math.PI / 2;
            tip.position.z = -0.65;
            group.add(tip);
            // Feathers
            const featherMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
            for (let i = 0; i < 3; i++) {
                const f = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.15), featherMat);
                f.position.z = 0.55;
                f.rotation.y = (i / 3) * Math.PI * 2;
                group.add(f);
            }
            return group;
        }

        function shootArrow() {
            if (arrowsLeft <= 0 || activeArrow) return;

            const arrow = createArrow();
            arrow.position.set(0, 2, -1);
            scene.add(arrow);

            const angleY = aimX * 0.3;
            const angleX = aimY * 0.4 + 0.05;
            const v = 25 + power * 25;

            const vx = Math.sin(angleY) * v + wind * 0.5;
            const vy = Math.sin(angleX) * v;
            const vz = -Math.cos(angleY) * Math.cos(angleX) * v;

            activeArrow = {
                mesh: arrow,
                vx, vy, vz,
                x: 0, y: 2, z: -1,
                time: 0,
                stuck: false
            };
            arrows.push(activeArrow);
            arrowsLeft--;
            hudArrows.textContent = arrowsLeft;
        }

        function updateArrows(dt) {
            if (!activeArrow || activeArrow.stuck) return;

            const a = activeArrow;
            a.time += dt;
            a.vx += wind * dt * 0.8;
            a.vy -= GRAVITY * dt;

            a.x += a.vx * dt;
            a.y += a.vy * dt;
            a.z += a.vz * dt;

            a.mesh.position.set(a.x, a.y, a.z);

            // Point arrow in direction of travel
            const dir = new THREE.Vector3(a.vx, a.vy, a.vz).normalize();
            a.mesh.lookAt(a.x + dir.x, a.y + dir.y, a.z + dir.z);

            // Check target hit
            const tPos = targetGroup.position;
            const dx = a.x - tPos.x;
            const dy = a.y - tPos.y;
            const dz = a.z - tPos.z;
            const distToTarget = Math.sqrt(dx * dx + dz * dz);

            if (Math.abs(dz) < 0.5 && a.z < tPos.z + 0.5) {
                const hitDist = Math.sqrt(dx * dx + dy * dy);
                if (hitDist < 2.2) {
                    a.stuck = true;
                    a.mesh.position.z = tPos.z + 0.1;
                    let pts = 0;
                    if (hitDist < 0.4) pts = 10;
                    else if (hitDist < 0.8) pts = 8;
                    else if (hitDist < 1.2) pts = 6;
                    else if (hitDist < 1.6) pts = 4;
                    else pts = 2;
                    score += pts;
                    hudScore.textContent = score;
                    showHitFeedback(pts);
                    activeArrow = null;
                    round++;
                    hudRound.textContent = Math.min(round, TOTAL_ARROWS);
                    nextRound();
                    return;
                }
            }

            // Miss (ground or too far)
            if (a.y < 0 || a.z < -(TARGET_DIST + 20) || a.time > 5) {
                a.stuck = true;
                activeArrow = null;
                showHitFeedback(0);
                round++;
                hudRound.textContent = Math.min(round, TOTAL_ARROWS);
                nextRound();
            }
        }

        let hitText = null;
        function showHitFeedback(pts) {
            if (hitText) scene.remove(hitText);
            // Use a sprite-like plane with canvas texture
            const canvas2 = document.createElement('canvas');
            canvas2.width = 256; canvas2.height = 64;
            const ctx2 = canvas2.getContext('2d');
            ctx2.font = 'bold 48px sans-serif';
            ctx2.textAlign = 'center';
            ctx2.fillStyle = pts >= 8 ? '#ffeb3b' : pts >= 4 ? '#4caf50' : pts > 0 ? '#aaa' : '#f44336';
            ctx2.fillText(pts > 0 ? `+${pts}` : 'Miss!', 128, 48);
            const tex = new THREE.CanvasTexture(canvas2);
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            hitText = new THREE.Sprite(mat);
            hitText.scale.set(4, 1, 1);
            hitText.position.set(0, 5, -TARGET_DIST + 2);
            scene.add(hitText);
            setTimeout(() => { if (hitText) { scene.remove(hitText); hitText = null; } }, 1200);
        }

        function nextRound() {
            if (round > TOTAL_ARROWS) {
                endGame();
                return;
            }
            wind = (Math.random() - 0.5) * 6;
            hudWind.textContent = (wind > 0 ? '→ ' : '← ') + Math.abs(wind).toFixed(1);

            // Slight target position change each round
            if (round > 3) {
                targetMoving = true;
                targetOscY = 0;
            }
        }

        function updateTarget(dt) {
            if (targetMoving) {
                targetOscY += dt * 1.5;
                targetGroup.position.y = 2.5 + Math.sin(targetOscY) * 1.2;
                targetGroup.position.x = Math.sin(targetOscY * 0.7) * 1.5;
            }
        }

        function endGame() {
            const maxScore = TOTAL_ARROWS * 10;
            let rating;
            if (score >= 80) rating = '🏆 Master Archer!';
            else if (score >= 60) rating = '🎯 Sharpshooter!';
            else if (score >= 40) rating = '👍 Good Aim';
            else rating = '🤷 Keep Practicing';

            finalEl.innerHTML = `
                <p>Score: <span style="color:#ffeb3b;font-size:1.5rem">${score}</span> / ${maxScore}</p>
                <p style="font-size:1.4rem;margin-top:0.5rem">${rating}</p>
            `;
            overEl.classList.remove('hidden');
        }

        /* ── Input ───────────────────────────────── */
        function onPointerDown(e) {
            if (activeArrow || !s.running) return;
            dragging = true;
            const rect = canvasEl.getBoundingClientRect();
            dragStart = { x: (e.clientX || e.touches[0].clientX), y: (e.clientY || e.touches[0].clientY) };
        }

        function onPointerMove(e) {
            if (!dragging || !dragStart) return;
            const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            const dx = cx - dragStart.x;
            const dy = cy - dragStart.y;
            aimX = -dx / 200;
            aimY = dy / 200;
            power = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 200);
            powerBar.style.width = (power * 100) + '%';
        }

        function onPointerUp() {
            if (!dragging) return;
            dragging = false;
            if (power > 0.05) shootArrow();
            power = 0; aimX = 0; aimY = 0;
            powerBar.style.width = '0%';
        }

        /* ── Loop ────────────────────────────────── */
        function animate() {
            if (!s.running) return;
            s.raf = requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.05);
            updateArrows(dt);
            updateTarget(dt);
            renderer.render(scene, camera);
        }

        function startGame() {
            score = 0; arrowsLeft = TOTAL_ARROWS; round = 1;
            wind = (Math.random() - 0.5) * 4;
            targetMoving = false; targetOscY = 0;
            arrows = []; activeArrow = null;

            hudArrows.textContent = arrowsLeft;
            hudScore.textContent = 0;
            hudRound.textContent = 1;
            hudWind.textContent = (wind > 0 ? '→ ' : '← ') + Math.abs(wind).toFixed(1);

            menuEl.classList.add('hidden');
            wrapEl.classList.remove('hidden');
            wrapEl.style.display = 'block';
            overEl.classList.add('hidden');

            const w = wrapEl.clientWidth || window.innerWidth;
            const h = wrapEl.clientHeight || window.innerHeight - 50;
            canvasEl.width = w; canvasEl.height = h;

            initThree();
            s.running = true;
            animate();
        }

        function resetGame() {
            s.running = false;
            if (s.raf) cancelAnimationFrame(s.raf);
            if (renderer) {
                renderer.dispose();
                scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose(); } });
            }
            scene = null; camera = null; renderer = null;
            startGame();
        }

        /* Events */
        canvasEl.addEventListener('mousedown', onPointerDown);
        canvasEl.addEventListener('mousemove', onPointerMove);
        canvasEl.addEventListener('mouseup', onPointerUp);
        canvasEl.addEventListener('mouseleave', onPointerUp);
        canvasEl.addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, { passive: false });
        canvasEl.addEventListener('touchmove', e => { e.preventDefault(); onPointerMove(e); }, { passive: false });
        canvasEl.addEventListener('touchend', e => { e.preventDefault(); onPointerUp(); }, { passive: false });

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

        container.querySelector('#ar-start').addEventListener('click', startGame);
        container.querySelector('#ar-retry').addEventListener('click', resetGame);
    },

    destroy() {
        const s = this._state; if (!s) return;
        s.running = false;
        if (s.raf) cancelAnimationFrame(s.raf);
        window.removeEventListener('resize', s._onResize);
        this._state = null;
    }
});
