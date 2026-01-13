const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;

/* ================== CANVAS ================== */
function resizeCanvas() {
  const s = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );
  canvas.width = GAME_WIDTH * s;
  canvas.height = GAME_HEIGHT * s;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function scale() {
  return canvas.width / GAME_WIDTH;
}

/* ================== IMAGES ================== */
const bg = new Image(); bg.src = 'assets/bg.png';
const birdImg = new Image(); birdImg.src = 'assets/malik.png';
const topPipe = new Image(); topPipe.src = 'assets/top-pipe.png';
const bottomPipe = new Image(); bottomPipe.src = 'assets/bottom-pipe.png';
const groundImg = new Image(); groundImg.src = 'assets/ground.png';

/* ================== SOUND ================== */
const sndJump = new Audio('assets/jump.mp3');
const sndHit = new Audio('assets/hit.mp3');
let audioEnabled = false;

/* ================== GAME STATE ================== */
let gameStarted = false;
let gameOver = false;
let showDevOverlay = false;

/* ================== BIRD ================== */
let bird;
const gravity = 900;
const jumpPower = -320;

/* ================== PIPES ================== */
let pipes = [];
const pipeGap = 160;
const pipeWidth = 40;
const pipeSpeed = 150;
const PIPE_DISTANCE = 260;

const groundHeight = 112;

/* ================== SCORE ================== */
let score = 0;
let bestScore = Number(localStorage.getItem('bestScore') || 0);

/* ================== RESET ================== */
function resetGame() {
  bird = {
    x: 80,
    y: 200,
    vy: 0,
    width: 34,
    height: 44,
    rotation: 0
  };
  pipes = [];
  score = 0;
  gameStarted = false;
  gameOver = false;
  showDevOverlay = false;
}
resetGame();

/* ================== INPUT ================== */
canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', handleInput);

function handleInput(e) {
  if (!audioEnabled) {
    sndJump.play().catch(()=>{});
    audioEnabled = true;
  }

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale();
  const y = (e.clientY - rect.top) / scale();

  if (showDevOverlay) {
    // Крестик по координатам
    if (x > 395 && x < 420 && y > 155 && y < 185) {
      showDevOverlay = false;
    }
    return;
  }

  if (!gameStarted && !gameOver) {
    if (inside(x, y, 190, 260, 135, 40)) {
      gameStarted = true;
      return;
    }
    if (inside(x, y, 190, 320, 135, 40)) {
      showDevOverlay = true;
      return;
    }
  }

  if (gameOver) {
    if (inside(x, y, 190, 350, 135, 40)) {
      resetGame();
      return;
    }
  }

  if (gameStarted && !gameOver) {
    bird.vy = jumpPower;
    if (audioEnabled) sndJump.play().catch(()=>{});
  }
}

function inside(x, y, rx, ry, rw, rh) {
  return x > rx && x < rx + rw && y > ry && y < ry + rh;
}

/* ================== PIPES ================== */
function spawnPipe() {
  const minY = 50;
  const maxY = GAME_HEIGHT - pipeGap - groundHeight - 50;
  const y = Math.random() * (maxY - minY) + minY;
  pipes.push({ x: GAME_WIDTH, y, passed: false });
}

/* ================== COLLISION ================== */
function hit(pipe) {
  if (
    bird.x + bird.width > pipe.x &&
    bird.x < pipe.x + pipeWidth &&
    (bird.y < pipe.y || bird.y + bird.height > pipe.y + pipeGap)
  ) return true;

  if (bird.y + bird.height > GAME_HEIGHT - groundHeight) return true;
  return false;
}

/* ================== LOOP ================== */
let lastTime = 0;

