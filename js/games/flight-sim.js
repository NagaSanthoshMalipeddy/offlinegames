/* ── 3D Flight Simulator (Three.js) ───────────── */
App.register({
    id: 'flight-sim',
    title: 'Flight Simulator',
    icon: '✈️',
    description: 'Fly through the sky — rings, fuel, altitude control, and landing!',
    tag: 'Simulation',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = { running: false, raf: null };

        container.innerHTML = `
            <div id="fs-menu" style="display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
                <h2 class="g-title">✈️ FLIGHT SIMULATOR</h2>
                <p style="color:#888;max-width:420px;font-size:0.9rem">Fly through rings, manage fuel & altitude. Land safely to finish!</p>
                <button class="g-btn" id="fs-start">Take Off!</button>
                <p style="color:#555;font-size:0.8rem">W/S — Pitch &nbsp;|&nbsp; A/D — Turn &nbsp;|&nbsp; Q/E — Roll &nbsp;|&nbsp; Shift — Throttle up</p>
            </div>
            <div id="fs-wrap" class="hidden" style="position:relative;width:100%;height:100%">
                <div id="fs-hud" style="position:absolute;top:8px;left:8px;right:8px;z-index:10;display:flex;justify-content:space-between;pointer-events:none;font-size:clamp(0.7rem,2vw,0.95rem);color:#fff;text-shadow:0 1px 4px #000a">
                    <div>
                        <div>🏎️ Speed: <strong id="fs-speed">0</strong></div>
                        <div>📐 Alt: <strong id="fs-alt">0</strong>m</div>
                        <div>⛽ Fuel: <strong id="fs-fuel">100</strong>%</div>
                    </div>
                    <div style="text-align:center">
                        <div id="fs-mission" style="color:#ffeb3b;font-weight:600"></div>
                        <div>🔘 Rings: <strong id="fs-rings">0</strong></div>
                    </div>
                    <div style="text-align:right">
                        <div>🏆 Score: <strong id="fs-score">0</strong></div>
                        <div>⚡ Throttle: <strong id="fs-throttle">0</strong>%</div>
                    </div>
                </div>
                <!-- Attitude indicator -->
                <div id="fs-atti" style="position:absolute;bottom:clamp(60px,15vh,80px);left:50%;transform:translateX(-50%);z-index:10;pointer-events:none;width:clamp(60px,15vw,100px);height:clamp(60px,15vw,100px);border:2px solid #fff4;border-radius:50%;overflow:hidden;background:linear-gradient(to bottom, #446688 50%, #886644 50%)">
                    <div id="fs-atti-line" style="position:absolute;top:50%;left:0;right:0;height:2px;background:#fff;transform-origin:center"></div>
                </div>
                <!-- Mobile controls -->
                <div style="position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:space-between;padding:0 12px;z-index:10;pointer-events:none">
                    <div style="display:flex;gap:6px;pointer-events:auto">
                        <button class="dg-ctrl" id="fs-t-left" style="width:clamp(36px,10vw,50px);height:clamp(36px,10vw,50px);border-radius:50%;border:2px solid #fff4;background:#0004;color:#fff;font-size:clamp(0.9rem,2.5vw,1.2rem)">◀</button>
                        <button class="dg-ctrl" id="fs-t-right" style="width:clamp(36px,10vw,50px);height:clamp(36px,10vw,50px);border-radius:50%;border:2px solid #fff4;background:#0004;color:#fff;font-size:clamp(0.9rem,2.5vw,1.2rem)">▶</button>
                    </div>
                    <div style="display:flex;gap:6px;pointer-events:auto">
                        <button class="dg-ctrl" id="fs-t-down" style="width:clamp(36px,10vw,50px);height:clamp(36px,10vw,50px);border-radius:50%;border:2px solid #f444;background:#f002;color:#fff;font-size:clamp(0.9rem,2.5vw,1.2rem)">▼</button>
                        <button class="dg-ctrl" id="fs-t-up" style="width:clamp(36px,10vw,50px);height:clamp(36px,10vw,50px);border-radius:50%;border:2px solid #4f44;background:#0f02;color:#fff;font-size:clamp(0.9rem,2.5vw,1.2rem)">▲</button>
                        <button class="dg-ctrl" id="fs-t-thr" style="width:clamp(36px,10vw,50px);height:clamp(36px,10vw,50px);border-radius:50%;border:2px solid #ff84;background:#ff02;color:#fff;font-size:clamp(0.55rem,1.5vw,0.7rem)">THR</button>
                    </div>
                </div>
                <canvas id="fs-canvas" style="display:block;width:100%;height:100%"></canvas>
                <div id="fs-msg" style="position:absolute;top:35%;left:50%;transform:translate(-50%,-50%);z-index:15;pointer-events:none;font-size:clamp(1rem,4vw,1.8rem);font-weight:700;color:#fff;text-shadow:0 2px 8px #000;text-align:center;opacity:0;transition:opacity 0.5s"></div>
                <div id="fs-over" class="hidden" style="position:absolute;inset:0;background:#000c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;z-index:20">
                    <h2 id="fs-over-title" style="font-size:clamp(1.5rem,5vw,2.5rem);color:#4caf50"></h2>
                    <div id="fs-final" style="font-size:1.1rem;color:#ccc;text-align:center"></div>
                    <button class="g-btn" id="fs-retry">Fly Again</button>
                </div>
            </div>
        `;

        const menuEl = container.querySelector('#fs-menu');
        const wrapEl = container.querySelector('#fs-wrap');
        const canvasEl = container.querySelector('#fs-canvas');
        const overEl = container.querySelector('#fs-over');
        const msgEl = container.querySelector('#fs-msg');
        const attiLine = container.querySelector('#fs-atti-line');
        const hudSpeed = container.querySelector('#fs-speed');
        const hudAlt = container.querySelector('#fs-alt');
        const hudFuel = container.querySelector('#fs-fuel');
        const hudRings = container.querySelector('#fs-rings');
        const hudScore = container.querySelector('#fs-score');
        const hudThrottle = container.querySelector('#fs-throttle');
        const hudMission = container.querySelector('#fs-mission');
        const overTitle = container.querySelector('#fs-over-title');
        const finalEl = container.querySelector('#fs-final');

        let scene, camera, renderer, clock;
        let planeGroup;
        let rings = [], clouds = [], terrain;
        let runway;
        const keys = {};
        const touchState = { up: false, down: false, left: false, right: false, throttle: false };

        let planePos, planeQuat, planeVelocity;
        let throttle, fuel, score, ringsCollected, totalRings;
        let takeoffDone, landed, crashed;
        const GRAVITY = 3;
        const RING_COUNT = 15;

        function initThree() {
            scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x88bbdd, 100, 500);

            // Sky gradient
            const skyGeo = new THREE.SphereGeometry(400, 16, 16);
            const skyMat = new THREE.ShaderMaterial({
                uniforms: {
                    topColor: { value: new THREE.Color(0x3366aa) },
                    bottomColor: { value: new THREE.Color(0x88bbdd) },
                },
                vertexShader: `varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position,1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
                fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPos; void main() { float h = normalize(vWorldPos).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(h,0.0)), 1.0); }`,
                side: THREE.BackSide
            });
            scene.add(new THREE.Mesh(skyGeo, skyMat));

            camera = new THREE.PerspectiveCamera(60, canvasEl.clientWidth / canvasEl.clientHeight, 0.5, 600);
            renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
            renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
            renderer.shadowMap.enabled = true;
            clock = new THREE.Clock();

            scene.add(new THREE.AmbientLight(0xffffff, 0.5));
            const sun = new THREE.DirectionalLight(0xffffff, 0.8);
            sun.position.set(60, 100, 40);
            scene.add(sun);

            // Terrain
            const terrGeo = new THREE.PlaneGeometry(1000, 1000, 50, 50);
            const positions = terrGeo.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                // Flat around runway, hilly elsewhere
                const distFromCenter = Math.sqrt(x * x + y * y);
                const h = distFromCenter > 50 ? (Math.sin(x * 0.03) * Math.cos(y * 0.03) * 15 + Math.sin(x * 0.01 + y * 0.01) * 8) : 0;
                positions.setZ(i, h);
            }
            terrGeo.computeVertexNormals();
            terrain = new THREE.Mesh(terrGeo, new THREE.MeshLambertMaterial({ color: 0x4a7a3a }));
            terrain.rotation.x = -Math.PI / 2;
            terrain.receiveShadow = true;
            scene.add(terrain);

            // Water patches
            for (let i = 0; i < 4; i++) {
                const water = new THREE.Mesh(
                    new THREE.CircleGeometry(20 + Math.random() * 30, 24),
                    new THREE.MeshLambertMaterial({ color: 0x3388bb, transparent: true, opacity: 0.7 })
                );
                water.rotation.x = -Math.PI / 2;
                water.position.set(-150 + Math.random() * 300, 0.2, -150 + Math.random() * 300);
                scene.add(water);
            }

            // Runway
            runway = new THREE.Mesh(
                new THREE.PlaneGeometry(8, 80),
                new THREE.MeshLambertMaterial({ color: 0x444444 })
            );
            runway.rotation.x = -Math.PI / 2;
            runway.position.set(0, 0.05, 0);
            scene.add(runway);

            // Runway markings
            for (let i = -35; i <= 35; i += 5) {
                const mark = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.5, 2),
                    new THREE.MeshBasicMaterial({ color: 0xffffff })
                );
                mark.rotation.x = -Math.PI / 2;
                mark.position.set(0, 0.06, i);
                scene.add(mark);
            }

            // Clouds
            clouds = [];
            const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
            for (let i = 0; i < 40; i++) {
                const g = new THREE.Group();
                const count = 3 + Math.floor(Math.random() * 4);
                for (let j = 0; j < count; j++) {
                    const s = 3 + Math.random() * 6;
                    const c = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), cloudMat);
                    c.position.set((Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s * 0.5, (Math.random() - 0.5) * s * 2);
                    g.add(c);
                }
                g.position.set(
                    -300 + Math.random() * 600,
                    40 + Math.random() * 60,
                    -300 + Math.random() * 600
                );
                scene.add(g);
                clouds.push(g);
            }

            // Rings
            spawnRings();

            // Plane
            buildPlane();
        }

        function spawnRings() {
            rings.forEach(r => scene.remove(r.mesh));
            rings = [];
            for (let i = 0; i < RING_COUNT; i++) {
                const geo = new THREE.TorusGeometry(5, 0.4, 12, 24);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
                const mesh = new THREE.Mesh(geo, mat);
                const angle = (i / RING_COUNT) * Math.PI * 2;
                const radius = 60 + Math.random() * 80;
                mesh.position.set(
                    Math.sin(angle) * radius,
                    20 + Math.random() * 40,
                    Math.cos(angle) * radius
                );
                mesh.rotation.y = angle;
                scene.add(mesh);
                rings.push({ mesh, collected: false });
            }
            totalRings = RING_COUNT;
        }

        function buildPlane() {
            planeGroup = new THREE.Group();

            // Fuselage
            const fuselage = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.3, 5, 8),
                new THREE.MeshLambertMaterial({ color: 0xeeeeee })
            );
            fuselage.rotation.x = Math.PI / 2;
            fuselage.castShadow = true;
            planeGroup.add(fuselage);

            // Nose
            const nose = new THREE.Mesh(
                new THREE.ConeGeometry(0.5, 1.5, 8),
                new THREE.MeshLambertMaterial({ color: 0xcc3333 })
            );
            nose.rotation.x = -Math.PI / 2;
            nose.position.z = -3;
            planeGroup.add(nose);

            // Wings
            const wingGeo = new THREE.BoxGeometry(10, 0.1, 1.5);
            const wingMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
            const wing = new THREE.Mesh(wingGeo, wingMat);
            wing.position.y = -0.1;
            wing.castShadow = true;
            planeGroup.add(wing);

            // Tail wing
            const tailWing = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.1, 0.8),
                wingMat
            );
            tailWing.position.z = 2.3;
            planeGroup.add(tailWing);

            // Vertical stabilizer
            const vStab = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 2, 1),
                wingMat
            );
            vStab.position.set(0, 1, 2.3);
            planeGroup.add(vStab);

            // Propeller
            const propMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
            for (let i = 0; i < 3; i++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.5, 0.05), propMat);
                blade.rotation.z = (i / 3) * Math.PI * 2;
                blade.position.z = -3.7;
                planeGroup.add(blade);
            }

            // Engine
            const engine = new THREE.Mesh(
                new THREE.CylinderGeometry(0.55, 0.55, 0.5, 8),
                new THREE.MeshLambertMaterial({ color: 0x888888 })
            );
            engine.rotation.x = Math.PI / 2;
            engine.position.z = -3.5;
            planeGroup.add(engine);

            planeGroup.position.set(0, 1, 30);
            planeGroup.rotation.y = Math.PI; // face down the runway (-Z)
            scene.add(planeGroup);
        }

        function showMsg(text) {
            msgEl.textContent = text;
            msgEl.style.opacity = '1';
            setTimeout(() => msgEl.style.opacity = '0', 2500);
        }

        /* ── Update ──────────────────────────────── */
        function update(dt) {
            if (landed || crashed) return;

            const pitchUp = keys['w'] || keys['arrowup'] || touchState.up;
            const pitchDown = keys['s'] || keys['arrowdown'] || touchState.down;
            const rollLeft = keys['a'] || keys['arrowleft'] || touchState.left;
            const rollRight = keys['d'] || keys['arrowright'] || touchState.right;
            const yawLeft = keys['q'];
            const yawRight = keys['e'];
            const thrUp = keys['shift'] || touchState.throttle;

            // Throttle
            if (thrUp) throttle = Math.min(100, throttle + 30 * dt);
            else throttle = Math.max(0, throttle - 10 * dt);

            // Speeds
            const fwd = 10 + throttle * 0.5;

            // Rotation
            const pitchRate = 1.2 * dt;
            const yawRate = 1.5 * dt;
            const rollRate = 0.8 * dt;

            if (pitchUp) planeGroup.rotateX(-pitchRate);
            if (pitchDown) planeGroup.rotateX(pitchRate);
            // A/D turn the plane (yaw) with a slight coordinated roll
            if (rollLeft) { planeGroup.rotateY(yawRate); planeGroup.rotateZ(rollRate * 0.4); }
            if (rollRight) { planeGroup.rotateY(-yawRate); planeGroup.rotateZ(-rollRate * 0.4); }
            // Q/E for pure roll
            if (yawLeft) planeGroup.rotateZ(rollRate);
            if (yawRight) planeGroup.rotateZ(-rollRate);

            // Auto-level roll when not pressing A/D/Q/E
            if (!rollLeft && !rollRight && !yawLeft && !yawRight) {
                const euler = new THREE.Euler().setFromQuaternion(planeGroup.quaternion, 'YXZ');
                euler.z *= (1 - 2 * dt); // dampen roll back to level
                planeGroup.quaternion.setFromEuler(euler);
            }

            // Forward direction
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(planeGroup.quaternion);
            const lift = Math.max(0, -forward.y * 0.5 + 0.3) * (throttle / 100);

            planeGroup.position.x += forward.x * fwd * dt;
            planeGroup.position.z += forward.z * fwd * dt;
            planeGroup.position.y += forward.y * fwd * dt;

            // Gravity vs lift
            planeGroup.position.y -= GRAVITY * dt * (1 - Math.min(1, lift * 2));

            // Throttle affects fuel
            fuel -= throttle * 0.003 * dt;
            fuel = Math.max(0, fuel);

            if (fuel <= 0) {
                throttle = 0;
                showMsg('⛽ Out of fuel!');
            }

            // Takeoff check
            if (!takeoffDone && planeGroup.position.y > 5) {
                takeoffDone = true;
                showMsg('✈️ Airborne! Fly through the rings!');
            }

            // Ground collision
            if (planeGroup.position.y < 0.5) {
                planeGroup.position.y = 0.5;
                const speed = Math.sqrt(forward.x * forward.x + forward.z * forward.z) * fwd;

                // Check if on runway and slow enough to land
                const onRunway = Math.abs(planeGroup.position.x) < 5 && Math.abs(planeGroup.position.z) < 45;
                const pitchAngle = Math.asin(forward.y);

                if (onRunway && speed < 15 && Math.abs(pitchAngle) < 0.3 && takeoffDone) {
                    landed = true;
                    finishGame(true);
                } else if (takeoffDone) {
                    crashed = true;
                    finishGame(false);
                }
            }

            // World bounds
            planeGroup.position.x = Math.max(-400, Math.min(400, planeGroup.position.x));
            planeGroup.position.z = Math.max(-400, Math.min(400, planeGroup.position.z));
            planeGroup.position.y = Math.min(120, planeGroup.position.y);

            // Ring collision
            for (const r of rings) {
                if (r.collected) continue;
                const d = planeGroup.position.distanceTo(r.mesh.position);
                if (d < 7) {
                    r.collected = true;
                    scene.remove(r.mesh);
                    ringsCollected++;
                    score += 50;
                    hudRings.textContent = ringsCollected;
                    hudScore.textContent = score;
                    showMsg(`🔘 Ring! +50 pts (${ringsCollected}/${totalRings})`);
                }
            }

            // Rotate propeller
            const propeller = planeGroup.children.find(c => c.geometry && c.geometry.type === 'BoxGeometry' && c.position.z < -3);
            if (propeller) propeller.rotation.z += throttle * 0.3 * dt;

            // Camera follow (behind the plane)
            const camBack = forward.clone().multiplyScalar(-15);
            const camUp = new THREE.Vector3(0, 6, 0);
            const idealCam = planeGroup.position.clone().add(camBack).add(camUp);
            camera.position.lerp(idealCam, 0.06);
            camera.lookAt(planeGroup.position.clone().add(forward.clone().multiplyScalar(10)));

            // Cloud drift
            clouds.forEach(c => { c.position.x += dt * 2; if (c.position.x > 350) c.position.x = -350; });

            // HUD
            hudSpeed.textContent = Math.round(fwd * 3.6);
            hudAlt.textContent = Math.round(planeGroup.position.y);
            hudFuel.textContent = Math.round(fuel);
            hudThrottle.textContent = Math.round(throttle);

            // Attitude indicator
            const euler = new THREE.Euler().setFromQuaternion(planeGroup.quaternion, 'YXZ');
            attiLine.style.transform = `rotate(${-(euler.z * 180 / Math.PI)}deg) translateY(${euler.x * 30}px)`;

            // Mission
            if (ringsCollected >= totalRings) {
                hudMission.textContent = '🛬 All rings collected! Land on the runway!';
            } else {
                hudMission.textContent = `Fly through rings: ${ringsCollected}/${totalRings}`;
            }
        }

        function finishGame(success) {
            if (success) {
                score += 100 + Math.round(fuel * 2);
                overTitle.textContent = '🛬 SAFE LANDING!';
                overTitle.style.color = '#4caf50';
            } else {
                overTitle.textContent = '💥 CRASHED!';
                overTitle.style.color = '#ff4081';
            }
            let rating;
            if (score >= 700) rating = '🏆 Ace Pilot!';
            else if (score >= 400) rating = '✈️ Skilled!';
            else if (score >= 200) rating = '👍 Good Flight';
            else rating = '🎓 Student Pilot';
            finalEl.innerHTML = `
                <p>Score: <span style="color:#ffeb3b;font-size:1.4rem">${score}</span></p>
                <p>Rings: ${ringsCollected}/${totalRings} &nbsp;|&nbsp; Fuel left: ${Math.round(fuel)}%</p>
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
            throttle = 0; fuel = 100; score = 0; ringsCollected = 0;
            takeoffDone = false; landed = false; crashed = false;

            hudScore.textContent = 0; hudRings.textContent = 0;
            hudFuel.textContent = 100;

            menuEl.classList.add('hidden');
            wrapEl.classList.remove('hidden');
            wrapEl.style.display = 'block';
            overEl.classList.add('hidden');

            const w = wrapEl.clientWidth || window.innerWidth;
            const h = wrapEl.clientHeight || window.innerHeight - 50;
            canvasEl.width = w; canvasEl.height = h;

            initThree();
            s.running = true;
            showMsg('🛫 Throttle up (Shift/THR) and pitch up (W) to take off!');
            animate();
        }

        function resetGame() {
            s.running = false;
            if (s.raf) cancelAnimationFrame(s.raf);
            if (renderer) {
                renderer.dispose();
                scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose(); } });
            }
            scene = null; camera = null; renderer = null; rings = []; clouds = [];
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
        setupTouch('#fs-t-up', 'up');
        setupTouch('#fs-t-down', 'down');
        setupTouch('#fs-t-left', 'left');
        setupTouch('#fs-t-right', 'right');
        setupTouch('#fs-t-thr', 'throttle');

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

        container.querySelector('#fs-start').addEventListener('click', startGame);
        container.querySelector('#fs-retry').addEventListener('click', resetGame);
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
