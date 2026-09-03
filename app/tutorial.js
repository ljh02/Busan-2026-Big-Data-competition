/*
 * 입장 씬 + 튜토리얼 — 첫 로드에 캐릭터가 인사하고 다섯 장으로 BalueWave 를 소개한다.
 *
 * 구조는 페이체크(2026-DACON-Fin-AI-Challenge)의 입장 씬을 따랐다. 다른 점 하나 —
 * 언어 선택 단계가 없다. 캐릭터를 누르면 곧바로 말풍선과 튜토리얼 카드가 뜬다.
 *
 * 원칙
 *   - 숫자는 손으로 적지 않는다. 가구 유형별 가중치는 app.js 의 PERSONA_DEFAULT_WEIGHTS
 *     를 그대로 읽는다. 손으로 적은 숫자는 낡는다.
 *   - 한 장에 요점 셋~넷. 자세한 것은 화면이 스스로 말한다.
 *   - 캐릭터 동작은 결정적이다. Math.random 없이 클릭 횟수로 순환한다.
 *   - 한 세션에서 한 번만 띄운다(sessionStorage). 사이드바 로고를 누르면 다시 볼 수 있다.
 *
 * app.js 뒤에 classic script 로 로드된다. 최상위 const 는 스크립트 간에 공유되므로
 * PERSONA_DEFAULT_WEIGHTS / PERSONA_LABELS 를 직접 참조한다(typeof 로 방어).
 */
