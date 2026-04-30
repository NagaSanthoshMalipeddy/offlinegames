/* ── 3D Train Simulator (Three.js) ────────────── */
App.register({
    id: 'train-sim',
    title: 'Train Simulator',
    icon: '🚆',
    description: 'Drive a train along the track — stop at stations, follow signals!',
    tag: 'Simulation',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = { running: false, raf: null };

        container.innerHTML = `
            <div id="ts-menu" style="display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
                <h2 class="g-title">🚆 TRAIN SIMULATOR</h2>
                <p style="color:#888;max-width:420px;font-size:0.9rem">Control your train's speed. Stop accurately at stations. Follow signals!</p>
                <button class="g-btn" id="ts-start">Start Route</button>
                <p style="color:#555;font-size:0.8rem">W/↑ Throttle up &nbsp;|&nbsp; S/↓ Brake &nbsp;|&nbsp; Space Emergency brake</p>
            </div>
            <div id="ts-wrap" class="hidden" style="position:relative;width:100%;height:100%">
                <div id="ts-hud" style="position:absolute;top:8px;left:8px;right:8px;z-index:10;display:flex;justify-content:space-between;pointer-events:none;font-size:clamp(0.7rem,2vw,0.95rem);color:#fff;text-shadow:0 1px 4px #000a">
                    <div>
                        <div>🏎️ Speed: <strong id="ts-speed">0</strong> km/h</div>
                        <div>⚡ Throttle: <strong id="ts-throttle">0</strong>%</div>
                    </div>
                    <div style="text-align:center">
                        <div id="ts-signal" style="font-size:1.2rem">🟢</div>
                        <div id="ts-next" style="color:#ffeb3b;font-weight:600"></div>
                    </div>
                    <div style="text-align:right">
                        <div>📏 <span id="ts-dist">0</span>m</div>
                        <div>🏆 Score: <strong id="ts-score">0</strong></div>
                        <div>🚉 Station: <span id="ts-station">1</span>/5</div>
                    </div>
                </div>
                <!-- Throttle/brake controls (mobile) -->
                <div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;z-index:10;pointer-events:none">
                    <div style="display:flex;gap:8px;pointer-events:auto">
                        <button class="dg-ctrl" id="ts-t-brake" style="width:60px;height:60px;border-radius:50%;border:2px solid #f444;background:#f002;color:#fff;font-size:0.8rem">BRAKE</button>
                        <button class="dg-ctrl" id="ts-t-ebrake" style="width:60px;height:60px;border-radius:50%;border:2px solid #f008;background:#f004;color:#fff;font-size:0.7rem">E-BRAKE</button>
                    </div>
                    <div style="display:flex;gap:8px;pointer-events:auto">
                        <button class="dg-ctrl" id="ts-t-down" style="width:60px;height:60px;border-radius:50%;border:2px solid #fff4;background:#0004;color:#fff;font-size:1rem">▼</button>
                        <button class="dg-ctrl" id="ts-t-up" style="width:60px;height:60px;border-radius:50%;border:2px solid #4f44;background:#0f02;color:#fff;font-size:1rem">▲</button>
                    </div>
                </div>
                <canvas id="ts-canvas" style="display:block;width:100%;height:100%"></canvas>
                <div id="ts-msg" style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);z-index:15;pointer-events:none;font-size:clamp(1rem,4vw,1.8rem);font-weight:700;color:#fff;text-shadow:0 2px 8px #000;text-align:center;opacity:0;transition:opacity 0.5s"></div>
                <div id="ts-over" class="hidden" style="position:absolute;inset:0;background:#000c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;z-index:20">
                    <h2 style="font-size:clamp(1.5rem,5vw,2.5rem);color:#4caf50">ROUTE COMPLETE!</h2>
                    <div id="ts-final" style="font-size:1.1rem;color:#ccc;text-align:center"></div>
                    <button class="g-btn" id="ts-retry">Drive Again</button>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#ts-menu');
        const wrapEl = container.querySelector('#ts-wrap');
        const canvasEl = container.querySelector('#ts-canvas');
        const overEl = container.querySelector('#ts-over');
        const msgEl = container.querySelector('#ts-msg');
        const hudSpeed = container.querySelector('#ts-speed');
        const hudThrottle = container.querySelector('#ts-throttle');
        const hudDist = container.querySelector('#ts-dist');
        const hudScore = container.querySelector('#ts-score');
        const hudSignal = container.querySelector('#ts-signal');
        const hudNext = container.querySelector('#ts-next');
        const hudStation = container.querySelector('#ts-station');
        const finalEl = container.querySelector('#ts-final');

        let scene, camera, renderer, clock;
        let trainGroup;
        let trackPoints = [], trackLength;
        let t = 0; // parameter along curve [0,1]
        let speed = 0, throttle = 0, score = 0;
        let stations = [], signals = [];
        let currentStation = 0, stoppedAtStation = false;
        let gameFinished = false;
        const keys = {};
        const touchState = { up: false, down: false, brake: false, ebrake: false };

        const TRACK_RADIUS = 100;
        const MAX_SPEED = 1.2;
        const ACCEL = 0.006;
        const BRAKE_FORCE = 0.012;
        const EBRAKE_FORCE = 0.04;
        const FRICTION = 0.0008;
        const NUM_STATIONS = 5;
        let cachedCurve = null;

        function buildTrack() {
            // Interesting figure-8 / scenic route with varied terrain
            const pts = [];
            const segs = 300;
            const R = TRACK_RADIUS;
            for (let i = 0; i <= segs; i++) {
                const a = (i / segs) * Math.PI * 2;
                // Figure-8 lemniscate shape for interesting crossover
                const denom = 1 + Math.sin(a) * Math.sin(a);
                const x = R * 1.3 * Math.cos(a) / denom;
                const z = R * 1.3 * Math.sin(a) * Math.cos(a) / denom;
                // Rolling hills with a bridge section
                const y = Math.sin(a * 3) * 4 + Math.sin(a * 7) * 1.5 + Math.max(0, Math.sin(a * 2) * 6);
                pts.push(new THREE.Vector3(x, y, z));
            }
            return new THREE.CatmullRomCurve3(pts, true);
        }

        function initThree() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x6699cc);
            scene.fog = new THREE.Fog(0x6699cc, 80, 250);

            camera = new THREE.PerspectiveCamera(55, canvasEl.clientWidth / canvasEl.clientHeight, 0.5, 300);
            renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
            renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
            renderer.shadowMap.enabled = true;
            clock = new THREE.Clock();

            scene.add(new THREE.AmbientLight(0xffffff, 0.5));
            const sun = new THREE.DirectionalLight(0xffffff, 0.8);
            sun.position.set(40, 60, 20);
            sun.castShadow = true;
            scene.add(sun);

            // Ground
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(400, 400),
                new THREE.MeshLambertMaterial({ color: 0x4a7a3a })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.5;
            ground.receiveShadow = true;
            scene.add(ground);

            // Track curve
            const curve = buildTrack();
            cachedCurve = curve;
            trackPoints = curve.getPoints(500);
            trackLength = curve.getLength();

            // Visible rails (two parallel rails)
            const railMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
            for (const offset of [-0.6, 0.6]) {
                const railPts = [];
                for (let i = 0; i <= 500; i++) {
                    const frac = i / 500;
                    const pt = curve.getPointAt(frac);
                    const tan = curve.getTangentAt(frac);
                    const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
                    railPts.push(pt.clone().add(norm.clone().multiplyScalar(offset)));
                }
                const railCurve = new THREE.CatmullRomCurve3(railPts, true);
                const railGeo = new THREE.TubeGeometry(railCurve, 400, 0.06, 4, true);
                const rail = new THREE.Mesh(railGeo, railMat);
                rail.receiveShadow = true;
                scene.add(rail);
            }

            // Railroad ties
            for (let i = 0; i < 400; i++) {
                const tFrac = i / 400;
                const pt = curve.getPointAt(tFrac);
                const tangent = curve.getTangentAt(tFrac);
                const tie = new THREE.Mesh(
                    new THREE.BoxGeometry(2.5, 0.15, 0.3),
                    new THREE.MeshLambertMaterial({ color: 0x6b4226 })
                );
                tie.position.copy(pt);
                tie.position.y -= 0.15;
                tie.lookAt(pt.clone().add(tangent));
                scene.add(tie);
            }

            // Gravel bed
            const gravelPath = new THREE.TubeGeometry(curve, 300, 1.5, 4, true);
            const gravelMat = new THREE.MeshLambertMaterial({ color: 0x777766 });
            const gravel = new THREE.Mesh(gravelPath, gravelMat);
            gravel.position.y = -0.3;
            scene.add(gravel);

            // Stations
            stations = [];
            for (let i = 0; i < NUM_STATIONS; i++) {
                const stFrac = (i + 0.5) / NUM_STATIONS;
                const pt = curve.getPointAt(stFrac);
                const tangent = curve.getTangentAt(stFrac);
                const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

                // Platform
                const platform = new THREE.Mesh(
                    new THREE.BoxGeometry(8, 0.5, 3),
                    new THREE.MeshLambertMaterial({ color: 0xbbaa88 })
                );
                const platPos = pt.clone().add(normal.clone().multiplyScalar(3));
                platform.position.copy(platPos);
                platform.position.y += 0.1;
                platform.lookAt(platform.position.clone().add(tangent));
                scene.add(platform);

                // Shelter roof
                const roof = new THREE.Mesh(
                    new THREE.BoxGeometry(6, 0.2, 2.5),
                    new THREE.MeshLambertMaterial({ color: 0xcc4444 })
                );
                roof.position.copy(platPos);
                roof.position.y += 3;
                scene.add(roof);

                // Pillars
                for (const ox of [-2.5, 2.5]) {
                    const pillar = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.1, 0.1, 2.8, 6),
                        new THREE.MeshLambertMaterial({ color: 0x888888 })
                    );
                    pillar.position.copy(platPos);
                    pillar.position.y += 1.5;
                    pillar.position.x += ox * Math.cos(Math.atan2(tangent.x, tangent.z));
                    pillar.position.z += ox * Math.sin(Math.atan2(tangent.x, tangent.z));
                    scene.add(pillar);
                }

                // Station name sign
                const namesArr = ['Greenville', 'Hillside', 'Lakewood', 'Pine Ridge', 'Central'];
                stations.push({ t: stFrac, name: namesArr[i], pos: pt.clone() });
            }

            // Signals
            signals = [];
            for (let i = 0; i < 8; i++) {
                const sFrac = (i * 0.125 + 0.06) % 1;
                const pt = curve.getPointAt(sFrac);
                const tangent = curve.getTangentAt(sFrac);
                const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

                const pole = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06, 0.06, 4, 6),
                    new THREE.MeshLambertMaterial({ color: 0x444444 })
                );
                const polePos = pt.clone().add(normal.clone().multiplyScalar(-2.5));
                pole.position.copy(polePos);
                pole.position.y += 2;
                scene.add(pole);

                const lightGeo = new THREE.SphereGeometry(0.2, 8, 8);
                const isRed = Math.random() < 0.3;
                const lightMat = new THREE.MeshBasicMaterial({ color: isRed ? 0xff0000 : 0x00ff00 });
                const light = new THREE.Mesh(lightGeo, lightMat);
                light.position.copy(polePos);
                light.position.y += 4;
                scene.add(light);

                signals.push({ t: sFrac, isRed, lightMesh: light, pos: pt.clone() });
            }

            // Trees along track
            for (let i = 0; i < 60; i++) {
                const treeT = Math.random();
                const pt = curve.getPointAt(treeT);
                const tangent = curve.getTangentAt(treeT);
                const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
                const side = Math.random() < 0.5 ? 1 : -1;
                const dist = 5 + Math.random() * 15;
                const treePos = pt.clone().add(normal.clone().multiplyScalar(side * dist));
                addTree(treePos.x, treePos.z);
            }

            // Build train
            buildTrain(curve);
        }

        function addTree(x, z) {
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, 2.5, 6),
                new THREE.MeshLambertMaterial({ color: 0x6b4226 })
            );
            trunk.position.set(x, 1.25, z);
            trunk.castShadow = true;
            scene.add(trunk);

            const leaf = new THREE.Mesh(
                new THREE.SphereGeometry(1.8, 6, 6),
                new THREE.MeshLambertMaterial({ color: 0x2a6e2a })
            );
            leaf.position.set(x, 3.5, z);
            leaf.castShadow = true;
            scene.add(leaf);
        }

        function buildTrain(curve) {
            trainGroup = new THREE.Group();

            // Locomotive body
            const bodyGeo = new THREE.BoxGeometry(2.5, 2, 6);
            const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 1.5;
            body.castShadow = true;
            trainGroup.add(body);

            // Cabin
            const cabGeo = new THREE.BoxGeometry(2.3, 1.5, 2.5);
            const cabMat = new THREE.MeshLambertMaterial({ color: 0x3366cc });
            const cab = new THREE.Mesh(cabGeo, cabMat);
            cab.position.set(0, 3, -1);
            trainGroup.add(cab);

            // Window
            const winGeo = new THREE.PlaneGeometry(1.8, 0.8);
            const winMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });
            const win = new THREE.Mesh(winGeo, winMat);
            win.position.set(0, 3.2, 0.26);
            trainGroup.add(win);

            // Headlight
            const hlGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const hlMat = new THREE.MeshBasicMaterial({ color: 0xffff88 });
            const hl = new THREE.Mesh(hlGeo, hlMat);
            hl.position.set(0, 1.5, 3.01);
            trainGroup.add(hl);

            // Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
            const wheelMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
            for (const wz of [-2, 0, 2]) {
                for (const wx of [-1.3, 1.3]) {
                    const w = new THREE.Mesh(wheelGeo, wheelMat);
                    w.rotation.z = Math.PI / 2;
                    w.position.set(wx, 0.4, wz);
                    trainGroup.add(w);
                }
            }

            // Chimney
            const chimney = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.35, 1.2, 8),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            chimney.position.set(0, 3.2, 2);
            trainGroup.add(chimney);

            scene.add(trainGroup);
        }

        function showMsg(text) {
            msgEl.textContent = text;
            msgEl.style.opacity = '1';
            setTimeout(() => msgEl.style.opacity = '0', 2000);
        }

        /* ── Update ──────────────────────────────── */
        function update(dt) {
            if (gameFinished) return;

            // Controls
            const accelUp = keys['w'] || keys['arrowup'] || touchState.up;
            const brk = keys['s'] || keys['arrowdown'] || touchState.brake;
            const ebrk = keys[' '] || touchState.ebrake;
            const decel = keys['a'] || keys['arrowleft'] || touchState.down;

            if (accelUp && !ebrk) throttle = Math.min(100, throttle + 40 * dt);
            else if (decel) throttle = Math.max(0, throttle - 40 * dt);
            if (brk) throttle = 0;

            // Physics
            speed += throttle * ACCEL * dt * 60;
            if (brk) speed = Math.max(0, speed - BRAKE_FORCE * dt * 60);
            if (ebrk) speed = Math.max(0, speed - EBRAKE_FORCE * dt * 60);
            speed = Math.max(0, speed - FRICTION * dt * 60);
            speed = Math.min(MAX_SPEED, speed);

            // Move along track
            t = (t + speed * dt / trackLength) % 1;

            // Position train
            const pos = cachedCurve.getPointAt(t);
            const tangent = cachedCurve.getTangentAt(t);
            const lookAt = pos.clone().add(tangent);

            trainGroup.position.copy(pos);
            trainGroup.lookAt(lookAt);

            // Camera behind train
            const camOffset = tangent.clone().multiplyScalar(-12);
            camOffset.y = 6;
            const camTarget = pos.clone().add(camOffset);
            camera.position.lerp(camTarget, 0.04);
            camera.lookAt(pos.x, pos.y + 2, pos.z);

            // Distance
            const dist = t * trackLength;
            hudDist.textContent = Math.round(dist);
            hudSpeed.textContent = Math.round(speed * 120);
            hudThrottle.textContent = Math.round(throttle);

            // Check station proximity
            if (currentStation < stations.length) {
                const st = stations[currentStation];
                const stDist = pos.distanceTo(st.pos);
                hudNext.textContent = `Next: ${st.name} (${Math.round(stDist)}m)`;

                if (stDist < 8) {
                    if (speed < 0.005 && !stoppedAtStation) {
                        stoppedAtStation = true;
                        const accuracy = Math.max(0, 100 - Math.round(stDist * 15));
                        score += accuracy;
                        hudScore.textContent = score;
                        showMsg(`🚉 ${st.name} — Stop accuracy: ${accuracy}%`);
                        currentStation++;
                        hudStation.textContent = Math.min(currentStation + 1, NUM_STATIONS);
                        setTimeout(() => { stoppedAtStation = false; }, 1000);

                        if (currentStation >= stations.length) {
                            setTimeout(() => finishGame(), 2000);
                        }
                    }
                } else {
                    stoppedAtStation = false;
                }
            }

            // Signal check
            let nearestSignal = null;
            let nearestSignalDist = Infinity;
            for (const sig of signals) {
                const d = pos.distanceTo(sig.pos);
                if (d < nearestSignalDist) { nearestSignalDist = d; nearestSignal = sig; }
            }
            if (nearestSignal) {
                hudSignal.textContent = nearestSignal.isRed ? '🔴' : '🟢';
                if (nearestSignal.isRed && nearestSignalDist < 5 && speed > 0.02) {
                    score = Math.max(0, score - 20);
                    hudScore.textContent = score;
                    showMsg('⚠️ Red signal violation! -20 pts');
                    nearestSignal.isRed = false;
                    nearestSignal.lightMesh.material.color.set(0x00ff00);
                }
            }

            // Toggle signals periodically
            if (Math.random() < 0.002) {
                const sig = signals[Math.floor(Math.random() * signals.length)];
                sig.isRed = !sig.isRed;
                sig.lightMesh.material.color.set(sig.isRed ? 0xff0000 : 0x00ff00);
            }
        }

        function finishGame() {
            gameFinished = true;
            let rating;
            if (score >= 400) rating = '🏆 Master Engineer!';
            else if (score >= 300) rating = '🚂 Expert Driver';
            else if (score >= 200) rating = '👍 Good Job';
            else rating = '🎓 Trainee';
            finalEl.innerHTML = `
                <p>Score: <span style="color:#4caf50;font-size:1.4rem">${score}</span></p>
                <p>Stations: ${currentStation}/${NUM_STATIONS}</p>
                <p style="font-size:1.3rem;margin-top:0.5rem">${rating}</p>
            `;
            overEl.classList.remove('hidden');
        }

        /* ── Loop ────────────────────────────────── */
        function animate() {
            if (!s.running) return;
            s.raf = requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 0.05);
            update(dt);
            renderer.render(scene, camera);
        }

        function startGame() {
            speed = 0; throttle = 0; t = 0; score = 0;
            currentStation = 0; stoppedAtStation = false; gameFinished = false;
            hudScore.textContent = 0; hudStation.textContent = 1;

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
            stations = []; signals = [];
            startGame();
        }

        /* Events */
        s._onKey = e => { keys[e.key.toLowerCase()] = e.type === 'keydown'; };
        document.addEventListener('keydown', s._onKey);
        document.addEventListener('keyup', s._onKey);

        function setupTouch(id, key) {
            const el = container.querySelector(id);
            if (!el) return;
            el.addEventListener('touchstart', e => { e.preventDefault(); touchState[key] = true; }, { passive: false });
            el.addEventListener('touchend', e => { e.preventDefault(); touchState[key] = false; }, { passive: false });
            el.addEventListener('touchcancel', () => touchState[key] = false);
            el.addEventListener('mousedown', () => touchState[key] = true);
            el.addEventListener('mouseup', () => touchState[key] = false);
            el.addEventListener('mouseleave', () => touchState[key] = false);
        }
        setupTouch('#ts-t-up', 'up');
        setupTouch('#ts-t-down', 'down');
        setupTouch('#ts-t-brake', 'brake');
        setupTouch('#ts-t-ebrake', 'ebrake');

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

        container.querySelector('#ts-start').addEventListener('click', startGame);
        container.querySelector('#ts-retry').addEventListener('click', resetGame);
    },

    destroy() {
        const s = this._state; if (!s) return;
        s.running = false;
        if (s.raf) cancelAnimationFrame(s.raf);
        document.removeEventListener('keydown', s._onKey);
        document.removeEventListener('keyup', s._onKey);
        window.removeEventListener('resize', s._onResize);
        this._state = null;
    }
});
