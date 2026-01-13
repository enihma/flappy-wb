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
const PIPE_DISTANCE = 240; // 🔥 расстояние между парами труб

const groundHeight = 100;
let score = 0;

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
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale();
  const y = (e.clientY - rect.top) / scale();

  if (showDevOverlay) {
    if (x > 390 && x < 420 && y > 160 && y < 190) {
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
  }
}

function inside(x, y, rx, ry, rw, rh) {
  return x > rx && x < rx + rw && y > ry && y < ry + rh;
}

/* ================== PIPES ================== */
function spawnPipe() {
  const y = Math.random() * (GAME_HEIGHT - pipeGap - groundHeight - 100) + 50;
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

    // rotation по скорости
    bird.rotation = Math.min(
      Math.max(bird.vy / 400, -0.5),
      1.2
    );

    if (
      pipes.length === 0 ||
      pipes[pipes.length - 1].x < GAME_WIDTH - PIPE_DISTANCE
    ) {
      spawnPipe();
    }

    pipes.forEach(p => {
      p.x -= pipeSpeed * dt;

      if (!p.passed && p.x + pipeWidth < bird.x) {
        p.passed = true;
        score++;
      }

      if (hit(p)) gameOver = true;
    });

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

  // 🔥 ROTATED BIRD
  ctx.save();
  ctx.translate(
    bird.x + bird.width / 2,
    bird.y + bird.height / 2
  );
  ctx.rotate(bird.rotation);
  ctx.drawImage(
    birdImg,
    -bird.width / 2,
    -bird.height / 2,
    bird.width,
    bird.height
  );
  ctx.restore();

  ctx.drawImage(groundImg, 0, GAME_HEIGHT - groundHeight);

  ctx.fillStyle = '#fff';
  ctx.font = '48px Arial';
  ctx.fillText(score, GAME_WIDTH / 2 - 15, 90);

  if (!gameStarted && !gameOver) {
    overlay('  Flappy WB');
    button(190, 260, '     Старт');
    button(190, 320, 'Разработка');
  }

  if (gameOver) {
    overlay('Game Over');
    button(190, 350, '   Рестарт');
  }

  if (showDevOverlay) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(50, 140, 380, 360);

    ctx.fillStyle = '#fff';
    ctx.font = '22px Arial';
    ctx.fillText('Разработчик:', 80, 200);
    ctx.fillText('Поддержать проект:', 80, 240);
    ctx.fillText('+7 928 646 95 35', 80, 280);
    ctx.fillText('(Т-Банк)', 80, 320);
    ctx.fillText('Привет Малику ❤️', 80, 360);
    ctx.fillText('v1.0', 60, 490);

    ctx.font = '28px Arial';
    ctx.fillText('✕', 395, 185);
  }

  ctx.restore();
}

function overlay(text) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.font = '36px Arial';
  ctx.fillText(text, GAME_WIDTH / 2 - 90, 180);
}

function button(x, y, text) {
  ctx.fillStyle = '#555';
  ctx.fillRect(x, y, 135, 40);
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText(text, x + 15, y + 27);
}

/* ================== START ================== */
requestAnimationFrame(loop);
