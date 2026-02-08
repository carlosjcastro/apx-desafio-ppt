const appEl = document.getElementById("app");

const ASSETS = {
  rock: "https://openmoji.org/data/color/svg/270A.svg",
  paper: "https://openmoji.org/data/color/svg/270B.svg",
  scissors: "https://openmoji.org/data/color/svg/270C.svg",
};

const state = {
  score: loadScore(),
  round: {
    phase: "idle",
    secondsLeft: 3,
    progress: 1,
    locked: false,
    userPick: null,
    cpuPick: null,
    result: null,
  },
  ui: {
    lastRoute: "#/",
  },
};

function loadScore() {
  try {
    const raw = localStorage.getItem("ppt_score");
    if (!raw) return { user: 0, cpu: 0 };
    const parsed = JSON.parse(raw);
    return {
      user: Number(parsed?.user || 0),
      cpu: Number(parsed?.cpu || 0),
    };
  } catch {
    return { user: 0, cpu: 0 };
  }
}

function saveScore() {
  localStorage.setItem("ppt_score", JSON.stringify(state.score));
}

function setCSSPattern() {
  const svg = encodeURIComponent(
    `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <g fill="none" stroke="#8fb6ef" stroke-width="2" opacity="0.9">
    <path d="M58 18c7 2 10 8 10 16v14c0 6-3 9-8 9H44c-7 0-10-4-10-10V36c0-10 8-19 24-18z"/>
    <path d="M45 58c3 8 9 14 18 18"/>
    <path d="M32 62c10 8 22 12 36 12"/>
    <path d="M38 28v20"/>
    <path d="M46 24v24"/>
    <path d="M54 22v26"/>
    <path d="M62 24v24"/>
  </g>
</svg>
`.trim()
  );
  document.documentElement.style.setProperty(
    "--pattern",
    `url("data:image/svg+xml,${svg}")`
  );
}

setCSSPattern();

const routes = {
  "#/": HomePage,
  "#/rules": RulesPage,
  "#/play": GamePage,
  "#/result": ResultPage,
};

function navigate(hash) {
  if (!hash.startsWith("#/")) hash = "#/";
  window.location.hash = hash;
}

function getRoute() {
  const h = window.location.hash || "#/";
  return routes[h] ? h : "#/";
}

function render() {
  const r = getRoute();
  state.ui.lastRoute = r;
  const page = routes[r];
  appEl.innerHTML = Layout(page());
  bind(r);
}

function Layout(inner) {
  return `
    <div class="app">
      <section class="screen">
        <div class="topbar">Inicio</div>
        ${inner}
      </section>
    </div>
  `;
}

function HomePage() {
  return `
    <div class="panel-frame">
      <div class="pattern" aria-hidden="true"></div>

      <div class="center">
        <h1 class="title">Piedra<br/>Papel<br/>Tijera</h1>
        <button class="btn" data-action="go-rules">Empezar</button>
      </div>

      <div class="home-bottom">
        ${HandImg("scissors", 92)}
        ${HandImg("rock", 98)}
        ${HandImg("paper", 96)}
      </div>
    </div>
  `;
}

function RulesPage() {
  return `
    <div class="panel-frame">
      <div class="pattern" aria-hidden="true"></div>

      <div class="rules-center">
        <p class="rules-text">
          Presioná jugar<br/>
          y elegí: piedra,<br/>
          papel o tijera<br/>
          antes de que<br/>
          pasen los 3<br/>
          segundos.
        </p>
        <button class="btn" data-action="start-play">¡Jugar!</button>
      </div>

      <div class="home-bottom small-hands-fade">
        ${HandImg("scissors", 86)}
        ${HandImg("rock", 92)}
        ${HandImg("paper", 90)}
      </div>
    </div>
  `;
}

let countdownTimer = null;

function resetRound() {
  state.round.phase = "countdown";
  state.round.secondsLeft = 3;
  state.round.progress = 1;
  state.round.locked = false;
  state.round.userPick = null;
  state.round.cpuPick = null;
  state.round.result = null;
}

function startCountdown() {
  clearInterval(countdownTimer);
  const startedAt = performance.now();
  const total = 3000;

  countdownTimer = setInterval(() => {
    const now = performance.now();
    const elapsed = now - startedAt;
    const leftMs = Math.max(0, total - elapsed);
    const t = leftMs / total;

    state.round.progress = t;
    state.round.secondsLeft = Math.max(1, Math.ceil(leftMs / 1000));

    if (leftMs <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      lockAndResolve();
      return;
    }

    render();
  }, 50);
}

function lockAndResolve() {
  state.round.locked = true;

  const userPick = state.round.userPick || randomPick();
  const cpuPick = randomPick();

  state.round.userPick = userPick;
  state.round.cpuPick = cpuPick;

  const res = decide(userPick, cpuPick);
  state.round.result = res;

  if (res === "win") state.score.user += 1;
  if (res === "lose") state.score.cpu += 1;

  saveScore();

  state.round.phase = "reveal";
  render();

  setTimeout(() => navigate("#/result"), 650);
}

