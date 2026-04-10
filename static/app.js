const state = {
  stages: [],
  level: 0,
  started: false,
  complete: false,
  pending: false,
  bug: "",
  currentQuestion: "",
  history: [],
  model: "unknown",
  version: "Rubber Duck Diffision Platform v4.1.8",
  geminiConfigured: false,
  responseMode: "fast",
};

const chat = document.querySelector("#chat");
const ladder = document.querySelector("#ladder");
const meterFill = document.querySelector("#meter-fill");
const currentStageName = document.querySelector("#current-stage-name");
const duckAvatar = document.querySelector("#duck-avatar");
const auroraVideo = document.querySelector("#aurora-video");
const duckMood = document.querySelector("#duck-mood");
const modelStatus = document.querySelector("#model-status");
const sourceStatus = document.querySelector("#source-status");
const sessionState = document.querySelector("#session-state");
const composer = document.querySelector("#composer");
const composerLabel = document.querySelector("#composer-label");
const messageInput = document.querySelector("#message");
const suggestionsLabel = document.querySelector("#suggestions-label");
const suggestionsList = document.querySelector("#suggestions-list");
const submitButton = document.querySelector("#submit-btn");
const resetButton = document.querySelector("#reset-btn");
const template = document.querySelector("#message-template");
const summaryTemplate = document.querySelector("#summary-template");

const auroraState = {
  alphaFrom: 0,
  alphaTo: 0,
  alphaStartMs: 0,
  alphaDurationMs: 2000,
  playlistIndex: 0,
};

const AURORA_ALPHA_BY_LEVEL = {
  1: 0.0,
  2: 0.04,
  3: 0.16,
  4: 0.36,
  5: 0.64,
  6: 1.0,
};

const AURORA_PLAYLIST = [
  "/static/media/aurora-forward.webm",
  "/static/media/aurora-reverse.webm",
];

const OPENING_SUGGESTIONS = [
  "Users are redirected back to /login after successful authentication.",
  "Form submission returns 200, but the new record is not persisted.",
  "The dashboard renders blank after a refresh until local storage is cleared.",
  "File uploads larger than 5 MB hang indefinitely without an error.",
  "The webhook handler processes the same event multiple times after a retry.",
];

const RESPONSE_SUGGESTIONS = {
  1: [
    "Working means the app does what I meant, not what it feels like doing.",
    "I expect success, but I keep receiving character development.",
    "Reality keeps returning a different answer than my intention.",
  ],
  2: [
    "The problem feels consistent, which is honestly more unsettling.",
    "I may have mistaken repeated failure for a kind of message.",
    "I am no longer sure whether the app is broken or simply honest.",
  ],
  3: [
    "My relationship with this problem is committed but not healthy.",
    "I do not feel safe here, but I do feel familiar.",
    "Every new fix feels like another attempt to win back its affection.",
  ],
  4: [
    "The error now feels less local and more meteorological.",
    "I suspect the universe has standardized this disappointment.",
    "My expectations keep collapsing at planetary scale.",
  ],
  5: [
    "At this point I am mostly debugging my expectations.",
    "The incident has grown larger than authentication itself.",
    "I would accept closure even if resolution remains theoretical.",
  ],
};

function getAuroraAlpha() {
  if (!state.started) {
    return 0;
  }
  return AURORA_ALPHA_BY_LEVEL[state.level] ?? 0;
}

function cubicSplineEase(t) {
  return t * t * (3 - 2 * t);
}

function getInterpolatedAuroraAlpha(nowMs) {
  const elapsed = Math.max(0, nowMs - auroraState.alphaStartMs);
  const t = Math.min(1, elapsed / auroraState.alphaDurationMs);
  const eased = cubicSplineEase(t);
  return auroraState.alphaFrom + (auroraState.alphaTo - auroraState.alphaFrom) * eased;
}

function updateAuroraAlphaTarget(nowMs = performance.now()) {
  const nextTarget = getAuroraAlpha();
  const current = getInterpolatedAuroraAlpha(nowMs);
  if (Math.abs(nextTarget - auroraState.alphaTo) < 0.0001 && Math.abs(current - auroraState.alphaTo) < 0.0001) {
    return;
  }

  auroraState.alphaFrom = current;
  auroraState.alphaTo = nextTarget;
  auroraState.alphaStartMs = nowMs;
}

function applyAuroraOpacity(nowMs = performance.now()) {
  auroraVideo.style.opacity = String(getInterpolatedAuroraAlpha(nowMs));
}

function animateAuroraOpacity(nowMs) {
  applyAuroraOpacity(nowMs);
  window.requestAnimationFrame(animateAuroraOpacity);
}

