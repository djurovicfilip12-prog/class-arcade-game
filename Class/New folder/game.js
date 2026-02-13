const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const gameOverScreen = document.getElementById("gameOver");
const finalScoreEl = document.getElementById("finalScore");

canvas.width = 800;
canvas.height = 600;

// Config
const FPS = 60;
const SHIP_SIZE = 20;
const LASER_SAFE_TIME = 30; // Frames before a laser can hit the player

let ship, asteroids, lasers, stars, score, level, gameActive;

function init() {
    score = 0;
    level = 1;
    gameActive = true;
    gameOverScreen.classList.add("hidden");
    ship = newShip();
    lasers = [];
    createStars();
    createAsteroids();
    requestAnimationFrame(gameLoop);
}

function createStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: Math.random() * 0.5, // Different speeds for parallax
            size: Math.random() * 2
        });
    }
}

function newShip() {
    return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        r: SHIP_SIZE / 2,
        a: 90 / 180 * Math.PI,
        rot: 0,
        thrusting: false,
        thrust: { x: 0, y: 0 },
        canShoot: true
    };
}

function createAsteroids() {
    asteroids = [];
    let num = 3 + level;
    for (let i = 0; i < num; i++) {
        let x, y;
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (distBetween(x, y, ship.x, ship.y) < 150);
        asteroids.push(newAsteroid(x, y, 40));
    }
}

function newAsteroid(x, y, r) {
    let roid = { x, y, r, 
        xv: (Math.random() * 2 - 1) * (level * 0.5), 
        yv: (Math.random() * 2 - 1) * (level * 0.5),
        vert: Math.floor(Math.random() * 6 + 7),
        offs: []
    };
    for (let i = 0; i < roid.vert; i++) roid.offs.push(Math.random() * 0.4 + 0.8);
    return roid;
}

// Input
window.addEventListener("keydown", e => {
    if (!gameActive) return;
    if (e.code === "ArrowLeft") ship.rot = 0.1;
    if (e.code === "ArrowRight") ship.rot = -0.1;
    if (e.code === "ArrowUp") ship.thrusting = true;
    if (e.code === "Space") shootLaser();
});

window.addEventListener("keyup", e => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") ship.rot = 0;
    if (e.code === "ArrowUp") ship.thrusting = false;
    if (e.code === "Space") ship.canShoot = true;
});

function shootLaser() {
    if (ship.canShoot && lasers.length < 10) {
        lasers.push({
            x: ship.x + ship.r * Math.cos(ship.a),
            y: ship.y - ship.r * Math.sin(ship.a),
            xv: 7 * Math.cos(ship.a),
            yv: -7 * Math.sin(ship.a),
            life: 0 // Track frames to avoid instant self-hit
        });
        ship.canShoot = false;
    }
}

function distBetween(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
}

function endGame() {
    gameActive = false;
    gameOverScreen.classList.remove("hidden");
    finalScoreEl.innerText = `SCORE: ${score}`;
}

function resetGame() {
    init();
}

function update() {
    if (!gameActive) return;

    // Move Stars (Parallax)
    stars.forEach(s => {
        s.x -= s.speed;
        if (s.x < 0) s.x = canvas.width;
    });

    // Ship
    if (ship.thrusting) {
        ship.thrust.x += 0.15 * Math.cos(ship.a);
        ship.thrust.y -= 0.15 * Math.sin(ship.a);
    } else {
        ship.thrust.x *= 0.99; ship.thrust.y *= 0.99;
    }
    ship.x += ship.thrust.x; ship.y += ship.thrust.y; ship.a += ship.rot;

    // Wrapping
    [ship, ...asteroids, ...lasers].forEach(obj => {
        if (obj.x < -20) obj.x = canvas.width + 20;
        else if (obj.x > canvas.width + 20) obj.x = -20;
        if (obj.y < -20) obj.y = canvas.height + 20;
        else if (obj.y > canvas.height + 20) obj.y = -20;
    });

    // Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
        let l = lasers[i];
        l.x += l.xv; l.y += l.yv; l.life++;

        // SUICIDE MECHANIC: Check if laser hits player after a short delay
        if (l.life > LASER_SAFE_TIME) {
            if (distBetween(ship.x, ship.y, l.x, l.y) < ship.r) {
                endGame();
                return;
            }
        }

        // Hit Asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            let r = asteroids[j];
            if (distBetween(l.x, l.y, r.x, r.y) < r.r) {
                lasers.splice(i, 1);
                if (r.r > 15) {
                    asteroids.push(newAsteroid(r.x, r.y, r.r / 2));
                    asteroids.push(newAsteroid(r.x, r.y, r.r / 2));
                }
                asteroids.splice(j, 1);
                score += 100;
                scoreEl.innerText = `SCORE: ${score.toString().padStart(4, '0')}`;
                break;
            }
        }
        if (l.life > 100) lasers.splice(i, 1);
    }

    // Asteroid vs Ship
    asteroids.forEach(r => {
        if (distBetween(ship.x, ship.y, r.x, r.y) < ship.r + r.r) endGame();
        r.x += r.xv; r.y += r.yv;
    });

    if (asteroids.length === 0) {
        level++;
        levelEl.innerText = `LEVEL: ${level}`;
        createAsteroids();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

    // Ship
    ctx.strokeStyle = "#0ff"; ctx.shadowBlur = 10; ctx.shadowColor = "#0ff";
    ctx.beginPath();
    ctx.moveTo(ship.x + ship.r * 1.5 * Math.cos(ship.a), ship.y - ship.r * 1.5 * Math.sin(ship.a));
    ctx.lineTo(ship.x - ship.r * (Math.cos(ship.a) + Math.sin(ship.a)), ship.y + ship.r * (Math.sin(ship.a) - Math.cos(ship.a)));
    ctx.lineTo(ship.x - ship.r * (Math.cos(ship.a) - Math.sin(ship.a)), ship.y + ship.r * (Math.sin(ship.a) + Math.cos(ship.a)));
    ctx.closePath(); ctx.stroke();

    // Lasers
    ctx.fillStyle = "#ff0"; ctx.shadowColor = "#ff0";
    lasers.forEach(l => { ctx.beginPath(); ctx.arc(l.x, l.y, 2, 0, Math.PI*2); ctx.fill(); });

    // Asteroids
    ctx.strokeStyle = "#f0f"; ctx.shadowColor = "#f0f";
    asteroids.forEach(r => {
        ctx.beginPath();
        for (let i = 0; i < r.vert; i++) {
            ctx.lineTo(r.x + r.r * r.offs[i] * Math.cos(i * Math.PI * 2 / r.vert),
                       r.y + r.r * r.offs[i] * Math.sin(i * Math.PI * 2 / r.vert));
        }
        ctx.closePath(); ctx.stroke();
    });
}

function gameLoop() {
    update();
    draw();
    if (gameActive) requestAnimationFrame(gameLoop);
}

init();