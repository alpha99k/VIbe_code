const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const stageElement = document.getElementById('stage');
const timerElement = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const rankingList = document.getElementById('ranking-list');
const modal = document.getElementById('game-over-modal');
const finalScoreElement = document.getElementById('final-score');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score-btn');

context.scale(20, 20);
nextContext.scale(20, 20);

let gameRunning = false;
let animationId = null;
let particles = [];
let screenShake = 0;

let stage = 1;
let timeLeft = 90;
let linesClearedInStage = 0;
const linesPerStage = 8;
let timerInterval = null;

let nextPiece = null;

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.gravity = 0.01;
        this.alpha = 1;
        this.life = 1;
    }

    update() {
        this.vx *= 0.98;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
        this.alpha = Math.max(0, this.life);
    }

    draw() {
        context.globalAlpha = this.alpha;
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, 0.5, 0.5);
        context.globalAlpha = 1;
    }
}

function createParticles(y, arena) {
    for (let x = 0; x < arena[y].length; x++) {
        const color = colors[arena[y][x]];
        if (!color) continue;
        for (let i = 0; i < 4; i++) {
            particles.push(new Particle(x + Math.random(), y + Math.random(), color));
        }
    }
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        createParticles(y, arena);
        screenShake = 4;

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        rowCount++;
        linesClearedInStage++;
        timeLeft += 3;
    }

    if (rowCount > 0) {
        player.score += (rowCount * 10) * stage;
        updateScore();
        checkStageUp();
    }
}

function checkStageUp() {
    if (linesClearedInStage >= linesPerStage) {
        stage++;
        linesClearedInStage = 0;
        timeLeft += 30;
        dropInterval = Math.max(100, 1000 - (stage - 1) * 70);
        updateStageDisplay();
        screenShake = 10;
    }
}

function updateStageDisplay() {
    stageElement.innerText = stage;
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameRunning) return;
        
        timeLeft--;
        timerElement.innerText = timeLeft;
        
        if (timeLeft <= 0) {
            gameOver("TIME OVER!");
        }
    }, 1000);
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ];
    } else if (type === 'J') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (type === 'O') {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (type === 'Z') {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset, targetContext = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const color = colors[value];
                const posX = x + offset.x;
                const posY = y + offset.y;

                targetContext.fillStyle = '#000';
                targetContext.fillRect(posX, posY, 1, 1);

                targetContext.fillStyle = color;
                targetContext.fillRect(posX + 0.1, posY + 0.1, 0.8, 0.8);

                targetContext.fillStyle = 'rgba(255, 255, 255, 0.3)';
                targetContext.fillRect(posX + 0.1, posY + 0.1, 0.2, 0.2);
                
                targetContext.fillStyle = 'rgba(0, 0, 0, 0.3)';
                targetContext.fillRect(posX + 0.7, posY + 0.7, 0.2, 0.2);
            }
        });
    });
}

function draw() {
    context.setTransform(20, 0, 0, 20, 0, 0);
    
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        context.translate(dx, dy);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#111';
    context.lineWidth = 0.02;
    for (let i = 0; i <= 12; i++) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, 20);
        context.stroke();
    }
    for (let i = 0; i <= 20; i++) {
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(12, i);
        context.stroke();
    }

    drawMatrix(arena, {x: 0, y: 0});
    if (player.matrix) {
        drawMatrix(player.matrix, player.pos);
    }

    particles.forEach((p, index) => {
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(index, 1);
    });

    drawNext();
}

function drawNext() {
    nextContext.setTransform(20, 0, 0, 20, 0, 0);
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const xOffset = (5 - nextPiece[0].length) / 2;
        const yOffset = (5 - nextPiece.length) / 2;
        drawMatrix(nextPiece, {x: xOffset, y: yOffset}, nextContext);
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
    screenShake = 1;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
}

function playerReset() {
    const pieces = 'TJLOSZI';
    
    if (nextPiece === null) {
        nextPiece = createPiece(pieces[pieces.length * Math.random() | 0]);
    }
    
    player.matrix = nextPiece;
    nextPiece = createPiece(pieces[pieces.length * Math.random() | 0]);
    
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);
    
    if (collide(arena, player)) {
        gameOver("GAME OVER");
    }
    
    drawNext();
}

function gameOver(title = "GAME OVER") {
    gameRunning = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(animationId);
    animationId = null;
    
    const modalTitle = modal.querySelector('h2');
    modalTitle.innerText = title;
    
    finalScoreElement.innerText = player.score;
    modal.style.display = 'flex';
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    if (!gameRunning) {
        draw();
        animationId = requestAnimationFrame(update);
        return;
    }

    const deltaTime = time - lastTime;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    lastTime = time;
    draw();
    animationId = requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = player.score;
}

function loadRankings() {
    const rankings = JSON.parse(localStorage.getItem('tetrisRankings')) || [];
    rankingList.innerHTML = '';
    const ordinals = ['1ST.', '2ND.', '3RD.', '4TH.', '5TH.'];
    const colors_rank = ['#ffd700', '#c0c0c0', '#cd7f32', '#ffffff', '#ffffff'];
    
    rankings.forEach((entry, index) => {
        const li = document.createElement('li');
        li.style.color = colors_rank[index]; // 순위에 따른 색상 적용
        li.innerHTML = `<span>${ordinals[index]} ${entry.name}</span> <span>${entry.score}</span>`;
        rankingList.appendChild(li);
    });
}

function saveRanking(name, score) {
    let rankings = JSON.parse(localStorage.getItem('tetrisRankings')) || [];
    rankings.push({ name, score });
    rankings.sort((a, b) => b.score - a.score);
    rankings = rankings.slice(0, 5); 
    localStorage.setItem('tetrisRankings', JSON.stringify(rankings));
    loadRankings();
}

const colors = [
    null,
    '#ff0040',
    '#00e4ff',
    '#ffec27',
    '#ffa300',
    '#29adff',
    '#00e756',
    '#ff77a8',
];

const arena = createMatrix(12, 20);

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
};

document.addEventListener('keydown', event => {
    if (!gameRunning) return;
    
    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 81) {
        playerRotate(-1);
    } else if (event.keyCode === 38) {
        playerRotate(1);
    } else if (event.keyCode === 32) {
        while (!collide(arena, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        screenShake = 5;
    }
});

startBtn.addEventListener('click', () => {
    resetGame();
    gameRunning = true;
    startTimer();
    if (!animationId) {
        update();
    }
    startBtn.style.display = 'none';
});

saveScoreBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || 'Anonymous';
    saveRanking(name, player.score);
    modal.style.display = 'none';
    startBtn.style.display = 'block';
    // 점수 저장 후에는 게임이 리셋된 상태로 대기해야 하므로 resetGame만 호출
    resetGame();
});

function resetGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    stage = 1;
    timeLeft = 90;
    linesClearedInStage = 0;
    dropInterval = 1000;
    nextPiece = null;
    updateScore();
    updateStageDisplay();
    timerElement.innerText = timeLeft;
    playerReset();
    particles = [];
    clearInterval(timerInterval);
}

// 처음 페이지 로드 시 랭킹만 로드하고 게임 루프는 시작하지 않음
loadRankings();
draw(); // 초기 화면 한 번 그리기