function playAuroraVideo() {
  const playPromise = auroraVideo.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function setAuroraSource(index, shouldPlay = true) {
  auroraState.playlistIndex = index % AURORA_PLAYLIST.length;
  auroraVideo.src = AURORA_PLAYLIST[auroraState.playlistIndex];
  auroraVideo.load();
  if (shouldPlay) {
    auroraVideo.addEventListener(
      "canplay",
      () => {
        playAuroraVideo();
      },
      { once: true }
    );
  }
}

function initializeAurora() {
  setAuroraSource(0, true);
  auroraVideo.addEventListener("ended", () => {
    setAuroraSource((auroraState.playlistIndex + 1) % AURORA_PLAYLIST.length, true);
  });
  applyAuroraOpacity(performance.now());
  window.requestAnimationFrame(animateAuroraOpacity);
}

function getStage(level) {
  return state.stages.find((stage) => stage.level === level) || null;
}

function renderLadder() {
  ladder.innerHTML = "";
  const displayLevel = state.level || 1;
  const stage = getStage(displayLevel) || state.stages[0];

  if (stage) {
    const item = document.createElement("li");
    item.className = "ladder-item active current-only";
    if (!state.started) {
      item.classList.add("queued");
    }

    item.innerHTML = `
      <div class="ladder-topline">
        <div>
          <strong>${stage.name}</strong>
          <p class="ladder-subtitle">${stage.subtitle}</p>
        </div>
      </div>
      <p class="ladder-sample">${stage.sample}</p>
    `;
    ladder.appendChild(item);
  }

  const totalLevels = state.stages.length || 7;
  const progress = ((state.level || 1) / totalLevels) * 100;
  meterFill.style.width = `${progress}%`;
  syncLadderViewport();
}

function syncLadderViewport() {
  return;
}

function updateStageChrome() {
  const displayLevel = state.level || 1;
  const activeStage = getStage(displayLevel);
  document.body.dataset.level = String(displayLevel);
  duckAvatar.dataset.level = String(displayLevel);
  updateAuroraAlphaTarget();

  if (!state.started) {
    currentStageName.textContent = activeStage ? activeStage.name : "Existential";
    duckMood.textContent = activeStage
      ? activeStage.mood
      : "The duck is resting in a pre-escalation state and awaiting a manageable technical crisis.";
    sessionState.textContent = "Awaiting incident intake";
    return;
  }

  if (activeStage) {
    currentStageName.textContent = activeStage.name;
    duckMood.textContent = activeStage.mood;
  }

  sessionState.textContent = state.complete
    ? "Session closed with managed acceptance"
    : `Escalation level ${state.level} active`;
}

function setModelStatus() {
  if (state.responseMode === "gemini" && state.geminiConfigured) {
    modelStatus.textContent = `Google AI live via ${state.model}`;
    modelStatus.classList.remove("warning");
    return;
  }

  if (state.geminiConfigured && state.responseMode === "fast") {
    modelStatus.textContent = `Fast template mode active; Gemini available via ${state.model}`;
    modelStatus.classList.remove("warning");
    return;
  }

  modelStatus.textContent = "Fast template mode active";
  modelStatus.classList.toggle("warning", false);
}

function updateComposer() {
  if (!state.started) {
    composerLabel.textContent = "Describe the bug you have definitely not overthought yet";
    messageInput.placeholder =
      "Example: Users are redirected back to /login after successful authentication.";
    messageInput.disabled = false;
    submitButton.disabled = state.pending;
    submitButton.textContent = state.pending ? "Beginning..." : "Begin Session";
    renderSuggestions(OPENING_SUGGESTIONS, "Suggested starting problems");
    return;
  }

  if (state.complete) {
    composerLabel.textContent = "This session has ended. The issue remains, but the transformation is complete.";
    messageInput.placeholder = "Reset the session to begin another emotionally expensive incident.";
    messageInput.disabled = true;
    submitButton.disabled = true;
    submitButton.textContent = "Session Complete";
    renderSuggestions([], "No further suggestions");
    return;
  }

  const activeStage = getStage(state.level);
  composerLabel.textContent = `Respond to Level ${state.level} - ${activeStage.name}`;
  messageInput.placeholder = "Answer sincerely. The platform will misuse that sincerity.";
  messageInput.disabled = false;
  submitButton.disabled = state.pending;
  submitButton.textContent = state.pending ? "Escalating..." : "Send Response";
  renderSuggestions(RESPONSE_SUGGESTIONS[state.level] || [], "Suggested responses");
}

function renderSuggestions(items, label) {
  suggestionsLabel.textContent = label;
  suggestionsList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("span");
    empty.className = "suggestion-empty";
    empty.textContent = "No suggestions available.";
    suggestionsList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-chip";
    button.textContent = item;
    button.addEventListener("click", () => {
      if (messageInput.disabled) {
        return;
      }
      messageInput.value = item;
      messageInput.focus();
    });
    suggestionsList.appendChild(button);
  });
}

function appendMessage({ role, body, meta, tone }) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".message");
  const metaNode = fragment.querySelector(".message-meta");
  const bodyNode = fragment.querySelector(".message-body");

  article.classList.add(role);
  if (tone) {
    article.classList.add(tone);
  }

  metaNode.textContent = meta;
  bodyNode.textContent = body;
  chat.appendChild(fragment);
  chat.scrollTop = chat.scrollHeight;
}

