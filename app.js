const appEl = document.getElementById("app");

const COLORS = {
  outer: "#E5E5E5",
  panel: "#F2F7FC",
  blue: "#006CFC",
  blueDark: "#001997",
  green: "#009048",
  greenShadow: "#77C2A2",
  ink: "#0B0B0B",
  skin: "#FFCAB9",
  skin2: "#FABBA7",
  win: "#8B8C54",
  lose: "#8A5A5A",
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
`.trim(),
  );
  document.documentElement.style.setProperty(
    "--pattern",
    `url("data:image/svg+xml,${svg}")`,
  );
}

setCSSPattern();

const routes = {
  "#/": HomePage,
  "#/rules": RulesPage,
  "#/play": GamePage,
  "#/result": ResultPage,
  "#/components": ComponentsPage,
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
        ${HandSVG("scissors", 86)}
        ${HandSVG("rock", 96)}
        ${HandSVG("paper", 92)}
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
        ${HandSVG("scissors", 80)}
        ${HandSVG("rock", 90)}
        ${HandSVG("paper", 86)}
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
  state.round.result = decide(userPick, cpuPick);

  if (state.round.result === "win") state.score.user += 1;
  if (state.round.result === "lose") state.score.cpu += 1;

  saveScore();

  state.round.phase = "reveal";
  render();

  setTimeout(() => {
    navigate("#/result");
  }, 650);
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
        <button class="choice-btn" data-pick="scissors" ${disabled}>
          ${HandSVG("scissors", 110)}
        </button>
        <button class="choice-btn" data-pick="rock" ${disabled}>
          ${HandSVG("rock", 122)}
        </button>
        <button class="choice-btn" data-pick="paper" ${disabled}>
          ${HandSVG("paper", 118)}
        </button>
      </div>

      ${
        showDuel
          ? `
        <div class="duel" aria-hidden="true">
          <div class="top">
            ${HandSVG(state.round.cpuPick, 210, { flipped: true })}
          </div>
          <div class="bottom">
            ${HandSVG(state.round.userPick, 210)}
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

function ComponentsPage() {
  return `
    <div class="panel-frame">
      <div class="components-sheet">
        <div class="components-row">
          ${MiniIcon("note")}
          ${MiniIcon("rock")}
          ${MiniIcon("scissors")}
        </div>

        <div class="components-row">
          ${HandSVG("scissors", 84)}
          ${HandSVG("rock", 92)}
          ${HandSVG("paper", 88)}
        </div>

        <div class="components-row">
          <button class="btn" data-action="go-rules">Empezar</button>
          <div style="width: 24px"></div>
          <div class="star">
            ${StarBurst("Ganaste", "#6BAE6B")}
          </div>
        </div>

        <div class="components-row">
          <div class="countwrap">${CountdownCircle(3, 0.75)}</div>
        </div>

        <div class="note">
          Tipografía: Odibee Sans
          <div class="linkish">https://fonts.google.com/specimen/Odibee+Sans</div>
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

  if (
    route === "#/play" &&
    state.round.phase === "countdown" &&
    !countdownTimer
  ) {
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
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="Cuenta regresiva">
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
      <text x="50%" y="54%" text-anchor известно="0" text-anchor="middle" dominant-baseline="middle" font-size="84" fill="#0B0B0B">${n}</text>
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
        stroke-width="5"
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

function HandSVG(kind, size, opts = {}) {
  const flipped = Boolean(opts.flipped);
  const w = size;
  const h = Math.round(size * 1.15);
  const scaleX = flipped ? -1 : 1;
  const tx = flipped ? w : 0;

  if (kind === "paper") {
    return `
      <svg width="${w}" height="${h}" viewBox="0 0 120 140" style="transform: scaleX(${scaleX}); translate: ${tx}px 0;">
        <g fill="${COLORS.skin}" stroke="#0B0B0B" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
          <path d="M40 20c0-10 10-16 20-16s20 6 20 16v64c0 8-6 14-14 14H54c-8 0-14-6-14-14V20z" />
          <path d="M34 64h52" />
          <path d="M34 82h52" />
          <path d="M34 100h52" />
          <path d="M44 118c0 10 7 18 16 18h0c9 0 16-8 16-18" />
        </g>
      </svg>
    `;
  }

  if (kind === "rock") {
    return `
      <svg width="${w}" height="${h}" viewBox="0 0 120 140" style="transform: scaleX(${scaleX}); translate: ${tx}px 0;">
        <g fill="${COLORS.skin}" stroke="#0B0B0B" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
          <path d="M34 62c0-14 12-26 26-26h0c14 0 26 12 26 26v28c0 10-8 18-18 18H52c-10 0-18-8-18-18V62z" />
          <path d="M46 42v-10" />
          <path d="M60 38v-10" />
          <path d="M74 42v-10" />
          <path d="M44 108v28" />
          <path d="M76 108v28" />
        </g>
      </svg>
    `;
  }

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 120 140" style="transform: scaleX(${scaleX}); translate: ${tx}px 0;">
      <g fill="${COLORS.skin}" stroke="#0B0B0B" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
        <path d="M34 70c0-14 12-26 26-26h0c14 0 26 12 26 26v20c0 10-8 18-18 18H52c-10 0-18-8-18-18V70z" />
        <path d="M44 68V30c0-10 8-18 18-18" />
        <path d="M64 12c10 0 18 8 18 18v32" />
        <path d="M54 32v34" />
        <path d="M72 32v34" />
        <path d="M44 112v26" />
        <path d="M76 112v26" />
      </g>
    </svg>
  `;
}

function MiniIcon(type) {
  const base = `stroke="#0B0B0B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;
  if (type === "note") {
    return `
      <svg width="74" height="74" viewBox="0 0 120 120">
        <path d="M18 22h68l16 16v60H18z" fill="#FFE08A" ${base}></path>
        <path d="M86 22v20h20" fill="none" ${base}></path>
      </svg>
    `;
  }
  if (type === "rock") {
    return `
      <svg width="74" height="74" viewBox="0 0 120 120">
        <path d="M24 74l20-40h40l12 30-18 30H40z" fill="#9EA4AF" ${base}></path>
      </svg>
    `;
  }
  return `
    <svg width="74" height="74" viewBox="0 0 120 120">
      <path d="M34 30l18 18" fill="none" ${base}></path>
      <path d="M52 48l-22 38c-2 4 2 8 6 6l38-22" fill="none" ${base}></path>
      <path d="M58 30l18 18" fill="none" ${base}></path>
      <path d="M76 48l22 38c2 4-2 8-6 6L54 70" fill="none" ${base}></path>
      <circle cx="44" cy="72" r="4" fill="#0B0B0B"></circle>
      <circle cx="76" cy="72" r="4" fill="#0B0B0B"></circle>
    </svg>
  `;
}

window.addEventListener("hashchange", () => {
  clearInterval(countdownTimer);
  countdownTimer = null;
  render();
});

if (!window.location.hash) window.location.hash = "#/";
render();