function loop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (gameStarted && !gameOver) {
    bird.vy += gravity * dt;
    bird.y += bird.vy * dt;

    bird.rotation = Math.min(Math.max(bird.vy / 400, -0.5), 1.2);

    if (pipes.length === 0 || pipes[pipes.length - 1].x < GAME_WIDTH - PIPE_DISTANCE) {
      spawnPipe();
    }

    pipes.forEach(p => {
      p.x -= pipeSpeed * dt;

      if (!p.passed && p.x + pipeWidth < bird.x) {
        p.passed = true;
        score++;
      }

      if (hit(p)) {
        gameOver = true;
        if (score > bestScore) {
          bestScore = score;
          localStorage.setItem('bestScore', bestScore);
        }
        if (audioEnabled) sndHit.play().catch(()=>{});
        if (navigator.vibrate) navigator.vibrate(60);
      }
    });

    // фильтруем трубы
    pipes = pipes.filter(p => p.x > -pipeWidth);
  }

  draw();
  requestAnimationFrame(loop);
}

/* ================== DRAW ================== */
function draw() {
  ctx.save();
  ctx.scale(scale(), scale());

  ctx.drawImage(bg, 0, 0, GAME_WIDTH, GAME_HEIGHT);

  pipes.forEach(p => {
    ctx.drawImage(topPipe, p.x, p.y - topPipe.height);
    ctx.drawImage(bottomPipe, p.x, p.y + pipeGap);
  });

  // птица с вращением
  ctx.save();
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
  ctx.rotate(gameStarted ? bird.rotation : 0);
  ctx.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
  ctx.restore();

  ctx.drawImage(groundImg, 0, GAME_HEIGHT - groundHeight, GAME_WIDTH, groundHeight);

  // Счет
  ctx.fillStyle = '#fff';
  ctx.font = '28px "Press Start 2P"';
  ctx.fillText(score, GAME_WIDTH / 2 - ctx.measureText(score).width/2, 80);

  // Меню
  if (!gameStarted && !gameOver) {
    overlay('Flappy WB');
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText(`Рекорд: ${bestScore}`, 175, 220);
    button(190, 260, 'Старт');
    button(190, 320, 'Разработка');
  }

  // Game Over
  if (gameOver) {
    overlay('Game Over');
    ctx.font = '22px "Press Start 2P"';
    ctx.fillText(`Рекорд: ${bestScore}`, 175, 310);
    button(190, 350, 'Рестарт');
  }

  // Dev Overlay
  if (showDevOverlay) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(50, 140, 380, 360);

    ctx.fillStyle = '#fff';
    ctx.font = '22px "Press Start 2P"';
    ctx.fillText('Разработчик:', 80, 200);
    ctx.fillText('Поддержать проект:', 80, 240);
    ctx.fillText('+7 928 646 95 35', 80, 280);
    ctx.fillText('(Т-Банк)', 80, 320);
    ctx.fillText('Привет Малику ❤️', 80, 360);
    ctx.fillText('v1.1', 60, 490);

    ctx.font = '28px "Press Start 2P"';
    ctx.fillText('✕', 395, 170);
  }

  ctx.restore();
}

/* ================== OVERLAY ================== */
function overlay(text) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = '#fff';
  ctx.font = '28px "Press Start 2P"';
  ctx.fillText(text, GAME_WIDTH/2 - ctx.measureText(text).width/2, 180);
}

/* ================== BUTTON ================== */
function button(x, y, text, width=135, height=40) {
  ctx.fillStyle = '#333';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#555';
  roundRect(ctx, x, y, width, height, 8, true, true);

  ctx.fillStyle = '#fff';
  let fontSize = 20;
  ctx.font = fontSize + 'px "Press Start 2P"';
  while (ctx.measureText(text).width > width - 10) {
    fontSize--;
    ctx.font = fontSize + 'px "Press Start 2P"';
  }
  ctx.fillText(text, x + (width - ctx.measureText(text).width)/2, y + height/2 + fontSize/2 - 4);
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === 'undefined') stroke = true;
  if (typeof radius === 'undefined') radius = 5;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/* ================== START ================== */
requestAnimationFrame(loop);