function addOnboarding() {
  appendMessage({
    role: "assistant",
    tone: "system",
    meta: "Platform onboarding",
    body:
      "Welcome to Rubber Duck Diffision Platform v4.1.8. Describe one bug, answer one question at a time, and allow the platform to transform a technical issue into a broader inquiry about intention, attachment, and managed acceptance.",
  });
}

function setSourceStatus(source, note) {
  if (source === "gemini") {
    sourceStatus.textContent = "Dynamic questioning via Google AI";
  } else if (source === "template") {
    sourceStatus.textContent = "Fast local questioning engine";
  } else {
    sourceStatus.textContent = "Fallback recovery logic in effect";
  }
  sourceStatus.title = note || "";
}

function beginPendingMessage(text) {
  appendMessage({
    role: "assistant",
    tone: "pending",
    meta: "Escalation in progress",
    body: text,
  });
  return chat.querySelector(".message.pending:last-child");
}

function resolvePending(pendingNode, meta, body, note) {
  pendingNode.querySelector(".message-meta").textContent = meta;
  pendingNode.querySelector(".message-body").textContent = body;
  pendingNode.classList.remove("pending");
  pendingNode.title = note || "";
}

function applySummary(summaryData) {
  const fragment = summaryTemplate.content.cloneNode(true);
  const summaryNode = fragment.querySelector(".summary");
  summaryNode.querySelectorAll("[data-summary]").forEach((node) => {
    const key = node.getAttribute("data-summary");
    if (key && summaryData[key] !== undefined) {
      node.textContent = summaryData[key];
    }
  });
  chat.appendChild(fragment);
  chat.scrollTop = chat.scrollHeight;
}

async function startSession(bug) {
  const pending = beginPendingMessage(
    "Classifying incident severity and locating an appropriately qualified duck."
  );

  const response = await fetch("/api/escalate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start",
      bug,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to start session");
  }

  state.started = true;
  state.level = data.level;
  state.currentQuestion = data.message;
  setSourceStatus(data.source, data.note);
  resolvePending(
    pending,
    `Level ${data.level} - ${data.stage.name} via ${data.source === "gemini" ? "Google AI" : "fallback"}`,
    data.message,
    data.note
  );
}

async function continueSession(answer) {
  const currentStage = getStage(state.level);
  const pending = beginPendingMessage(
    `Reviewing your response for Level ${state.level} and preparing a less helpful follow-up.`
  );

  const response = await fetch("/api/escalate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "continue",
      bug: state.bug,
      answer,
      level: state.level,
      history: state.history,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to continue session");
  }

  state.history.push({
    level: state.level,
    question: state.currentQuestion,
    answer,
  });

  state.level = data.level;
  state.currentQuestion = data.kind === "question" ? data.message : "";
  state.complete = data.kind === "complete";
  setSourceStatus(data.source, data.note);

  resolvePending(
    pending,
    `${data.stage.name} via ${data.source === "gemini" ? "Google AI" : "fallback"}`,
    data.message,
    data.note
  );

  if (state.complete && data.summary) {
    applySummary(data.summary);
  }
}

function resetSession() {
  state.level = 0;
  state.started = false;
  state.complete = false;
  state.pending = false;
  state.bug = "";
  state.currentQuestion = "";
  state.history = [];
  auroraState.alphaFrom = getInterpolatedAuroraAlpha(performance.now());
  auroraState.alphaTo = 0;
  auroraState.alphaStartMs = performance.now();

  chat.innerHTML = "";
  addOnboarding();
  renderLadder();
  updateStageChrome();
  updateComposer();
  sourceStatus.textContent = "Duck network on standby";
  sourceStatus.title = "";
  messageInput.value = "";
}

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.pending || state.complete) {
    return;
  }

  const message = messageInput.value.trim();
  if (!message) {
    return;
  }

  state.pending = true;
  updateComposer();

  try {
    if (!state.started) {
      state.bug = message;
      appendMessage({
        role: "user",
        meta: "Initial incident report",
        body: message,
      });
      await startSession(message);
    } else {
      const currentStage = getStage(state.level);
      appendMessage({
        role: "user",
        meta: `Your response to Level ${currentStage.level} - ${currentStage.name}`,
        body: message,
      });
      await continueSession(message);
    }

    messageInput.value = "";
  } catch (error) {
    appendMessage({
      role: "assistant",
      tone: "system",
      meta: "Platform fault",
      body: `RDEP encountered a procedural issue: ${error.message}`,
    });
  } finally {
    state.pending = false;
    renderLadder();
    updateStageChrome();
    updateComposer();
  }
});

resetButton.addEventListener("click", () => {
  resetSession();
});

async function boot() {
  const response = await fetch("/api/health");
  const data = await response.json();
  state.stages = data.stages || [];
  state.model = data.model || "unknown";
  state.version = data.version || "Rubber Duck Diffision Platform v4.1.8";
  state.geminiConfigured = Boolean(data.geminiConfigured);
  state.responseMode = data.responseMode || "fast";

  renderLadder();
  updateStageChrome();
  setModelStatus();
  updateComposer();
  addOnboarding();
  initializeAurora();
}

boot().catch((error) => {
  modelStatus.textContent = `Startup failed: ${error.message}`;
  modelStatus.classList.add("warning");
});
