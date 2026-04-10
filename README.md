# Rubber Duck Diffision Platform

Retro-serious local web app for the DEV April Fools Challenge.

Core joke:

1. The user describes a bug.
2. The duck asks one question back.
3. The user answers.
4. The duck escalates to a deeper and less practically useful question.
5. By the end, the original issue has usually been displaced by managed introspection.

The wrinkle is that this sometimes helps people think more clearly, which makes the joke better.

## Run

```powershell
cd "C:\Users\jjbla\OneDrive\Documents\Playground"
python rubber_duck_escalation/app.py
```

Open `http://127.0.0.1:8765`.

## Optional Google AI setup

The backend calls the Gemini REST `generateContent` endpoint directly. Official docs:

- [Gemini API overview](https://ai.google.dev/docs/gemini_api_overview/)
- [Gemini text generation docs](https://ai.google.dev/gemini-api/docs/text-generation)

Set an API key before starting the server:

```powershell
cd "C:\Users\jjbla\OneDrive\Documents\Playground"
$env:GEMINI_API_KEY="your-key-here"
python rubber_duck_escalation/app.py
```

Default behavior is now fast local questioning even if a Gemini key is present. To force live Google AI questions:

```powershell
$env:RDEP_RESPONSE_MODE="gemini"
python rubber_duck_escalation/app.py
```

Optional model override:

```powershell
$env:GEMINI_MODEL="gemini-2.5-flash"
```

Optional port override:

```powershell
$env:RUBBER_DUCK_PORT="9000"
```

## Escalation ladder

- Level 1: Existential
- Level 2: Philosophical
- Level 3: Therapeutic
- Level 4: Cosmic
- Level 5: Transcendent
- Level 6: Session Closure

## Build shape

- Frontend: plain HTML, CSS, and JavaScript
- Backend: one small Python HTTP server
- AI: fast local templates by default, Gemini on demand

## Submission angle

The best version of the DEV post should read like an actual product launch:

- debugging as guided self-discovery
- enterprise escalation language for a useless workflow
- example conversations as the main comedic payload
- final metrics showing zero bugs solved and measurable spiritual drift