function GamePage() {
  const disabled = state.round.locked ? "disabled" : "";
  const showDuel = state.round.phase === "reveal";

  return `
    <div class="panel-frame">
      <div class="pattern" aria-hidden="true"></div>

      <div class="game-center">
        <div class="countwrap">
          ${CountdownCircle(state.round.secondsLeft, state.round.progress)}
        </div>
      </div>

      <div class="choices-row" aria-label="Elegí una opción">
        <button class="choice-btn" data-pick="scissors" ${disabled} aria-label="Tijera">
          ${HandImg("scissors", 118)}
        </button>
        <button class="choice-btn" data-pick="rock" ${disabled} aria-label="Piedra">
          ${HandImg("rock", 128)}
        </button>
        <button class="choice-btn" data-pick="paper" ${disabled} aria-label="Papel">
          ${HandImg("paper", 124)}
        </button>
      </div>

      ${
        showDuel
          ? `
        <div class="duel" aria-hidden="true">
          <div class="top">
            ${HandImg(state.round.cpuPick, 228, { flipped: true })}
          </div>
          <div class="bottom">
            ${HandImg(state.round.userPick, 228)}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

function ResultPage() {
  const res = state.round.result || "lose";
  const win = res === "win";
  const label = win ? "Ganaste" : "Perdiste";
  const bgClass = win ? "win" : "lose";
  const starColor = win ? "#6BAE6B" : "#E15A4A";

  return `
    <div class="result-screen">
      <div class="result-bg ${bgClass}"></div>

      <div class="result-center">
        <div class="result-stack">
          ${StarBurst(label, starColor)}
          <div class="score-card">
            <h2 class="score-title">Score</h2>
            <div class="score-lines">
              <p>Vos: ${state.score.user}</p>
              <p>Máquina: ${state.score.cpu}</p>
            </div>
          </div>

          <button class="btn" data-action="play-again">Volver a Jugar</button>
        </div>
      </div>
    </div>
  `;
}

function bind(route) {
  const btnRules = appEl.querySelector('[data-action="go-rules"]');
  if (btnRules) btnRules.addEventListener("click", () => navigate("#/rules"));

  const btnStart = appEl.querySelector('[data-action="start-play"]');
  if (btnStart)
    btnStart.addEventListener("click", () => {
      resetRound();
      render();
      navigate("#/play");
      setTimeout(() => {
        resetRound();
        render();
        startCountdown();
      }, 0);
    });

  const btnAgain = appEl.querySelector('[data-action="play-again"]');
  if (btnAgain)
    btnAgain.addEventListener("click", () => {
      navigate("#/play");
      setTimeout(() => {
        resetRound();
        render();
        startCountdown();
      }, 0);
    });

  const pickBtns = appEl.querySelectorAll("[data-pick]");
  pickBtns.forEach((b) => {
    b.addEventListener("click", () => {
      if (state.round.locked) return;
      const pick = b.getAttribute("data-pick");
      state.round.userPick = pick;
      render();
    });
  });

  if (route === "#/play" && state.round.phase !== "countdown") {
    resetRound();
    render();
    startCountdown();
  }

  if (route !== "#/play") {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function randomPick() {
  const arr = ["rock", "paper", "scissors"];
  return arr[Math.floor(Math.random() * arr.length)];
}

function decide(user, cpu) {
  if (user === cpu) return "draw";
  if (user === "rock" && cpu === "scissors") return "win";
  if (user === "scissors" && cpu === "paper") return "win";
  if (user === "paper" && cpu === "rock") return "win";
  return "lose";
}

function CountdownCircle(n, progress) {
  const size = 210;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, progress)) * c;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Cuenta regresiva" role="img">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="rgba(255,255,255,0.58)"></circle>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="${stroke}"></circle>
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${r}"
        fill="none"
        stroke="#0B0B0B"
        stroke-width="${stroke}"
        stroke-linecap="round"
        stroke-dasharray="${dash} ${c}"
        transform="rotate(-90 ${size / 2} ${size / 2})"
      ></circle>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="84" fill="#0B0B0B">${n}</text>
    </svg>
  `;
}

function StarBurst(text, fill) {
  const stroke = "#0B0B0B";
  return `
    <svg class="star" viewBox="0 0 200 200" role="img" aria-label="${text}">
      <path
        d="M100 10
           L124 34
           L158 26
           L154 62
           L188 82
           L156 96
           L174 130
           L140 126
           L126 162
           L100 140
           L74 162
           L60 126
           L26 130
           L44 96
           L12 82
           L46 62
           L42 26
           L76 34
           Z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="6"
        stroke-linejoin="round"
      ></path>
      <text
        x="50%"
        y="54%"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#FFFFFF"
        font-size="44"
        style="letter-spacing: 1px;"
      >${text}</text>
    </svg>
  `;
}

function HandImg(kind, size, opts = {}) {
  const src = ASSETS[kind] || ASSETS.rock;
  const flipped = Boolean(opts.flipped);

  const style = [
    `width:${size}px`,
    `height:auto`,
    `display:block`,
    `user-select:none`,
    `pointer-events:none`,
    flipped ? `transform:scaleX(-1)` : ``,
  ]
    .filter(Boolean)
    .join(";");

  const altMap = {
    rock: "Piedra",
    paper: "Papel",
    scissors: "Tijera",
  };

  return `<img src="${src}" alt="${altMap[kind] || "Mano"}" style="${style}" draggable="false">`;
}

window.addEventListener("hashchange", () => {
  clearInterval(countdownTimer);
  countdownTimer = null;
  render();
});

if (!window.location.hash) window.location.hash = "#/";
render();
