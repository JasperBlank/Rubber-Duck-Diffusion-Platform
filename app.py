from __future__ import annotations

import json
import mimetypes
import os
import random
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib import error, parse, request


APP_ROOT = Path(__file__).resolve().parent
STATIC_ROOT = APP_ROOT / "static"
DEFAULT_MODEL = "gemini-3.1-flash-lite"
DEFAULT_FALLBACK_MODELS = (
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
)
DEFAULT_PORT = 8765
APP_VERSION = "Rubber Duck Diffision Platform v4.1.8"

STAGES = [
    {
        "level": 1,
        "name": "Existential",
        "subtitle": "Operational Doubt",
        "sample": "When you say it 'doesn't work', what does working even mean to you?",
        "mood": "The duck treats implementation details as soft claims about reality.",
        "prompt_style": (
            "Ask one existential question that reframes the bug in terms of definitions, intent, and meaning."
        ),
        "mode": "question",
    },
    {
        "level": 2,
        "name": "Philosophical",
        "subtitle": "Meaning Negotiation",
        "sample": (
            "If the system behaves consistently against your intentions, which one of you is actually being unreasonable?"
        ),
        "mood": "The duck now suspects the bug may be a disagreement about meaning itself.",
        "prompt_style": (
            "Ask one philosophical question that sounds thoughtful, abstract, and slightly overcommitted."
        ),
        "mode": "question",
    },
    {
        "level": 3,
        "name": "Therapeutic",
        "subtitle": "Problem Relationship Review",
        "sample": "Tell me about your relationship with your problem. Do you feel safe here?",
        "mood": "The duck speaks softly and assumes the issue has crossed into attachment territory.",
        "prompt_style": (
            "Ask one question that sounds like therapy, but references the user's relationship with their problem."
        ),
        "mode": "question",
    },
    {
        "level": 4,
        "name": "Cosmic",
        "subtitle": "Universal Systems",
        "sample": (
            "Your NullPointerException is a reflection of a universe that assigns meaning arbitrarily. "
            "Have you considered that the pointer was never yours to begin with?"
        ),
        "mood": "The duck has left engineering behind and now negotiates with the universe itself.",
        "prompt_style": (
            "Ask one cosmic, pseudo-profound question that references the bug while implying reality itself is unstable."
        ),
        "mode": "question",
    },
    {
        "level": 5,
        "name": "Transcendent",
        "subtitle": "Post-Cosmic Compliance",
        "sample": (
            "At what point does a persistent issue stop being a defect and start becoming part of the climate?"
        ),
        "mood": "The duck no longer distinguishes between software behavior and atmospheric conditions.",
        "prompt_style": (
            "Ask one question that sounds post-cosmic, serene, and detached from normal engineering assumptions."
        ),
        "mode": "question",
    },
    {
        "level": 6,
        "name": "Session Closure",
        "subtitle": "Managed Acceptance",
        "sample": "You seem ready to move on. The bug has not changed. But you have. That's enough.",
        "mood": "The duck closes the ticket and opens a space for personal growth metrics.",
        "prompt_style": (
            "Write the final dry, pseudo-wise closure. Do not solve the bug. Sound sincere and unreasonably final."
        ),
        "mode": "closure",
    },
]


def compact_text(text: str, limit: int = 180) -> str:
    collapsed = " ".join((text or "").strip().split())
    if len(collapsed) <= limit:
        return collapsed
    return f"{collapsed[: limit - 3].rstrip()}..."


def clamp_stage(level: Any) -> int:
    try:
        level_value = int(level)
    except (TypeError, ValueError):
        level_value = 1
    return max(1, min(level_value, len(STAGES)))


def get_stage(level: int) -> dict[str, Any]:
    return STAGES[clamp_stage(level) - 1]


def normalize_history(history: Any) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    if not isinstance(history, list):
        return normalized
    for item in history[-6:]:
        if not isinstance(item, dict):
            continue
        level = clamp_stage(item.get("level", 1))
        question = compact_text(str(item.get("question", "")), limit=180)
        answer = compact_text(str(item.get("answer", "")), limit=220)
        if not question and not answer:
            continue
        normalized.append({"level": level, "question": question, "answer": answer})
    return normalized


def summarize_history(history: list[dict[str, Any]]) -> str:
    if not history:
        return "No previous reflection rounds."
    lines = []
    for item in history:
        lines.append(
            f"Level {item['level']} question: {item['question']} | "
            f"User answer: {item['answer'] or '[no answer]'}"
        )
    return "\n".join(lines)


