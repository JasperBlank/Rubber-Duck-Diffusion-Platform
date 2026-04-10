const state = {
  stages: [],
  level: 0,
  started: false,
  complete: false,
  pending: false,
  backendAvailable: true,
  bug: "",
  currentQuestion: "",
  history: [],
  model: "unknown",
  version: "Rubber Duck Diffusion Platform v4.1.8",
  geminiConfigured: false,
  responseMode: "fast",
};

const STATIC_STAGES = [
  {
    level: 1,
    name: "Existential",
    subtitle: "Operational Doubt",
    sample: "When you say it 'doesn't work', what does working even mean to you?",
    mood: "The duck treats implementation details as soft claims about reality.",
    mode: "question",
  },
  {
    level: 2,
    name: "Philosophical",
    subtitle: "Meaning Negotiation",
    sample: "If the system behaves consistently against your intentions, which one of you is actually being unreasonable?",
    mood: "The duck now suspects the bug may be a disagreement about meaning itself.",
    mode: "question",
  },
  {
    level: 3,
    name: "Therapeutic",
    subtitle: "Problem Relationship Review",
    sample: "Tell me about your relationship with your problem. Do you feel safe here?",
    mood: "The duck speaks softly and assumes the issue has crossed into attachment territory.",
    mode: "question",
  },
  {
    level: 4,
    name: "Cosmic",
    subtitle: "Universal Systems",
    sample:
      "Your NullPointerException is a reflection of a universe that assigns meaning arbitrarily. Have you considered that the pointer was never yours to begin with?",
    mood: "The duck has left engineering behind and now negotiates with the universe itself.",
    mode: "question",
  },
  {
    level: 5,
    name: "Transcendent",
    subtitle: "Post-Cosmic Compliance",
    sample: "At what point does a persistent issue stop being a defect and start becoming part of the climate?",
    mood: "The duck no longer distinguishes between software behavior and atmospheric conditions.",
    mode: "question",
  },
  {
    level: 6,
    name: "Session Closure",
    subtitle: "Managed Acceptance",
    sample: "You seem ready to move on. The bug has not changed. But you have. That's enough.",
    mood: "The duck closes the ticket and opens a space for personal growth metrics.",
    mode: "closure",
  },
];

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
const scriptBaseUrl = new URL("./", document.currentScript ? document.currentScript.src : window.location.href);

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
  new URL("./media/aurora-forward.webm", scriptBaseUrl).toString(),
  new URL("./media/aurora-reverse.webm", scriptBaseUrl).toString(),
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

function compactText(text, limit = 180) {
  const collapsed = String(text || "").trim().split(/\s+/).join(" ");
  if (collapsed.length <= limit) {
    return collapsed;
  }
  return `${collapsed.slice(0, limit - 3).trimEnd()}...`;
}

function summarizeHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No previous reflection rounds.";
  }

  return history
    .map((item) => {
      return `Level ${item.level} question: ${item.question} | User answer: ${item.answer || "[no answer]"}`;
    })
    .join("\n");
}

function chooseDeterministicOption(seedInput, options) {
  const seed = Array.from(seedInput).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return options[Math.abs(seed) % options.length];
}

function buildFallbackQuestion(bug, stage, latestAnswer, history) {
  const issue = compactText(bug, 95);
  const answer = latestAnswer ? compactText(latestAnswer, 80) : "";
  const seedInput = `${bug}|${latestAnswer}|${stage.level}|${history.length}`;
  let options = [];

  if (stage.level === 1) {
    options = [
      `When you say "${issue}" fails, what would "working" actually look like in a less disappointing universe?`,
      `Is "${issue}" broken, or is it merely refusing the story you hoped to tell about it?`,
      `What exact reality are you expecting from "${issue}", and what reality keeps happening instead?`,
    ];
  } else if (stage.level === 2) {
    options = [
      `If "${issue}" behaves consistently against your wishes, which one of you is actually failing to communicate?`,
      `You said "${answer || issue}"; is that a symptom, or just the name you have given to repeated disappointment?`,
      `At what point does "${issue}" stop being an error and start becoming an argument about meaning?`,
    ];
  } else if (stage.level === 3) {
    options = [
      `When "${answer || issue}" happens, what does it bring up in your relationship with this problem, and do you feel safe here?`,
      `How would you describe your emotional arrangement with "${issue}": conflict, dependence, or reluctant familiarity?`,
      `If this problem could describe the dynamic between you, would it say you are fixing it or simply staying together?`,
    ];
  } else if (stage.level === 4) {
    options = [
      `If "${issue}" persists across your intentions, have you considered that the universe may simply prefer this version of events?`,
      `What if "${answer || issue}" is not malfunction but a cosmological refusal to validate your assumptions?`,
      `If the system denies your expectation with perfect calm, why assume the error belongs to the machine?`,
    ];
  } else if (stage.level === 5) {
    options = [
      `At what point does "${issue}" stop being a defect and start becoming the climate in which your expectations now live?`,
      `If "${answer || issue}" outlives your attempts to define it, are you still debugging it, or merely witnessing its weather?`,
      `What remains of a bug once it has become larger than the system that first named it?`,
    ];
  }

  return chooseDeterministicOption(seedInput, options);
}

function buildClosure() {
  return "The original incident is now a smaller detail inside a much larger process. The bug has not changed. But you have. That is enough for RDEP to classify this session as resolved.";
}

