/* ── Ping Pong ────────────────────────────────── */
App.register({
    id: 'ping-pong',
    title: 'Ping Pong',
    icon: '🏓',
    description: '1P vs AI or 2P local. Classic paddle game.',
    tag: 'Classic',
    tagClass: 'tag-classic',

    _state: null,

    init(container) {
        const s = this._state = {};

        container.innerHTML = `
            <div class="pp-wrap">
                <div class="pp-menu" id="pp-menu">
                    <h2 class="g-title">PING PONG</h2>
                    <div class="g-row">
                        <button class="g-btn" id="pp-1p">1 Player</button>
                        <button class="g-btn" id="pp-2p">2 Players</button>
                    </div>
                    <div id="pp-diff" class="hidden g-col" style="margin-top:0.75rem">
                        <span class="g-info">Difficulty</span>
                        <div class="g-row">
                            <button class="g-btn-sm pp-diff" data-d="easy">Easy</button>
                            <button class="g-btn-sm pp-diff" data-d="medium">Medium</button>
                            <button class="g-btn-sm pp-diff" data-d="hard">Hard</button>
                        </div>
                    </div>
                    <div class="g-col" style="margin-top:0.75rem">
                        <span class="g-info">Ball Speed</span>
                        <div class="g-row" style="align-items:center">
                            <button class="g-btn-sm" id="pp-sp-dn">−</button>
                            <span id="pp-sp-val" style="font-size:1.3rem;font-weight:700;color:#00e5ff;min-width:2ch;text-align:center">3</span>
                            <button class="g-btn-sm" id="pp-sp-up">+</button>
                        </div>
                    </div>
                    <p style="color:#555;font-size:0.8rem;margin-top:1rem">W/S — Left &nbsp;|&nbsp; ↑/↓ — Right</p>
                </div>
                <div id="pp-game" class="hidden" style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column">
                    <div id="pp-score" style="display:flex;gap:0.75rem;font-size:clamp(1.5rem,4vw,2.5rem);font-weight:700;margin-bottom:0.5rem">
                        <span id="pp-sl" style="color:#00e5ff">0</span>
                        <span style="color:#444">:</span>
                        <span id="pp-sr" style="color:#ff4081">0</span>
                    </div>
                    <canvas id="pp-canvas" style="background:#111122;border-radius:8px;display:block;max-width:100%;max-height:70vh"></canvas>
                    <div id="pp-msg" style="position:absolute;top:55%;left:50%;transform:translate(-50%,-50%);color:#ffffffcc;font-size:clamp(1rem,3vw,1.5rem);text-align:center;pointer-events:none"></div>
                </div>
            </div>
        `;

        const WINNING = 7;
        const SPEEDS = [3, 4, 5, 7, 9];
        let speedIdx = 2;
        let ballSpeed = SPEEDS[speedIdx];
        const PADDLE_SPEED = 6;
        const keys = {};

        const menu = container.querySelector('#pp-menu');
        const gameDiv = container.querySelector('#pp-game');
        const canvas = container.querySelector('#pp-canvas');
        const ctx = canvas.getContext('2d');
        const diffDiv = container.querySelector('#pp-diff');
        const spVal = container.querySelector('#pp-sp-val');

        let W, H, pw, ph, bs;
        const lp = { x:0, y:0, dy:0 }, rp = { x:0, y:0, dy:0 };
        const ball = { x:0, y:0, dx:0, dy:0, speed:0 };
        const score = { l:0, r:0 };
        let mode, diff, paused, running, serving, rafId;
        let aiTarget = 0, aiTimer = 0;
        const touches = {};
        const aiCfg = {
            easy:   { speed:3,   delay:12, err:40 },
            medium: { speed:4.5, delay:6,  err:15 },
            hard:   { speed:6,   delay:2,  err:4  },
        };

        function clamp(v,a,b){ return v<a?a:v>b?b:v; }

        function resize(){
            const r=4/3; let w=window.innerWidth, h=window.innerHeight;
            if(w/h>r) w=h*r; else h=w/r;
            w=Math.floor(w*0.92); h=Math.floor(h*0.92);
            canvas.width=W=w; canvas.height=H=h;
            pw=Math.max(8,Math.round(W*0.015));
            ph=Math.max(40,Math.round(H*0.18));
            bs=Math.max(8,Math.round(W*0.015));
            lp.x=pw; rp.x=W-2*pw;
            lp.y=clamp(lp.y,0,H-ph); rp.y=clamp(rp.y,0,H-ph);
        }

        function resetBall(dir){
            ball.x=W/2; ball.y=H/2;
            ball.speed=ballSpeed*(W/800);
            const a=(Math.random()*Math.PI/4)-Math.PI/8;
            ball.dx=ball.speed*(dir||(Math.random()<0.5?1:-1));
            ball.dy=ball.speed*Math.sin(a);
            serving=true;
        }

        function start(m,d){
            mode=m; diff=d||'medium';
            score.l=score.r=0; updScore();
            lp.y=rp.y=H/2-ph/2; lp.dy=rp.dy=0;
            resetBall(); paused=false; running=true;
            menu.classList.add('hidden');
            gameDiv.classList.remove('hidden');
            showMsg('Press any key / tap to serve');
            loop();
        }

        function stop(){ running=false; if(rafId) cancelAnimationFrame(rafId); }

        function updScore(){
            container.querySelector('#pp-sl').textContent=score.l;
            container.querySelector('#pp-sr').textContent=score.r;
        }
        function showMsg(m){ container.querySelector('#pp-msg').textContent=m; }
        function hideMsg(){ container.querySelector('#pp-msg').textContent=''; }

        function serve(){ if(running&&!paused&&serving){ serving=false; hideMsg(); } }

        function draw(){
            ctx.clearRect(0,0,W,H);
            ctx.setLineDash([8,8]); ctx.strokeStyle='#333355'; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([]);
            roundRect(lp.x,lp.y,pw,ph,4,'#00e5ff');
            roundRect(rp.x,rp.y,pw,ph,4,'#ff4081');
            ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=12;
            ctx.beginPath(); ctx.arc(ball.x,ball.y,bs/2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }

        function roundRect(x,y,w,h,r,c){
            ctx.fillStyle=c; ctx.shadowColor=c; ctx.shadowBlur=10;
            ctx.beginPath(); ctx.moveTo(x+r,y);
            ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
            ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
            ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
            ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
            ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
        }

        function hasTouchSide(side){ for(const id in touches) if(touches[id].side===side) return true; return false; }

        function update(){
            if(paused||serving) return;
            const sp=PADDLE_SPEED*(H/600);
            if(keys['w']) lp.dy=-sp; else if(keys['s']) lp.dy=sp; else if(!hasTouchSide('left')) lp.dy=0;
            if(mode==='2p'){
                if(keys['arrowup']) rp.dy=-sp; else if(keys['arrowdown']) rp.dy=sp; else if(!hasTouchSide('right')) rp.dy=0;
            } else { updateAI(sp); }
            lp.y=clamp(lp.y+lp.dy,0,H-ph); rp.y=clamp(rp.y+rp.dy,0,H-ph);
            ball.x+=ball.dx; ball.y+=ball.dy;
            if(ball.y-bs/2<=0){ ball.y=bs/2; ball.dy=Math.abs(ball.dy); }
            if(ball.y+bs/2>=H){ ball.y=H-bs/2; ball.dy=-Math.abs(ball.dy); }
            if(ball.dx<0&&ball.x-bs/2<=lp.x+pw&&ball.x-bs/2>=lp.x&&ball.y>=lp.y&&ball.y<=lp.y+ph) hitPaddle(lp,false);
            if(ball.dx>0&&ball.x+bs/2>=rp.x&&ball.x+bs/2<=rp.x+pw&&ball.y>=rp.y&&ball.y<=rp.y+ph) hitPaddle(rp,true);
            if(ball.x<-bs){ score.r++; updScore(); checkWin()||resetBall(1); }
            if(ball.x>W+bs){ score.l++; updScore(); checkWin()||resetBall(-1); }
        }

        function hitPaddle(p,isR){
            const rel=(ball.y-(p.y+ph/2))/(ph/2), a=rel*(Math.PI/4);
            ball.speed*=1.03;
            ball.dx=ball.speed*Math.cos(a)*(isR?-1:1);
            ball.dy=ball.speed*Math.sin(a);
            ball.x=isR?rp.x-bs/2:lp.x+pw+bs/2;
        }

        function checkWin(){
            if(score.l>=WINNING){ showMsg(mode==='2p'?'Left Wins!':'You Win!'); stop(); return true; }
            if(score.r>=WINNING){ showMsg(mode==='2p'?'Right Wins!':'AI Wins!'); stop(); return true; }
            showMsg('Tap / press to serve'); return false;
        }

        function updateAI(){
            const c=aiCfg[diff], sp=c.speed*(H/600);
            aiTimer++; if(aiTimer>=c.delay){ aiTimer=0; aiTarget=ball.y+(Math.random()-0.5)*c.err*2; }
            const d=aiTarget-(rp.y+ph/2);
            rp.dy=Math.abs(d)>4?(d>0?sp:-sp):0;
        }

        function loop(){ if(!running) return; update(); draw(); rafId=requestAnimationFrame(loop); }

        /* Events */
        s._onKey = e => { keys[e.key.toLowerCase()]=e.type==='keydown'; if(e.type==='keydown') serve(); };
        document.addEventListener('keydown', s._onKey);
        document.addEventListener('keyup', s._onKey);

        canvas.addEventListener('click', serve);

        canvas.addEventListener('touchstart', e=>{
            e.preventDefault(); serve();
            const rect=canvas.getBoundingClientRect();
            for(const t of e.changedTouches){
                const side=(t.clientX-rect.left)<rect.width/2?'left':'right';
                if(mode==='1p'&&side==='right') continue;
                touches[t.identifier]={side,lastY:t.clientY};
            }
        },{passive:false});
        canvas.addEventListener('touchmove', e=>{
            e.preventDefault();
            const rect=canvas.getBoundingClientRect(), sy=H/rect.height;
            for(const t of e.changedTouches){
                const inf=touches[t.identifier]; if(!inf) continue;
                const dy=(t.clientY-inf.lastY)*sy; inf.lastY=t.clientY;
                if(inf.side==='left') lp.y=clamp(lp.y+dy,0,H-ph);
                else rp.y=clamp(rp.y+dy,0,H-ph);
            }
        },{passive:false});
        canvas.addEventListener('touchend', e=>{ for(const t of e.changedTouches) delete touches[t.identifier]; });

        container.querySelector('#pp-1p').addEventListener('click',()=>diffDiv.classList.remove('hidden'));
        container.querySelector('#pp-2p').addEventListener('click',()=>{ diffDiv.classList.add('hidden'); start('2p'); });
        diffDiv.addEventListener('click',e=>{ const b=e.target.closest('.pp-diff'); if(b) start('1p',b.dataset.d); });

        const setSpeed=i=>{ speedIdx=clamp(i,0,SPEEDS.length-1); ballSpeed=SPEEDS[speedIdx]; spVal.textContent=speedIdx+1; };
        container.querySelector('#pp-sp-dn').addEventListener('click',()=>setSpeed(speedIdx-1));
        container.querySelector('#pp-sp-up').addEventListener('click',()=>setSpeed(speedIdx+1));

        s._onResize = resize;
        window.addEventListener('resize', resize);
        resize();
    },

    destroy() {
        const s = this._state; if(!s) return;
        document.removeEventListener('keydown', s._onKey);
        document.removeEventListener('keyup', s._onKey);
        window.removeEventListener('resize', s._onResize);
        this._state = null;
    }
});
