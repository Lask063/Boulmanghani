const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const frame = document.querySelector('.game-frame');
const overlay = document.getElementById('gameOverlay');
const overlayKicker = document.getElementById('overlayKicker');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startButton = document.getElementById('startButton');
const scoreDisplay = document.getElementById('score');
const bestDisplay = document.getElementById('bestScore');
const pauseButton = document.getElementById('pauseButton');
const soundToggle = document.getElementById('soundToggle');
const restartButton = document.getElementById('restartButton');
const announcement = document.getElementById('announcement');

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 520;
const GROUND_HEIGHT = 62;
const BIRD_X = 190;
const PIPE_WIDTH = 76;
const PIPE_GAP = 164;
const PIPE_SPACING = 250;
const GRAVITY = 1250;
const FLAP_VELOCITY = -390;

let state = 'ready';
let score = 0;
let best = Number(localStorage.getItem('sky-hop-best')) || 0;
let bird = { y: 240, velocity: 0, rotation: 0 };
let pipes = [];
let lastFrame = 0;
let elapsed = 0;
let groundOffset = 0;
let soundEnabled = true;
let audioContext;
let frameRequest;
let pixelRatio = 1;

bestDisplay.textContent = formatScore(best);

function formatScore(value) {
  return String(value).padStart(2, '0');
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * pixelRatio);
  canvas.height = Math.round(bounds.height * pixelRatio);
  draw();
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  sky.addColorStop(0, '#a9d7cb');
  sky.addColorStop(0.68, '#d5e8c8');
  sky.addColorStop(1, '#f3e5b8');
  context.fillStyle = sky;
  context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  context.fillStyle = 'rgba(255, 244, 190, 0.78)';
  context.beginPath();
  context.arc(650, 106, 43, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(255, 250, 219, 0.32)';
  context.beginPath();
  context.arc(650, 106, 58, 0, Math.PI * 2);
  context.fill();

  drawCloud(147, 116, 1, 0.78);
  drawCloud(490, 204, 0.72, 0.49);
  drawCloud(736, 242, 0.88, 0.43);

  const hillShift = (elapsed * 10) % 340;
  context.fillStyle = '#9fc7a9';
  for (let index = -1; index < 4; index += 1) {
    const x = index * 340 - hillShift;
    context.beginPath();
    context.moveTo(x, WORLD_HEIGHT - GROUND_HEIGHT);
    context.quadraticCurveTo(x + 115, 294, x + 220, WORLD_HEIGHT - GROUND_HEIGHT);
    context.quadraticCurveTo(x + 285, 361, x + 340, WORLD_HEIGHT - GROUND_HEIGHT);
    context.fill();
  }

  context.fillStyle = '#85ae8e';
  for (let index = -1; index < 5; index += 1) {
    const x = index * 245 + 58 - (hillShift * 1.6) % 245;
    context.beginPath();
    context.moveTo(x, WORLD_HEIGHT - GROUND_HEIGHT);
    context.quadraticCurveTo(x + 90, 354, x + 190, WORLD_HEIGHT - GROUND_HEIGHT);
    context.fill();
  }
}

function drawCloud(x, y, scale, opacity) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = `rgba(255, 250, 226, ${opacity})`;
  context.beginPath();
  context.arc(0, 12, 17, Math.PI, 0);
  context.arc(20, 4, 23, Math.PI, 0);
  context.arc(45, 12, 16, Math.PI, 0);
  context.lineTo(61, 18);
  context.lineTo(-17, 18);
  context.closePath();
  context.fill();
  context.restore();
}

function drawPipe(pipe) {
  const groundTop = WORLD_HEIGHT - GROUND_HEIGHT;
  const capHeight = 18;
  const capOverhang = 7;
  const topEnd = pipe.gapY - PIPE_GAP / 2;
  const bottomStart = pipe.gapY + PIPE_GAP / 2;

  context.fillStyle = '#4d8f71';
  context.strokeStyle = '#30694f';
  context.lineWidth = 3;
  context.fillRect(pipe.x, 0, PIPE_WIDTH, topEnd);
  context.strokeRect(pipe.x + 1.5, -2, PIPE_WIDTH - 3, topEnd + 2);
  context.fillRect(pipe.x - capOverhang, topEnd - capHeight, PIPE_WIDTH + capOverhang * 2, capHeight);
  context.strokeRect(pipe.x - capOverhang + 1.5, topEnd - capHeight + 1.5, PIPE_WIDTH + capOverhang * 2 - 3, capHeight - 3);
  context.fillRect(pipe.x, bottomStart, PIPE_WIDTH, groundTop - bottomStart);
  context.strokeRect(pipe.x + 1.5, bottomStart, PIPE_WIDTH - 3, groundTop - bottomStart + 2);
  context.fillRect(pipe.x - capOverhang, bottomStart, PIPE_WIDTH + capOverhang * 2, capHeight);
  context.strokeRect(pipe.x - capOverhang + 1.5, bottomStart + 1.5, PIPE_WIDTH + capOverhang * 2 - 3, capHeight - 3);

  context.fillStyle = 'rgba(222, 244, 188, 0.25)';
  context.fillRect(pipe.x + 11, 0, 9, Math.max(0, topEnd - capHeight));
  context.fillRect(pipe.x + 11, bottomStart + capHeight, 9, groundTop - bottomStart - capHeight);
}