function buildSummary(bug, history, latestAnswer) {
  const combinedAnswers = `${history.map((item) => item.answer || "").join(" ")} ${latestAnswer || ""}`.trim();
  const totalWords = combinedAnswers ? combinedAnswers.split(/\s+/).length : 0;
  let clarity = "moderate";

  if (totalWords >= 45) {
    clarity = "concerningly high";
  } else if (totalWords >= 20) {
    clarity = "elevated";
  }

  const estimatedMinutes = Math.max(4, history.length * 2 + Math.max(1, Math.floor(totalWords / 20)));
  const driftOptions = [
    "duck-led introspection",
    "ceremonial overanalysis",
    "managed perspective realignment",
    "enterprise-grade emotional recursion",
  ];
  const driftSeed = Array.from(bug).reduce((sum, char) => sum + char.charCodeAt(0), 0) + totalWords;
  const drift = driftOptions[Math.abs(driftSeed) % driftOptions.length];

  return {
    bugsSolved: 0,
    existentialClarity: clarity,
    timeWastedProductively: `${estimatedMinutes} minutes`,
    rootCauseStatus: "emotionally reframed",
    issueDisplacementVector: drift,
    transcendenceLevel: "acceptable for enterprise use",
  };
}

function getSourceLabel(source) {
  if (source === "gemini") {
    return "Google AI";
  }
  if (source === "static") {
    return "browser-local";
  }
  if (source === "template") {
    return "local engine";
  }
  return "fallback";
}

function startStaticSession(bug) {
  const issue = compactText(bug, 320);
  const stage = getStage(1) || STATIC_STAGES[0];
  return {
    ok: true,
    kind: "question",
    level: stage.level,
    stage,
    message: buildFallbackQuestion(issue, stage, "", []),
    source: "static",
    model: "browser-local",
    note: "Static deployment mode is active. Questions are generated locally in the browser.",
  };
}

function continueStaticSession(bug, level, answer, history) {
  const issue = compactText(bug, 320);
  const latestAnswer = compactText(answer, 260);
  const turns = Array.isArray(history) ? history.slice(-6) : [];

  if (level >= STATIC_STAGES.length - 1) {
    const stage = getStage(STATIC_STAGES.length) || STATIC_STAGES[STATIC_STAGES.length - 1];
    return {
      ok: true,
      kind: "complete",
      level: stage.level,
      stage,
      message: buildClosure(),
      source: "static",
      model: "browser-local",
      note: "Static deployment mode is active. Closure is generated locally in the browser.",
      summary: buildSummary(issue, turns, latestAnswer),
    };
  }

  const nextStage = getStage(level + 1) || STATIC_STAGES[level];
  return {
    ok: true,
    kind: "question",
    level: nextStage.level,
    stage: nextStage,
    message: buildFallbackQuestion(issue, nextStage, latestAnswer, turns),
    source: "static",
    model: "browser-local",
    note: "Static deployment mode is active. Questions are generated locally in the browser.",
  };
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
  if (!state.backendAvailable) {
    modelStatus.textContent = "Static mode active; no live AI backend";
    modelStatus.classList.remove("warning");
    return;
  }

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
      "Welcome to Rubber Duck Diffusion Platform v4.1.8. Describe one bug, answer one question at a time, and allow the platform to transform a technical issue into a broader inquiry about intention, attachment, and managed acceptance.",
  });
}

function setSourceStatus(source, note) {
  if (source === "gemini") {
    sourceStatus.textContent = "Dynamic questioning via Google AI";
  } else if (source === "static") {
    sourceStatus.textContent = "Browser-local questioning engine";
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

  let data;
  if (!state.backendAvailable) {
    data = startStaticSession(bug);
  } else {
    const response = await fetch("/api/escalate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        bug,
      }),
    });
    data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to start session");
    }
  }

  state.started = true;
  state.level = data.level;
  state.currentQuestion = data.message;
  state.model = data.model || state.model;
  setSourceStatus(data.source, data.note);
  resolvePending(
    pending,
    `Level ${data.level} - ${data.stage.name} via ${getSourceLabel(data.source)}`,
    data.message,
    data.note
  );
}

async function continueSession(answer) {
  const pending = beginPendingMessage(
    `Reviewing your response for Level ${state.level} and preparing a less helpful follow-up.`
  );

  let data;
  if (!state.backendAvailable) {
    data = continueStaticSession(state.bug, state.level, answer, state.history);
  } else {
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
    data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to continue session");
    }
  }

  state.history.push({
    level: state.level,
    question: state.currentQuestion,
    answer,
  });

  state.level = data.level;
  state.currentQuestion = data.kind === "question" ? data.message : "";
  state.complete = data.kind === "complete";
  state.model = data.model || state.model;
  setSourceStatus(data.source, data.note);

  resolvePending(
    pending,
    `${data.stage.name} via ${getSourceLabel(data.source)}`,
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
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      throw new Error(`Health endpoint returned ${response.status}`);
    }
    const data = await response.json();
    state.backendAvailable = true;
    state.stages = data.stages || [];
    state.model = data.model || "unknown";
    state.version = data.version || "Rubber Duck Diffusion Platform v4.1.8";
    state.geminiConfigured = Boolean(data.geminiConfigured);
    state.responseMode = data.responseMode || "fast";
  } catch (_error) {
    state.backendAvailable = false;
    state.stages = STATIC_STAGES;
    state.model = "browser-local";
    state.version = "Rubber Duck Diffusion Platform v4.1.8";
    state.geminiConfigured = false;
    state.responseMode = "static";
  }

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