(function () {
  "use strict";

  const SEEN_KEY = "baluewave-entrance-seen";

  /* 매칭 4축 — 순서·이름은 사이드바 슬라이더와 같다 */
  const AXES = [
    { key: "commute", label: "통근" },
    { key: "cost", label: "주거비" },
    { key: "service", label: "생활 SOC" },
    { key: "safety", label: "안전" }
  ];
  const PERSONA_ORDER = ["single", "newlywed", "family", "senior"];
  /* 카드 제목은 소개 자료 표기를 따른다. 사이드바 라벨("1인 가구")과 다른 것은 single 하나 */
  const PERSONA_TITLES = { single: "1인 청년", newlywed: "신혼", family: "자녀 가구", senior: "노인" };
  const PERSONA_REASON = {
    single: "1인가구 소비지출 중 주거·수도·광열 비중이 최대, 소득은 전체 가구의 절반 수준. 학업·일자리 접근성과 대중교통 여건이 핵심",
    newlywed: "전월세·주택구입 초기 부담이 크고 맞벌이 통근 고려. 향후 자녀계획으로 생활 SOC 비중이 1인가구보다 상승",
    family: "어린이집·학교·병원·공원 등 생활환경이 주거 선택을 좌우하고, 보행·교통 안전 비중이 함께 높아짐",
    senior: "출퇴근 중요도는 낮아지고 병원·약국·복지관 등 의료·복지 접근성과 안전한 주거환경이 결정 요인"
  };

  const TUTORIAL = [
    {
      id: "what",
      eyebrow: "WHAT IS BALUEWAVE",
      title: "BalueWave는 무엇인가요?",
      bubble: "먼저 BalueWave가 무엇인지 알려드릴게요.",
      lead: "예산·직장·가구 유형만 입력하면, 공공데이터가 네 가지 기준으로 아파트를 골라 지도 위에 보여드려요.",
      points: [
        { head: "주거비", body: "실거래 데이터 기반으로 계산한 아파트 가격" },
        { head: "통근", body: "대중교통 경로로 계산한 출퇴근 시간" },
        { head: "생활 SOC", body: "병원·학교·공원 반경 1.6km 접근성" },
        { head: "안전·환경", body: "치안시설·CCTV·대기질·녹지 접근성" }
      ],
      visual: "criteria",
      note: "매물 광고가 아닌 공공데이터 근거로 추천하고, 모든 점수의 산출 근거를 화면에 공개해요."
    },
    {
      id: "how",
      eyebrow: "FOUR STEPS",
      title: "네 단계로 끝나는 아파트 결정",
      bubble: "사용법은 네 걸음이에요.",
      lead: "왼쪽 사이드바에서 시작해 오른쪽 지도와 상세 패널로 이어져요.",
      points: [
        { head: "조건 입력", body: "예산·직장·가구 유형을 고르고, 네 가지 가중치를 내 기준대로 조절해요." },
        { head: "매칭 확인", body: "조건에 맞는 단지를 점수 순 랭킹으로, 지도에서 위치와 함께 확인해요." },
        { head: "상세 검증", body: "가격·주변 인프라·교통편·전세 위험 신호를 대시보드로 점검해요." },
        { head: "비교·상담", body: "즐겨찾기한 아파트를 나란히 비교하고, AI Agent에게 판단 근거를 물어봐요." }
      ],
      visual: "steps"
    },
    {
      id: "weights",
      eyebrow: "WEIGHTS BY HOUSEHOLD",
      title: "가구 유형별 맞춤 가중치",
      bubble: "가구 유형을 고르면 가중치 초기값이 함께 바뀌어요.",
      lead: "공공 통계·정책 자료로 초기값을 정해 두었고, 사이드바 슬라이더로 직접 조정할 수 있어요.",
      points: [],
      visual: "weights"
    },
    {
      id: "verify",
      eyebrow: "CHECKING A COMPLEX",
      title: "단지 하나를 고르면 근거가 펼쳐져요",
      bubble: "추천 카드나 지도 마커를 누르면 상세 패널이 열려요.",
      lead: "매칭 결과 · 아파트 정보 · 출퇴근 경로 · 주변 인프라 · 전세 위험 점검, 다섯 탭으로 나눠 보여드려요.",
      points: [
        { head: "항목별 점수", body: "통근·주거비·생활 SOC·안전 점수와 AI 요약으로 왜 추천됐는지 확인해요." },
        { head: "가격과 위험", body: "매매가·전세가·월세와 전세가율, 깡통전세 위험 신호를 함께 봐요." },
        { head: "경로와 인프라", body: "목적지까지 경로와 시간, 반경 안의 병원·학교·공원을 지도에서 확인해요." }
      ],
      visual: "list"
    },
    {
      id: "around",
      eyebrow: "ALL IN ONE SCREEN",
      title: "조건 입력부터 AI 상담까지, 한 화면에서",
      bubble: "저는 화면 오른쪽 위에 있을게요. 궁금하면 눌러 주세요.",
      lead: "즐겨찾기로 후보를 모아 나란히 비교하고, AI Agent에게 판단 근거를 물어볼 수 있어요.",
      points: [
        { head: "즐겨찾기 비교", body: "☆로 모은 아파트를 매칭 점수·통근·가격·위험도 한 표로 나란히 비교해요." },
        { head: "AI Agent", body: "\"전세 들어가도 괜찮아?\" 같은 질문에 가격·통근·위험·입지 근거로 답해요." },
        { head: "다시 보기", body: "이 안내는 왼쪽 위 BalueWave 로고를 누르면 언제든 다시 열려요." }
      ],
      visual: "list"
    }
  ];

  /* 캐릭터 동작 순환 — 폴짝 → 슬라이드 → 스핀 → 흔들기 */
  const ACTIONS = ["jump", "slide", "spin", "shake"];
  const ACTION_MS = { jump: 620, slide: 560, spin: 650, shake: 520 };

  const state = { open: false, greeted: false, step: 0, clicks: 0, actionTimer: null };

  const $ = (id) => document.getElementById(id);
  let els = null;

  function readWeights() {
    /* app.js 의 상수. 없으면 표 자체를 생략한다 — 지어내지 않는다 */
    const w = typeof PERSONA_DEFAULT_WEIGHTS !== "undefined" ? PERSONA_DEFAULT_WEIGHTS : null;
    return w;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ── 렌더 ────────────────────────────────────────────────────────── */

  function renderVisual(s) {
    if (s.visual === "weights") {
      const w = readWeights();
      if (!w) return "";
      const cards = PERSONA_ORDER.filter((p) => w[p]).map((p) => {
        const row = w[p];
        const max = Math.max(...AXES.map((a) => row[a.key] || 0));
        const rows = AXES.map((a) => {
          const v = row[a.key] || 0;
          const hot = v === max ? " is-max" : "";
          return `<li class="tut-w-row${hot}"><span>${esc(a.label)}</span><strong>${v}%</strong></li>`;
        }).join("");
        return `
          <article class="tut-w-card">
            <h3>${esc(PERSONA_TITLES[p] || p)}</h3>
            <ul>${rows}</ul>
            <p class="tut-w-reason"><span>설정 근거</span>${esc(PERSONA_REASON[p] || "")}</p>
          </article>`;
      }).join("");
      return `<div class="tut-weights">${cards}</div>`;
    }
    return "";
  }

  function renderPoints(s) {
    if (!s.points.length) return "";
    const numbered = s.visual === "steps" || s.visual === "criteria";
    /* 1장(기준)은 한 줄에 들어가므로 "머리 — 설명" 인라인. 나머지는 머리를 따로 세우고
       설명을 문장별 줄로 둔다 — 줄이 어디서 꺾일지를 문장이 정하지, 상자 폭이 정하지 않는다. */
    const stacked = s.visual !== "criteria";
    const lines = (b) => (Array.isArray(b) ? b : [b]).map((t) => `<span class="tut-line">${esc(t)}</span>`).join("");
    const items = s.points.map((p, i) => `
      <li>
        ${numbered ? `<span class="tut-num">${i + 1}</span>` : `<span class="tut-dot" aria-hidden="true"></span>`}
        ${stacked
          ? `<span class="tut-text"><strong>${esc(p.head)}</strong><span class="tut-body">${lines(p.body)}</span></span>`
          : `<span class="tut-text"><strong>${esc(p.head)}</strong><span class="tut-body"> — ${esc(Array.isArray(p.body) ? p.body.join(" ") : p.body)}</span></span>`}
      </li>`).join("");
    return `<ul class="tut-points${stacked ? " is-stacked" : ""}">${items}</ul>`;
  }

  function renderCard() {
    const i = state.step;
    const s = TUTORIAL[i];
    const last = i >= TUTORIAL.length - 1;
    const dots = TUTORIAL.map((t, k) => `
      <button type="button" class="tut-dot-btn${k === i ? " is-current" : k < i ? " is-done" : ""}"
        data-step="${k}" aria-label="${k + 1}장 — ${esc(t.title)}"${k === i ? ' aria-current="step"' : ""}></button>`).join("");

    els.mount.innerHTML = `
      <div class="tut-card mascot-pop" role="region" aria-label="BalueWave 사용법">
        <div class="tut-head">
          <span class="tut-eyebrow">${esc(s.eyebrow)}</span>
          <div class="tut-progress" aria-label="${i + 1} / ${TUTORIAL.length}">${dots}<span class="tut-count">${i + 1}/${TUTORIAL.length}</span></div>
        </div>
        <h2 class="tut-title">${esc(s.title)}</h2>
        <p class="tut-lead">${esc(s.lead)}</p>
        <div class="tut-stage motion-fade" data-id="${s.id}">
          ${renderVisual(s)}
          ${renderPoints(s)}
          ${s.note ? `<p class="tut-note">${esc(s.note)}</p>` : ""}
        </div>
        <div class="tut-foot">
          <button type="button" class="tut-btn-ghost" data-nav="prev"${i === 0 ? " disabled" : ""}>← 이전</button>
          <button type="button" class="tut-btn-link" data-nav="skip">건너뛰기</button>
          <div class="tut-foot-right">
            ${last
              ? `<button type="button" class="tut-btn-primary" data-nav="finish">BalueWave 시작하기 →</button>`
              : `<button type="button" class="tut-btn-primary" data-nav="next">다음 →</button>`}
          </div>
        </div>
      </div>`;

    els.bubbleBody.textContent = s.bubble;
  }

  function setStep(i) {
    state.step = Math.min(Math.max(i, 0), TUTORIAL.length - 1);
    renderCard();
    /* 카드 첫 요소로 초점 — 키보드 사용자가 새 장의 시작을 놓치지 않게 */
    const h = els.mount.querySelector(".tut-title");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  /* ── 캐릭터 ─────────────────────────────────────────────────────── */

  function playAction(name) {
    const body = els.body;
    ACTIONS.forEach((a) => body.classList.remove(`mascot-${a}`));
    body.classList.remove("mascot-idle");
    void body.offsetWidth; /* 같은 동작을 연달아 재생할 수 있게 리플로우 */
    body.classList.add(`mascot-${name}`);
    if (state.actionTimer) window.clearTimeout(state.actionTimer);
    state.actionTimer = window.setTimeout(() => {
      body.classList.remove(`mascot-${name}`);
      body.classList.add("mascot-idle");
    }, ACTION_MS[name] || 600);
  }

  function onMascotClick() {
    const action = ACTIONS[state.clicks % ACTIONS.length];
    state.clicks += 1;
    playAction(action);
    if (!state.greeted) greet();
  }

  function greet() {
    state.greeted = true;
    els.hint.hidden = true;
    els.bubble.hidden = false;
    els.grid.classList.add("is-stage2");
    els.mount.hidden = false;
    setStep(0);
  }

  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const r = els.btn.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    els.tilt.style.setProperty("--tx", `${(-ny * 16).toFixed(1)}deg`);
    els.tilt.style.setProperty("--ty", `${(nx * 16).toFixed(1)}deg`);
  }
  function resetTilt() {
    els.tilt.style.setProperty("--tx", "0deg");
    els.tilt.style.setProperty("--ty", "0deg");
  }

  /* ── 열기 / 닫기 ────────────────────────────────────────────────── */

  function open() {
    state.open = true;
    state.greeted = false;
    state.step = 0;
    els.root.hidden = false;
    els.grid.classList.remove("is-stage2");
    els.mount.hidden = true;
    els.mount.innerHTML = "";
    els.bubble.hidden = true;
    els.hint.hidden = false;
    els.body.classList.add("mascot-idle");
    document.body.classList.add("entrance-open");
    window.setTimeout(() => els.btn.focus({ preventScroll: true }), 50);
  }

  function close() {
    state.open = false;
    els.root.hidden = true;
    document.body.classList.remove("entrance-open");
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (_) { /* 저장 불가 환경 */ }
    /* 오버레이가 걷힌 뒤에 — 동시에 뜨면 무엇을 가리키는지 안 읽힌다 */
    window.setTimeout(showAgentHint, 380);
  }

  /* ── AI Agent 안내 — 입장 씬이 닫힐 때마다 우측 상단 런처를 짚는다 ──
     말풍선(X 로 닫음) + 런처 둘레 마젠타 맥동 3회. 런처를 직접 누르면 찾은 것이므로 함께 닫는다.

     세션 플래그로 막지 않는다. 입장 씬 자체가 세션에 한 번만 자동으로 열리므로
     "최초 접속에만"은 그걸로 충족되고, 로고로 튜토리얼을 다시 본 사람은 다시 방향을
     잡는 중이라 안내를 또 받는 게 맞다. 플래그(HINT_KEY)는 닫은 뒤 마젠타 선을
     새로고침 뒤에도 유지하는 데만 쓴다. */
  const HINT_KEY = "baluewave-agent-hint-seen";

  function showAgentHint() {
    const launcher = $("agentLauncher");
    if (!launcher || launcher.hidden || $("agentHint")) return;

    const hint = document.createElement("div");
    hint.id = "agentHint";
    hint.className = "agent-hint mascot-pop";
    hint.setAttribute("role", "status");
    hint.innerHTML = `
      <p>궁금한 점은 저에게 물어보세요!</p>
      <button type="button" class="agent-hint-close" aria-label="안내 닫기">
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>`;
    document.body.appendChild(hint);
    launcher.classList.add("is-hinting");

    /* 런처 사각형을 재서 그 아래에 붙인다 — 런처 크기는 글꼴·문구에 따라 변한다.
       꼬리는 런처 가로 중앙을 가리킨다. */
    const place = () => {
      const r = launcher.getBoundingClientRect();
      hint.style.top = `${Math.round(r.bottom + 12)}px`;
      hint.style.right = `${Math.round(window.innerWidth - r.right)}px`;
      hint.style.setProperty("--tail-right", `${Math.round(r.width / 2 - 5)}px`);
    };
    place();
    window.addEventListener("resize", place);

    const dismiss = () => {
      hint.remove();
      launcher.classList.remove("is-hinting");
      launcher.classList.add("is-hinted");
      launcher.removeEventListener("click", dismiss);
      window.removeEventListener("resize", place);
      try { sessionStorage.setItem(HINT_KEY, "1"); } catch (_) { /* 저장 불가 환경 */ }
    };
    hint.querySelector(".agent-hint-close").addEventListener("click", dismiss);
    launcher.addEventListener("click", dismiss);
  }

  function seen() {
    try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch (_) { return false; }
  }

  /* ── 결선 ───────────────────────────────────────────────────────── */

  function bind() {
    els = {
      root: $("entrance"),
      grid: $("entranceGrid"),
      btn: $("mascotButton"),
      tilt: $("mascotTilt"),
      body: $("mascotBody"),
      hint: $("entranceHint"),
      bubble: $("mascotBubble"),
      bubbleBody: $("bubbleBody"),
      mount: $("tutorialMount"),
      skip: $("entranceSkip")
    };
    if (!els.root || !els.btn) return false;

    els.btn.addEventListener("click", onMascotClick);
    els.btn.addEventListener("pointermove", onPointerMove);
    els.btn.addEventListener("pointerleave", resetTilt);
    els.skip.addEventListener("click", close);

    els.mount.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) {
        const k = nav.getAttribute("data-nav");
        if (k === "prev") setStep(state.step - 1);
        else if (k === "next") setStep(state.step + 1);
        else close(); /* skip · finish */
        return;
      }
      const dot = e.target.closest("[data-step]");
      if (dot) setStep(Number(dot.getAttribute("data-step")));
    });

    document.addEventListener("keydown", (e) => {
      if (!state.open) return;
      if (e.key === "Escape") { close(); return; }
      if (!state.greeted) return;
      if (e.key === "ArrowRight") setStep(state.step + 1);
      else if (e.key === "ArrowLeft") setStep(state.step - 1);
    });

    /* 사이드바 로고 → 다시 보기 */
    const brand = document.querySelector(".sidebar-brand");
    if (brand) {
      brand.addEventListener("click", (e) => {
        if (e.target.closest("button")) return; /* 즐겨찾기·새로고침 버튼은 제외 */
        open();
      });
      brand.classList.add("is-reopenable");
      brand.setAttribute("title", "BalueWave 소개 다시 보기");
    }
    return true;
  }

  function boot() {
    if (!bind()) return;
    if (!seen()) open();
    try {
      if (sessionStorage.getItem(HINT_KEY) === "1") {
        const l = $("agentLauncher"); if (l) l.classList.add("is-hinted");
      }
    } catch (_) { /* 저장 불가 환경 */ }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* 디버그·테스트용 — 콘솔에서 BalueWaveTutorial.open() */
  window.BalueWaveTutorial = { open, close, TUTORIAL };
})();