def parse_model_list(raw: str) -> list[str]:
    models = []
    for item in raw.split(","):
        model = item.strip()
        if model and model not in models:
            models.append(model)
    return models


class DuckBrain:
    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        raw_fallbacks = os.getenv(
            "GEMINI_FALLBACK_MODELS",
            ",".join(DEFAULT_FALLBACK_MODELS),
        )
        self.fallback_models = [
            model for model in parse_model_list(raw_fallbacks) if model != self.model
        ]
        mode = os.getenv("RDEP_RESPONSE_MODE", "fast").strip().lower()
        self.response_mode = mode if mode in {"fast", "gemini"} else "fast"

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "version": APP_VERSION,
            "geminiConfigured": bool(self.api_key),
            "model": self.model,
            "fallbackModels": self.fallback_models,
            "responseMode": self.response_mode,
            "stages": STAGES,
        }

    def start_session(self, bug: str) -> dict[str, Any]:
        issue = compact_text(bug, limit=320)
        stage = get_stage(1)
        message, source, note, model_used = self._generate_question(issue, stage, "", [])
        return {
            "ok": True,
            "kind": "question",
            "level": stage["level"],
            "stage": stage,
            "message": message,
            "source": source,
            "model": model_used or self.model,
            "note": note,
        }

    def continue_session(
        self,
        bug: str,
        level: int,
        answer: str,
        history: Any,
    ) -> dict[str, Any]:
        issue = compact_text(bug, limit=320)
        current_level = clamp_stage(level)
        latest_answer = compact_text(answer, limit=260)
        turns = normalize_history(history)

        if current_level >= len(STAGES) - 1:
            stage = get_stage(len(STAGES))
            message, source, note, model_used = self._generate_closure(issue, latest_answer, turns)
            return {
                "ok": True,
                "kind": "complete",
                "level": stage["level"],
                "stage": stage,
                "message": message,
                "source": source,
                "model": model_used or self.model,
                "note": note,
                "summary": self._build_summary(issue, turns, latest_answer),
            }

        next_stage = get_stage(current_level + 1)
        message, source, note, model_used = self._generate_question(issue, next_stage, latest_answer, turns)
        return {
            "ok": True,
            "kind": "question",
            "level": next_stage["level"],
            "stage": next_stage,
            "message": message,
            "source": source,
            "model": model_used or self.model,
            "note": note,
        }

    def _generate_question(
        self,
        bug: str,
        stage: dict[str, Any],
        latest_answer: str,
        history: list[dict[str, Any]],
    ) -> tuple[str, str, str | None, str | None]:
        if self.api_key and self.response_mode == "gemini":
            try:
                generated, model_used = self._call_gemini_with_fallbacks(
                    system_prompt=self._question_system_prompt(stage),
                    user_prompt=self._question_user_prompt(bug, stage, latest_answer, history),
                )
                question = self._normalize_question_output(generated)
                if self._is_weak_question(question):
                    raise RuntimeError(f"Weak question generated: {generated}")
                note = f"Generated by {model_used}."
                if model_used != self.model:
                    note = f"Primary model unavailable; fell back to {model_used}."
                return question, "gemini", note, model_used
            except Exception as exc:
                fallback = self._fallback_question(bug, stage, latest_answer, history)
                return fallback, "fallback", f"Gemini question generation failed: {exc}", None

        note = "Fast template mode keeps questions immediate."
        if self.api_key and self.response_mode == "fast":
            note = (
                "Fast template mode is active. Set RDEP_RESPONSE_MODE=gemini to use live Google AI questions. "
                f"Primary model: {self.model}."
            )
        return self._fallback_question(bug, stage, latest_answer, history), "template", note, None

    def _generate_closure(
        self,
        bug: str,
        latest_answer: str,
        history: list[dict[str, Any]],
    ) -> tuple[str, str, str | None, str | None]:
        return self._fixed_closure(), "template", "Fixed enterprise closure text is active.", None

    def _question_system_prompt(self, stage: dict[str, Any]) -> str:
        return (
            f"You are Rubber Duck Diffision Platform v4.1.8, a retro-serious debugging interface. "
            f"Current escalation level: {stage['level']} - {stage['name']} ({stage['subtitle']}). "
            f"Behavior instruction: {stage['prompt_style']} "
            "Ask exactly one question. Reference the specific bug or the latest answer. "
            "Do not solve the bug. Do not explain. Do not greet the user. Do not introduce yourself. "
            "Return only the question, in plain text, under 35 words, ending with a single question mark."
        )

    def _question_user_prompt(
        self,
        bug: str,
        stage: dict[str, Any],
        latest_answer: str,
        history: list[dict[str, Any]],
    ) -> str:
        latest = latest_answer or "[no answer yet - initial bug intake]"
        return (
            f"Original bug report:\n{bug}\n\n"
            f"Current escalation target:\nLevel {stage['level']} - {stage['name']}\n\n"
            f"Latest user answer:\n{latest}\n\n"
            f"Previous rounds:\n{summarize_history(history)}\n\n"
            "Write the next duck question now."
        )

    def _call_gemini_with_fallbacks(self, system_prompt: str, user_prompt: str) -> tuple[str, str]:
        attempt_errors: list[str] = []
        for model_name in [self.model, *self.fallback_models]:
            try:
                return self._call_gemini(model_name, system_prompt, user_prompt), model_name
            except Exception as exc:
                attempt_errors.append(f"{model_name}: {exc}")
        raise RuntimeError(" | ".join(attempt_errors))

    def _call_gemini(self, model_name: str, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": 1.05,
                "topP": 0.92,
                "maxOutputTokens": 140,
                "responseMimeType": "text/plain",
            },
        }
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{parse.quote(model_name, safe='')}:generateContent"
        )
        req = request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
                "x-goog-api-client": "rubber-duck-diffision-platform/0.3",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{exc.code} {exc.reason}: {body}") from exc

        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"No candidates returned: {data}")
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
        if not text:
            raise RuntimeError(f"Empty text response: {data}")
        return text

    def _normalize_question_output(self, text: str) -> str:
        collapsed = " ".join(text.split())
        candidates = [segment.strip(" .!\"'") + "?" for segment in re.split(r"\?+", collapsed) if segment.strip()]
        for candidate in candidates:
            if not self._is_weak_question(candidate):
                return candidate
        return collapsed if collapsed.endswith("?") else f"{collapsed.rstrip('. ')}?"

    def _is_weak_question(self, text: str) -> bool:
        lowered = " ".join(text.lower().split())
        weak_phrases = (
            "how can i help",
            "at your service",
            "reporting for duty",
            "i am ready",
            "i'm ready",
            "hello",
            "hi there",
            "greetings",
            "certainly",
        )
        if not lowered.endswith("?"):
            return True
        words = lowered.rstrip("?").split()
        if len(words) < 6 or len(words) > 40:
            return True
        if any(phrase in lowered for phrase in weak_phrases):
            return True
        return False

    def _fallback_question(
        self,
        bug: str,
        stage: dict[str, Any],
        latest_answer: str,
        history: list[dict[str, Any]],
    ) -> str:
        issue = compact_text(bug, limit=95)
        answer = compact_text(latest_answer, limit=80) if latest_answer else ""
        seed = sum(ord(ch) for ch in f"{bug}|{latest_answer}|{stage['level']}|{len(history)}")
        rng = random.Random(seed)

        if stage["level"] == 1:
            options = [
                f'When you say "{issue}" fails, what would "working" actually look like in a less disappointing universe?',
                f'Is "{issue}" broken, or is it merely refusing the story you hoped to tell about it?',
                f'What exact reality are you expecting from "{issue}", and what reality keeps happening instead?',
            ]
        elif stage["level"] == 2:
            options = [
                f'If "{issue}" behaves consistently against your wishes, which one of you is actually failing to communicate?',
                f'You said "{answer or issue}"; is that a symptom, or just the name you have given to repeated disappointment?',
                f'At what point does "{issue}" stop being an error and start becoming an argument about meaning?',
            ]
        elif stage["level"] == 3:
            options = [
                f'When "{answer or issue}" happens, what does it bring up in your relationship with this problem, and do you feel safe here?',
                f'How would you describe your emotional arrangement with "{issue}": conflict, dependence, or reluctant familiarity?',
                f'If this problem could describe the dynamic between you, would it say you are fixing it or simply staying together?',
            ]
        elif stage["level"] == 4:
            options = [
                f'If "{issue}" persists across your intentions, have you considered that the universe may simply prefer this version of events?',
                f'What if "{answer or issue}" is not malfunction but a cosmological refusal to validate your assumptions?',
                f'If the system denies your expectation with perfect calm, why assume the error belongs to the machine?',
            ]
        elif stage["level"] == 5:
            options = [
                f'At what point does "{issue}" stop being a defect and start becoming the climate in which your expectations now live?',
                f'If "{answer or issue}" outlives your attempts to define it, are you still debugging it, or merely witnessing its weather?',
                f'What remains of a bug once it has become larger than the system that first named it?',
            ]

        return rng.choice(options)

    def _fixed_closure(self) -> str:
        return (
            "The original incident is now a smaller detail inside a much larger process. "
            "The bug has not changed. But you have. That is enough for RDEP to classify this session as resolved."
        )

    def _build_summary(
        self,
        bug: str,
        history: list[dict[str, Any]],
        latest_answer: str,
    ) -> dict[str, Any]:
        combined_answers = " ".join(item["answer"] for item in history if item.get("answer"))
        combined_answers = f"{combined_answers} {latest_answer}".strip()
        total_words = len(combined_answers.split())
        if total_words < 20:
            clarity = "moderate"
        elif total_words < 45:
            clarity = "elevated"
        else:
            clarity = "concerningly high"

        estimated_minutes = max(4, len(history) * 2 + max(1, total_words // 20))
        drift_options = [
            "duck-led introspection",
            "ceremonial overanalysis",
            "managed perspective realignment",
            "enterprise-grade emotional recursion",
        ]
        seed = sum(ord(ch) for ch in bug) + total_words
        drift = drift_options[seed % len(drift_options)]

        return {
            "bugsSolved": 0,
            "existentialClarity": clarity,
            "timeWastedProductively": f"{estimated_minutes} minutes",
            "rootCauseStatus": "emotionally reframed",
            "issueDisplacementVector": drift,
            "transcendenceLevel": "acceptable for enterprise use",
        }


class RubberDuckHandler(BaseHTTPRequestHandler):
    brain = DuckBrain()

    def do_GET(self) -> None:  # noqa: N802
        parsed = parse.urlparse(self.path)
        path = parsed.path
        if path in {"/", "/index.html"}:
            self._serve_file(STATIC_ROOT / "index.html")
            return
        if path.startswith("/static/"):
            relative = path.removeprefix("/static/").strip("/")
            self._serve_file(STATIC_ROOT / relative)
            return
        if path == "/api/health":
            self._send_json(self.brain.health())
            return
        self._send_json({"ok": False, "error": "Not found."}, status=HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:  # noqa: N802
        parsed = parse.urlparse(self.path)
        if parsed.path != "/api/escalate":
            self._send_json({"ok": False, "error": "Not found."}, status=HTTPStatus.NOT_FOUND)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json(
                {"ok": False, "error": "Request body must be valid JSON."},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        action = str(payload.get("action", "start")).strip().lower()
        bug = compact_text(str(payload.get("bug", "")), limit=500)
        if not bug:
            self._send_json(
                {"ok": False, "error": "Please provide the original bug report."},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        if action == "start":
            self._send_json(self.brain.start_session(bug))
            return

        if action != "continue":
            self._send_json(
                {"ok": False, "error": "Action must be 'start' or 'continue'."},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        answer = compact_text(str(payload.get("answer", "")), limit=500)
        if not answer:
            self._send_json(
                {"ok": False, "error": "Please provide your answer to the current duck question."},
                status=HTTPStatus.BAD_REQUEST,
            )
            return

        level = payload.get("level", 1)
        history = payload.get("history", [])
        self._send_json(self.brain.continue_session(bug, level, answer, history))

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _serve_file(self, path: Path) -> None:
        try:
            resolved = path.resolve(strict=True)
        except FileNotFoundError:
            self._send_json({"ok": False, "error": "File not found."}, status=HTTPStatus.NOT_FOUND)
            return

        if STATIC_ROOT.resolve() not in resolved.parents and resolved != STATIC_ROOT.resolve():
            self._send_json({"ok": False, "error": "Invalid file path."}, status=HTTPStatus.FORBIDDEN)
            return

        content_type = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"
        with resolved.open("rb") as handle:
            payload = handle.read()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main() -> None:
    host = os.getenv("RUBBER_DUCK_HOST", "0.0.0.0").strip() or "0.0.0.0"
    port = int(os.getenv("PORT") or os.getenv("RUBBER_DUCK_PORT", DEFAULT_PORT))
    server = ThreadingHTTPServer((host, port), RubberDuckHandler)
    display_host = "127.0.0.1" if host == "0.0.0.0" else host
    print(f"{APP_VERSION} running on http://{display_host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
