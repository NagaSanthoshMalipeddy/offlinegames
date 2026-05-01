/* ── 3D Mini Driving Game (Three.js) ──────────── */
App.register({
    id: 'driving-game',
    title: 'Mini Driving',
    icon: '🚗',
    description: '3D driving through a city — dodge traffic, collect fuel, complete missions!',
    tag: 'Simulation',
    tagClass: 'tag-classic',
    _state: null,

    init(container) {
        const s = this._state = { running: false, raf: null };

        /* ── Menu ────────────────────────────────── */
        container.innerHTML = `
            <div id="dg-menu" style="display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center">
                <h2 class="g-title">🚗 MINI DRIVING</h2>
                <p style="color:#888;max-width:420px;font-size:0.9rem">Drive through the city, collect coins, avoid traffic, and manage your fuel!</p>
                <div class="g-row">
                    <button class="g-btn" id="dg-start">Start Driving</button>
                </div>
                <p style="color:#555;font-size:0.8rem">W/↑ Accelerate &nbsp;|&nbsp; S/↓ Brake &nbsp;|&nbsp; A/↑ D/→ Steer</p>
                <p style="color:#555;font-size:0.8rem">Mobile: on-screen controls</p>
            </div>
            <div id="dg-canvas-wrap" class="hidden" style="position:relative;width:100%;height:100%">
                <div id="dg-hud" style="position:absolute;top:8px;left:8px;right:8px;z-index:10;display:flex;justify-content:space-between;pointer-events:none;font-size:clamp(0.7rem,2vw,0.95rem);color:#fff;text-shadow:0 1px 4px #000a">
                    <div>
                        <div>⛽ <span id="dg-fuel">100</span>%</div>
                        <div>🏎️ <span id="dg-speed">0</span> km/h</div>
                    </div>
                    <div style="text-align:center">
                        <div>⏱️ <span id="dg-time">0</span>s</div>
                        <div id="dg-mission" style="color:#ffeb3b;font-weight:700"></div>
                    </div>
                    <div style="text-align:right">
                        <div>🪙 <span id="dg-coins">0</span></div>
                        <div>📏 <span id="dg-dist">0</span>m</div>
                    </div>
                </div>
                <canvas id="dg-canvas" style="display:block;width:100%;height:100%"></canvas>

                <!-- Mobile controls -->
                <div id="dg-touch" style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;z-index:10;pointer-events:none">
                    <div style="display:flex;gap:8px;pointer-events:auto">
                        <button class="dg-ctrl" id="dg-t-left" style="width:clamp(40px,12vw,56px);height:clamp(40px,12vw,56px);border-radius:50%;border:2px solid #fff4;background:#0004;color:#fff;font-size:clamp(1rem,3vw,1.5rem)">◀</button>
                        <button class="dg-ctrl" id="dg-t-right" style="width:clamp(40px,12vw,56px);height:clamp(40px,12vw,56px);border-radius:50%;border:2px solid #fff4;background:#0004;color:#fff;font-size:clamp(1rem,3vw,1.5rem)">▶</button>
                    </div>
                    <div style="display:flex;gap:8px;pointer-events:auto">
                        <button class="dg-ctrl" id="dg-t-brake" style="width:clamp(40px,12vw,56px);height:clamp(40px,12vw,56px);border-radius:50%;border:2px solid #f444;background:#f002;color:#fff;font-size:clamp(0.9rem,2.5vw,1.2rem)">🛑</button>
                        <button class="dg-ctrl" id="dg-t-gas" style="width:clamp(40px,12vw,56px);height:clamp(40px,12vw,56px);border-radius:50%;border:2px solid #4f44;background:#0f02;color:#fff;font-size:clamp(0.9rem,2.5vw,1.2rem)">🚀</button>
                    </div>
                </div>

                <!-- Game over overlay -->
                <div id="dg-over" class="hidden" style="position:absolute;inset:0;background:#000c;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;z-index:20">
                    <h2 style="font-size:clamp(1.5rem,5vw,2.5rem);color:#ff4081">GAME OVER</h2>
                    <div id="dg-final" style="font-size:1.1rem;color:#ccc;text-align:center"></div>
                    <button class="g-btn" id="dg-retry">Play Again</button>
                </div>
            </div>
        `;

        /* ── Refs ────────────────────────────────── */
        const menuEl = container.querySelector('#dg-menu');
        const wrapEl = container.querySelector('#dg-canvas-wrap');
        const canvasEl = container.querySelector('#dg-canvas');
        const overEl = container.querySelector('#dg-over');
        const hudFuel = container.querySelector('#dg-fuel');
        const hudSpeed = container.querySelector('#dg-speed');
        const hudTime = container.querySelector('#dg-time');
        const hudCoins = container.querySelector('#dg-coins');
        const hudDist = container.querySelector('#dg-dist');
        const hudMission = container.querySelector('#dg-mission');
        const finalEl = container.querySelector('#dg-final');

        /* ── Constants ───────────────────────────── */
        const ROAD_W = 10;
        const BLOCK = 40;              // city block size
        const GRID = 5;                // NxN grid of blocks
        const WORLD = BLOCK * GRID;
        const MAX_SPEED = 0.6;
        const ACCEL = 0.008;
        const BRAKE = 0.015;
        const FRICTION = 0.003;
        const STEER_SPEED = 0.04;
        const TRAFFIC_COUNT = 12;
        const COIN_COUNT = 15;
        const FUEL_DRAIN = 0.02;       // per frame

        /* ── THREE setup ─────────────────────────── */
        let scene, camera, renderer, clock;
        let carGroup, carBody;
        let buildings = [], trafficCars = [], coins = [], fuelPickups = [];
        let ground, roadMeshes = [];

        /* ── Game state ──────────────────────────── */
        let speed = 0, steer = 0, carAngle = 0;
        let carX = 0, carZ = 0;
        let fuel = 100, coinCount = 0, distance = 0, elapsedTime = 0;
        let gameOver = false;
        const keys = {};
        const touchState = { left: false, right: false, gas: false, brake: false };

        /* ── Missions ────────────────────────────── */
        let missionIdx = 0;
        let checkpoint = null, checkpointMesh = null;
        const missions = [
            'Drive to the checkpoint!',
            'Collect 5 coins!',
            'Reach 150m distance!',
            'Drive to the next checkpoint!',
            'Collect 10 coins total!',
            'Reach 400m distance!',
        ];

        function initThree() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb);
            scene.fog = new THREE.Fog(0x87ceeb, 80, 250);

            camera = new THREE.PerspectiveCamera(60, canvasEl.clientWidth / canvasEl.clientHeight, 0.5, 300);
            renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
            renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            clock = new THREE.Clock();

            // Lights
            const ambient = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambient);

            const sun = new THREE.DirectionalLight(0xffffff, 0.8);
            sun.position.set(50, 80, 30);
            sun.castShadow = true;
            sun.shadow.mapSize.width = 1024;
            sun.shadow.mapSize.height = 1024;
            sun.shadow.camera.near = 1;
            sun.shadow.camera.far = 200;
            sun.shadow.camera.left = -100;
            sun.shadow.camera.right = 100;
            sun.shadow.camera.top = 100;
            sun.shadow.camera.bottom = -100;
            scene.add(sun);

            buildWorld();
            buildCar();
            spawnTraffic();
            spawnCoins();
            spawnFuelPickups();
            setupMission();
        }

        /* ── World ───────────────────────────────── */
        function buildWorld() {
            // Ground
            const groundGeo = new THREE.PlaneGeometry(WORLD * 2, WORLD * 2);
            const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a7d44 });
            ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.05;
            ground.receiveShadow = true;
            scene.add(ground);

            // Roads (grid pattern)
            const roadMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
            const roadLaneMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });

            for (let i = 0; i <= GRID; i++) {
                // Horizontal roads
                const hGeo = new THREE.PlaneGeometry(WORLD, ROAD_W);
                const hRoad = new THREE.Mesh(hGeo, roadMat);
                hRoad.rotation.x = -Math.PI / 2;
                hRoad.position.set(WORLD / 2 - BLOCK / 2, 0.01, i * BLOCK);
                hRoad.receiveShadow = true;
                scene.add(hRoad);
                roadMeshes.push(hRoad);

                // Center line
                const hlGeo = new THREE.PlaneGeometry(WORLD, 0.15);
                const hLine = new THREE.Mesh(hlGeo, roadLaneMat);
                hLine.rotation.x = -Math.PI / 2;
                hLine.position.set(WORLD / 2 - BLOCK / 2, 0.02, i * BLOCK);
                scene.add(hLine);

                // Vertical roads
                const vGeo = new THREE.PlaneGeometry(ROAD_W, WORLD);
                const vRoad = new THREE.Mesh(vGeo, roadMat);
                vRoad.rotation.x = -Math.PI / 2;
                vRoad.position.set(i * BLOCK, 0.01, WORLD / 2 - BLOCK / 2);
                vRoad.receiveShadow = true;
                scene.add(vRoad);
                roadMeshes.push(vRoad);

                // Center line
                const vlGeo = new THREE.PlaneGeometry(0.15, WORLD);
                const vLine = new THREE.Mesh(vlGeo, roadLaneMat);
                vLine.rotation.x = -Math.PI / 2;
                vLine.position.set(i * BLOCK, 0.02, WORLD / 2 - BLOCK / 2);
                scene.add(vLine);
            }

            // Buildings in each block
            const bColors = [0x8899aa, 0x99aabb, 0x667788, 0xaabbcc, 0x556677, 0x778899, 0xbb8866, 0xcc9977, 0x7788aa];
            for (let bx = 0; bx < GRID; bx++) {
                for (let bz = 0; bz < GRID; bz++) {
                    const cx = bx * BLOCK + BLOCK / 2;
                    const cz = bz * BLOCK + BLOCK / 2;
                    const numBuildings = 2 + Math.floor(Math.random() * 3);

                    for (let b = 0; b < numBuildings; b++) {
                        const w = 3 + Math.random() * 6;
                        const d = 3 + Math.random() * 6;
                        const h = 4 + Math.random() * 16;
                        const ox = (Math.random() - 0.5) * (BLOCK - ROAD_W - w - 2);
                        const oz = (Math.random() - 0.5) * (BLOCK - ROAD_W - d - 2);

                        const geo = new THREE.BoxGeometry(w, h, d);
                        const mat = new THREE.MeshLambertMaterial({ color: bColors[Math.floor(Math.random() * bColors.length)] });
                        const mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(cx + ox, h / 2, cz + oz);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        scene.add(mesh);
                        buildings.push({ mesh, w, d, h, x: cx + ox, z: cz + oz });

                        // Windows (simple dots)
                        addWindows(mesh, w, h, d);
                    }

                    // Trees
                    const numTrees = 1 + Math.floor(Math.random() * 3);
                    for (let t = 0; t < numTrees; t++) {
                        const tx = cx + (Math.random() - 0.5) * (BLOCK - ROAD_W - 4);
                        const tz = cz + (Math.random() - 0.5) * (BLOCK - ROAD_W - 4);
                        addTree(tx, tz);
                    }
                }
            }

            // Sidewalks along roads
            const swMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
            for (let i = 0; i <= GRID; i++) {
                // Horizontal sidewalks
                for (const side of [-1, 1]) {
                    const geo = new THREE.BoxGeometry(WORLD, 0.2, 1.2);
                    const sw = new THREE.Mesh(geo, swMat);
                    sw.position.set(WORLD / 2 - BLOCK / 2, 0.1, i * BLOCK + side * (ROAD_W / 2 + 0.6));
                    scene.add(sw);
                }
                // Vertical sidewalks
                for (const side of [-1, 1]) {
                    const geo = new THREE.BoxGeometry(1.2, 0.2, WORLD);
                    const sw = new THREE.Mesh(geo, swMat);
                    sw.position.set(i * BLOCK + side * (ROAD_W / 2 + 0.6), 0.1, WORLD / 2 - BLOCK / 2);
                    scene.add(sw);
                }
            }
        }

        function addWindows(building, w, h, d) {
            const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
            const spacing = 2;
            const wSize = 0.6;

            for (let y = 2; y < h - 1; y += spacing) {
                for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += spacing) {
                    // Front
                    const wGeo = new THREE.PlaneGeometry(wSize, wSize);
                    const wMesh = new THREE.Mesh(wGeo, windowMat);
                    wMesh.position.set(x, y - h / 2, d / 2 + 0.01);
                    building.add(wMesh);

                    // Back
                    const wMesh2 = wMesh.clone();
                    wMesh2.position.z = -d / 2 - 0.01;
                    wMesh2.rotation.y = Math.PI;
                    building.add(wMesh2);
                }
            }
        }

        function addTree(x, z) {
            // Trunk
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, 1, z);
            trunk.castShadow = true;
            scene.add(trunk);

            // Foliage
            const leafGeo = new THREE.SphereGeometry(1.5, 6, 6);
            const leafMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(x, 3, z);
            leaf.castShadow = true;
            scene.add(leaf);
        }

        /* ── Car ─────────────────────────────────── */
        function buildCar() {
            carGroup = new THREE.Group();

            // Body
            const bodyGeo = new THREE.BoxGeometry(2, 0.7, 4);
            const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe53935 });
            carBody = new THREE.Mesh(bodyGeo, bodyMat);
            carBody.position.y = 0.55;
            carBody.castShadow = true;
            carGroup.add(carBody);

            // Cabin
            const cabGeo = new THREE.BoxGeometry(1.6, 0.6, 2);
            const cabMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });
            const cabin = new THREE.Mesh(cabGeo, cabMat);
            cabin.position.set(0, 1.2, -0.2);
            cabin.castShadow = true;
            carGroup.add(cabin);

            // Windshield
            const wsGeo = new THREE.PlaneGeometry(1.5, 0.5);
            const wsMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });
            const ws = new THREE.Mesh(wsGeo, wsMat);
            ws.position.set(0, 1.2, 0.81);
            ws.rotation.x = -0.2;
            carGroup.add(ws);

            // Rear window
            const rw = new THREE.Mesh(wsGeo, wsMat);
            rw.position.set(0, 1.2, -1.21);
            rw.rotation.x = 0.2;
            rw.rotation.y = Math.PI;
            carGroup.add(rw);

            // Wheels
            const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
            const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
            const wheelPositions = [
                [-1.1, 0.35, 1.2], [1.1, 0.35, 1.2],
                [-1.1, 0.35, -1.2], [1.1, 0.35, -1.2]
            ];
            wheelPositions.forEach(([wx, wy, wz]) => {
                const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(wx, wy, wz);
                wheel.castShadow = true;
                carGroup.add(wheel);
            });

            // Headlights
            const hlGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
            [[-0.6, 0.55, 2.01], [0.6, 0.55, 2.01]].forEach(([hx, hy, hz]) => {
                const hl = new THREE.Mesh(hlGeo, hlMat);
                hl.position.set(hx, hy, hz);
                carGroup.add(hl);
            });

            // Tail lights
            const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            [[-0.6, 0.55, -2.01], [0.6, 0.55, -2.01]].forEach(([hx, hy, hz]) => {
                const tl = new THREE.Mesh(hlGeo, tlMat);
                tl.position.set(hx, hy, hz);
                carGroup.add(tl);
            });

            carGroup.position.set(ROAD_W / 2, 0, ROAD_W / 2);
            carX = carGroup.position.x;
            carZ = carGroup.position.z;
            scene.add(carGroup);
        }

        /* ── Traffic ─────────────────────────────── */
        function spawnTraffic() {
            const colors = [0x2196F3, 0x4CAF50, 0xFF9800, 0x9C27B0, 0x00BCD4, 0xFFEB3B, 0x795548];
            for (let i = 0; i < TRAFFIC_COUNT; i++) {
                const g = new THREE.Group();

                const bGeo = new THREE.BoxGeometry(1.8, 0.65, 3.5);
                const bMat = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
                const body = new THREE.Mesh(bGeo, bMat);
                body.position.y = 0.5;
                body.castShadow = true;
                g.add(body);

                const cGeo = new THREE.BoxGeometry(1.4, 0.5, 1.6);
                const cMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
                const cab = new THREE.Mesh(cGeo, cMat);
                cab.position.set(0, 1.1, -0.1);
                g.add(cab);

                // Random position on road
                const isHoriz = Math.random() < 0.5;
                const roadIdx = Math.floor(Math.random() * (GRID + 1));
                let x, z, angle, dx, dz;

                if (isHoriz) {
                    x = Math.random() * WORLD;
                    z = roadIdx * BLOCK + (Math.random() < 0.5 ? -2 : 2);
                    angle = Math.random() < 0.5 ? 0 : Math.PI;
                    dx = angle === 0 ? 1 : -1;
                    dz = 0;
                } else {
                    x = roadIdx * BLOCK + (Math.random() < 0.5 ? -2 : 2);
                    z = Math.random() * WORLD;
                    angle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
                    dx = 0;
                    dz = angle > 0 ? -1 : 1;
                }

                g.position.set(x, 0, z);
                g.rotation.y = angle;
                scene.add(g);

                const spd = 0.05 + Math.random() * 0.1;
                trafficCars.push({ mesh: g, dx, dz, speed: spd, x, z });
            }
        }

        /* ── Coins ───────────────────────────────── */
        function spawnCoins() {
            coins.forEach(c => scene.remove(c.mesh));
            coins = [];
            const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16);
            const coinMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

            for (let i = 0; i < COIN_COUNT; i++) {
                const mesh = new THREE.Mesh(coinGeo, coinMat);
                const x = 5 + Math.random() * (WORLD - 10);
                const z = 5 + Math.random() * (WORLD - 10);
                mesh.position.set(x, 1.5, z);
                mesh.rotation.x = Math.PI / 2;
                scene.add(mesh);
                coins.push({ mesh, collected: false });
            }
        }

        /* ── Fuel pickups ────────────────────────── */
        function spawnFuelPickups() {
            fuelPickups.forEach(f => scene.remove(f.mesh));
            fuelPickups = [];
            const fGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
            const fMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });

            for (let i = 0; i < 5; i++) {
                const mesh = new THREE.Mesh(fGeo, fMat);
                const roadIdx = Math.floor(Math.random() * (GRID + 1));
                const along = Math.random() * WORLD;
                const x = Math.random() < 0.5 ? roadIdx * BLOCK + 3 : along;
                const z = Math.random() < 0.5 ? along : roadIdx * BLOCK + 3;
                mesh.position.set(x, 0.6, z);
                scene.add(mesh);
                fuelPickups.push({ mesh, collected: false });
            }
        }

        /* ── Checkpoint / Mission ────────────────── */
        function setupMission() {
            if (checkpointMesh) scene.remove(checkpointMesh);

            if (missionIdx < missions.length) {
                hudMission.textContent = missions[missionIdx];

                if (missions[missionIdx].includes('checkpoint')) {
                    const roadIdx = 1 + Math.floor(Math.random() * (GRID - 1));
                    const along = BLOCK * (1 + Math.floor(Math.random() * (GRID - 1)));
                    checkpoint = { x: roadIdx * BLOCK, z: along };

                    const geo = new THREE.RingGeometry(2, 2.8, 24);
                    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
                    checkpointMesh = new THREE.Mesh(geo, mat);
                    checkpointMesh.rotation.x = -Math.PI / 2;
                    checkpointMesh.position.set(checkpoint.x, 0.1, checkpoint.z);
                    scene.add(checkpointMesh);
                } else {
                    checkpoint = null;
                }
            } else {
                hudMission.textContent = '🏆 All missions complete! Free drive!';
                checkpoint = null;
            }
        }

        /* ── Update ──────────────────────────────── */
        function update(dt) {
            if (gameOver) return;

            const gas = keys['w'] || keys['arrowup'] || touchState.gas;
            const brk = keys['s'] || keys['arrowdown'] || touchState.brake;
            const left = keys['a'] || keys['arrowleft'] || touchState.left;
            const right = keys['d'] || keys['arrowright'] || touchState.right;

            // Acceleration/braking
            if (gas) speed = Math.min(speed + ACCEL, MAX_SPEED);
            else if (brk) speed = Math.max(speed - BRAKE, -MAX_SPEED * 0.4);
            else {
                if (speed > 0) speed = Math.max(0, speed - FRICTION);
                else if (speed < 0) speed = Math.min(0, speed + FRICTION);
            }

            // Steering (only when moving)
            if (Math.abs(speed) > 0.005) {
                if (left) carAngle += STEER_SPEED * (speed > 0 ? 1 : -1);
                if (right) carAngle -= STEER_SPEED * (speed > 0 ? 1 : -1);
            }

            // Move car
            const dx = Math.sin(carAngle) * speed;
            const dz = Math.cos(carAngle) * speed;
            carX += dx;
            carZ += dz;

            // World bounds
            carX = Math.max(-10, Math.min(WORLD + 10, carX));
            carZ = Math.max(-10, Math.min(WORLD + 10, carZ));

            // Building collision
            for (const b of buildings) {
                const hw = b.w / 2 + 1.2;
                const hd = b.d / 2 + 2.2;
                if (Math.abs(carX - b.x) < hw && Math.abs(carZ - b.z) < hd) {
                    // Push car out
                    carX -= dx * 1.5;
                    carZ -= dz * 1.5;
                    speed *= -0.3;
                    break;
                }
            }

            carGroup.position.set(carX, 0, carZ);
            carGroup.rotation.y = carAngle;

            // Distance & fuel
            const moved = Math.sqrt(dx * dx + dz * dz);
            distance += moved * 3;
            fuel -= FUEL_DRAIN * Math.abs(speed) / MAX_SPEED;
            fuel = Math.max(0, fuel);

            if (fuel <= 0) {
                speed = 0;
                endGame('Out of fuel!');
                return;
            }

            elapsedTime += dt;

            // Update HUD
            hudSpeed.textContent = Math.round(Math.abs(speed) * 200);
            hudFuel.textContent = Math.round(fuel);
            hudTime.textContent = Math.round(elapsedTime);
            hudDist.textContent = Math.round(distance);
            hudCoins.textContent = coinCount;

            // Camera follow
            const camDist = 10;
            const camHeight = 5;
            const idealX = carX - Math.sin(carAngle) * camDist;
            const idealZ = carZ - Math.cos(carAngle) * camDist;
            camera.position.x += (idealX - camera.position.x) * 0.06;
            camera.position.z += (idealZ - camera.position.z) * 0.06;
            camera.position.y += (camHeight - camera.position.y) * 0.06;
            camera.lookAt(carX, 1, carZ);

            // Traffic update
            for (const t of trafficCars) {
                t.x += t.dx * t.speed;
                t.z += t.dz * t.speed;
                // Wrap around
                if (t.x > WORLD + 20) t.x = -20;
                if (t.x < -20) t.x = WORLD + 20;
                if (t.z > WORLD + 20) t.z = -20;
                if (t.z < -20) t.z = WORLD + 20;
                t.mesh.position.set(t.x, 0, t.z);

                // Collision with player
                const tdx = carX - t.x, tdz = carZ - t.z;
                if (Math.sqrt(tdx * tdx + tdz * tdz) < 3) {
                    speed *= -0.5;
                    carX -= dx * 3;
                    carZ -= dz * 3;
                    fuel -= 5;
                }
            }

            // Coins
            for (const c of coins) {
                if (c.collected) continue;
                c.mesh.rotation.z += 0.03;
                const cdx = carX - c.mesh.position.x, cdz = carZ - c.mesh.position.z;
                if (Math.sqrt(cdx * cdx + cdz * cdz) < 2.5) {
                    c.collected = true;
                    scene.remove(c.mesh);
                    coinCount++;
                }
            }

            // Fuel pickups
            for (const f of fuelPickups) {
                if (f.collected) continue;
                f.mesh.rotation.y += 0.02;
                const fdx = carX - f.mesh.position.x, fdz = carZ - f.mesh.position.z;
                if (Math.sqrt(fdx * fdx + fdz * fdz) < 2.5) {
                    f.collected = true;
                    scene.remove(f.mesh);
                    fuel = Math.min(100, fuel + 30);
                }
            }

            // Respawn coins/fuel if all collected
            if (coins.every(c => c.collected)) spawnCoins();
            if (fuelPickups.every(f => f.collected)) spawnFuelPickups();

            // Checkpoint
            if (checkpointMesh) {
                checkpointMesh.rotation.z += 0.02;
                const cx = carX - checkpoint.x, cz = carZ - checkpoint.z;
                if (Math.sqrt(cx * cx + cz * cz) < 4) {
                    completeMission();
                }
            }

            // Mission checks (non-checkpoint)
            if (missionIdx < missions.length) {
                const m = missions[missionIdx];
                if (m.includes('5 coins') && coinCount >= 5) completeMission();
                else if (m.includes('10 coins') && coinCount >= 10) completeMission();
                else if (m.includes('150m') && distance >= 150) completeMission();
                else if (m.includes('400m') && distance >= 400) completeMission();
            }
        }

        function completeMission() {
            missionIdx++;
            setupMission();
        }

        function endGame(reason) {
            gameOver = true;
            finalEl.innerHTML = `
                <p>${reason}</p>
                <p>🪙 Coins: ${coinCount} &nbsp;|&nbsp; 📏 ${Math.round(distance)}m &nbsp;|&nbsp; ⏱️ ${Math.round(elapsedTime)}s</p>
                <p>Missions: ${missionIdx}/${missions.length}</p>
            `;
            overEl.classList.remove('hidden');
        }

        /* ── Render loop ─────────────────────────── */
        function animate() {
            if (!s.running) return;
            s.raf = requestAnimationFrame(animate);
            const dt = clock.getDelta();
            update(dt);
            renderer.render(scene, camera);
        }

        /* ── Start game ──────────────────────────── */
        function startGame() {
            speed = 0; steer = 0; carAngle = 0;
            fuel = 100; coinCount = 0; distance = 0; elapsedTime = 0;
            gameOver = false; missionIdx = 0;

            menuEl.classList.add('hidden');
            wrapEl.classList.remove('hidden');
            wrapEl.style.display = 'block';
            overEl.classList.add('hidden');

            // Set canvas size
            const w = wrapEl.clientWidth || window.innerWidth;
            const h = wrapEl.clientHeight || window.innerHeight - 50;
            canvasEl.width = w;
            canvasEl.height = h;

            initThree();
            s.running = true;
            animate();
        }

        function resetGame() {
            s.running = false;
            if (s.raf) cancelAnimationFrame(s.raf);

            // Dispose Three.js
            if (renderer) {
                renderer.dispose();
                scene.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                        else obj.material.dispose();
                    }
                });
            }
            scene = null; camera = null; renderer = null;
            buildings = []; trafficCars = []; coins = []; fuelPickups = []; roadMeshes = [];
            checkpointMesh = null; checkpoint = null;

            startGame();
        }

        /* ── Events ──────────────────────────────── */
        s._onKey = e => {
            keys[e.key.toLowerCase()] = e.type === 'keydown';
        };
        document.addEventListener('keydown', s._onKey);
        document.addEventListener('keyup', s._onKey);

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

        /* Touch controls */
        function setupTouch(id, key) {
            const el = container.querySelector(id);
            el.addEventListener('touchstart', e => { e.preventDefault(); touchState[key] = true; }, { passive: false });
            el.addEventListener('touchend', e => { e.preventDefault(); touchState[key] = false; }, { passive: false });
            el.addEventListener('touchcancel', () => { touchState[key] = false; });
            el.addEventListener('mousedown', () => { touchState[key] = true; });
            el.addEventListener('mouseup', () => { touchState[key] = false; });
            el.addEventListener('mouseleave', () => { touchState[key] = false; });
        }
        setupTouch('#dg-t-left', 'left');
        setupTouch('#dg-t-right', 'right');
        setupTouch('#dg-t-gas', 'gas');
        setupTouch('#dg-t-brake', 'brake');

        container.querySelector('#dg-start').addEventListener('click', startGame);
        container.querySelector('#dg-retry').addEventListener('click', resetGame);
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