function drawBird() {
  const bob = state === 'ready' ? Math.sin(elapsed * 3.8) * 7 : 0;
  context.save();
  context.translate(BIRD_X, bird.y + bob);
  context.rotate(bird.rotation);

  context.fillStyle = 'rgba(44, 78, 63, 0.15)';
  context.beginPath();
  context.ellipse(-1, 20, 25, 6, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#ec7652';
  context.beginPath();
  context.ellipse(0, 0, 25, 20, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f4c762';
  context.beginPath();
  context.ellipse(-4, 7, 15, 10, -0.12, 0, Math.PI * 2);
  context.fill();

  const wingLift = state === 'playing' ? Math.sin(elapsed * 28) * 4 : 0;
  context.fillStyle = '#cf553e';
  context.beginPath();
  context.ellipse(-7, 1 + wingLift, 12, 7, -0.25, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff9dc';
  context.beginPath();
  context.arc(12, -7, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#17323a';
  context.beginPath();
  context.arc(14, -7, 3.1, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f1b94e';
  context.beginPath();
  context.moveTo(20, 0);
  context.lineTo(34, 4);
  context.lineTo(20, 9);
  context.closePath();
  context.fill();
  context.restore();
}

function drawGround() {
  const top = WORLD_HEIGHT - GROUND_HEIGHT;
  context.fillStyle = '#b7a46c';
  context.fillRect(0, top, WORLD_WIDTH, GROUND_HEIGHT);
  context.fillStyle = '#6d9d69';
  context.fillRect(0, top, WORLD_WIDTH, 12);
  context.fillStyle = '#d4be7d';
  context.fillRect(0, top + 12, WORLD_WIDTH, 4);

  context.save();
  context.beginPath();
  context.rect(0, top + 16, WORLD_WIDTH, GROUND_HEIGHT - 16);
  context.clip();
  context.fillStyle = 'rgba(101, 115, 72, 0.22)';
  for (let x = -35 - groundOffset; x < WORLD_WIDTH + 35; x += 38) {
    context.beginPath();
    context.moveTo(x, top + 27);
    context.lineTo(x + 12, top + 27);
    context.lineTo(x + 27, WORLD_HEIGHT);
    context.lineTo(x + 15, WORLD_HEIGHT);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function draw() {
  if (!context) return;
  context.setTransform(canvas.width / WORLD_WIDTH, 0, 0, canvas.height / WORLD_HEIGHT, 0, 0);
  drawBackground();
  pipes.forEach(drawPipe);
  drawBird();
  drawGround();
}

function makePipe(x) {
  return { x, gapY: 152 + Math.random() * 188, scored: false };
}

function resetGame() {
  score = 0;
  bird = { y: 240, velocity: 0, rotation: 0 };
  pipes = [makePipe(560), makePipe(560 + PIPE_SPACING)];
  scoreDisplay.textContent = formatScore(score);
  elapsed = 0;
  groundOffset = 0;
}

function startGame() {
  if (state === 'playing') return;
  if (state === 'over') resetGame();
  state = 'playing';
  overlay.classList.add('is-hidden');
  frame.classList.add('is-playing');
  pauseButton.disabled = false;
  pauseButton.setAttribute('aria-label', 'Pause game');
  pauseButton.title = 'Pause game';
  pauseButton.innerHTML = '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
  flap();
  lastFrame = performance.now();
  cancelAnimationFrame(frameRequest);
  frameRequest = requestAnimationFrame(tick);
}

function flap() {
  if (state === 'ready' || state === 'over') {
    startGame();
    return;
  }
  if (state !== 'playing') return;
  bird.velocity = FLAP_VELOCITY;
  playTone(520, 0.055, 'triangle', 0.045);
}

function tick(now) {
  if (state !== 'playing') return;
  const delta = Math.min((now - lastFrame) / 1000, 0.035);
  lastFrame = now;
  elapsed += delta;
  update(delta);
  draw();
  frameRequest = requestAnimationFrame(tick);
}

function update(delta) {
  const groundTop = WORLD_HEIGHT - GROUND_HEIGHT;
  bird.velocity += GRAVITY * delta;
  bird.y += bird.velocity * delta;
  bird.rotation = Math.max(-0.48, Math.min(1.05, bird.velocity / 650));
  groundOffset = (groundOffset + 130 * delta) % 38;

  for (const pipe of pipes) {
    pipe.x -= 190 * delta;
    if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
      pipe.scored = true;
      score += 1;
      scoreDisplay.textContent = formatScore(score);
      announcement.textContent = `Score ${score}`;
      playTone(760, 0.11, 'sine', 0.06);
      if (score > best) {
        best = score;
        bestDisplay.textContent = formatScore(best);
        localStorage.setItem('sky-hop-best', String(best));
      }
    }
    if (pipe.x + PIPE_WIDTH + 12 < 0) {
      pipes.shift();
      pipes.push(makePipe(pipes[pipes.length - 1].x + PIPE_SPACING));
      break;
    }
  }

  if (bird.y - 15 < 0 || bird.y + 15 > groundTop || pipes.some((pipe) => hitsPipe(pipe))) {
    endGame();
  }
}

function hitsPipe(pipe) {
  const overlapsX = BIRD_X + 18 > pipe.x - 5 && BIRD_X - 18 < pipe.x + PIPE_WIDTH + 5;
  if (!overlapsX) return false;
  const gapTop = pipe.gapY - PIPE_GAP / 2;
  const gapBottom = pipe.gapY + PIPE_GAP / 2;
  return bird.y - 14 < gapTop || bird.y + 14 > gapBottom;
}

function endGame() {
  state = 'over';
  bird.rotation = Math.min(1.2, bird.rotation + 0.2);
  pauseButton.disabled = true;
  frame.classList.remove('is-playing');
  overlayKicker.textContent = score > 0 ? 'NICE LITTLE FLIGHT' : 'THE SKY IS STILL YOURS';
  overlayTitle.innerHTML = score > 0 ? `You flew<br />${score} ${score === 1 ? 'gate' : 'gates'}.` : 'One more<br />try?';
  overlayMessage.textContent = score >= best && score > 0 ? 'A new personal best. That was lovely.' : 'Every great flight starts with another try.';
  startButton.querySelector('span:first-child').textContent = 'Fly again';
  overlay.classList.remove('is-hidden');
  announcement.textContent = `Game over. You passed ${score} ${score === 1 ? 'gate' : 'gates'}.`;
  playTone(180, 0.22, 'sawtooth', 0.035);
  draw();
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    cancelAnimationFrame(frameRequest);
    overlayKicker.textContent = 'TAKE A BREATH';
    overlayTitle.innerHTML = 'Flight<br />paused.';
    overlayMessage.textContent = 'Your little bird is right where you left it.';
    startButton.querySelector('span:first-child').textContent = 'Keep flying';
    overlay.classList.remove('is-hidden');
    frame.classList.remove('is-playing');
    pauseButton.setAttribute('aria-label', 'Resume game');
    pauseButton.title = 'Resume game';
    pauseButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
  } else if (state === 'paused') {
    state = 'playing';
    overlay.classList.add('is-hidden');
    frame.classList.add('is-playing');
    pauseButton.setAttribute('aria-label', 'Pause game');
    pauseButton.title = 'Pause game';
    pauseButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
    lastFrame = performance.now();
    frameRequest = requestAnimationFrame(tick);
  }
}

function playTone(frequency, duration, waveform, volume) {
  if (!soundEnabled) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    soundEnabled = false;
  }
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  flap();
});

startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', () => {
  resetGame();
  state = 'ready';
  overlayKicker.textContent = 'THE SKY IS YOURS';
  overlayTitle.innerHTML = 'Ready,<br />little bird?';
  overlayMessage.textContent = 'Thread the gates. Keep your wings.';
  startButton.querySelector('span:first-child').textContent = 'Start flying';
  overlay.classList.remove('is-hidden');
  frame.classList.remove('is-playing');
  pauseButton.disabled = true;
  pauseButton.setAttribute('aria-label', 'Pause game');
  pauseButton.title = 'Pause game';
  pauseButton.innerHTML = '<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
  draw();
});

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle('is-muted', !soundEnabled);
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Enable sound');
  soundToggle.title = soundEnabled ? 'Mute sound' : 'Enable sound';
  if (soundEnabled) playTone(660, 0.08, 'sine', 0.035);
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    if (!event.repeat) flap();
  } else if (event.code === 'Escape' || event.code === 'KeyP') {
    togglePause();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') togglePause();
});

window.addEventListener('resize', resizeCanvas);
resetGame();
resizeCanvas();