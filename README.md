# SignLens

SignLens is an offline webcam-based practice mirror for **Filipino Sign Language (FSL)** using on-device MediaPipe landmark tracking, geometric joint-angle vectors, Fast Dynamic Time Warping (FastDTW), and deterministic rule-based biomechanical coaching.

## Architecture & Scope

- **Filipino Sign Language (FSL) Scope**: Covers the 26-letter FSL manual alphabet (`A-Z`), digits `0-9`, and isolated dynamic FSL vocabulary across greetings, courtesy, responses, family, daily needs, and school, plus the 105-sign FSL-105 reference video library.
- **On-Device Landmark Extraction**: Extracts 21 3D hand landmarks and upper-body pose coordinates locally via MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) with zero cloud video streaming.
- **Static & Dynamic Verification**:
  - Static handshapes are scored via scale-invariant finger joint-angle vectors with an automated **1.5 s (Learn)** / **2.0 s (Letters)** hold-timer gate (`>= 85%` threshold).
  - Dynamic FSL signs are segmented via wrist-velocity motion gating and aligned against bundled reference trajectories using **FastDTW** (`>= 80%` threshold).
- **Rule-Based Biomechanical Coaching & Adaptive Retry Queue**: Maps the largest per-joint angular or trajectory residual to a verified English corrective cue (with zero generative AI / zero LLMs) and appends missed items to the lesson queue (`t = t + 1`) until all items are cleared (`n = t + 1`).
- **Bidirectional Sign-to-Word Optical Dictionary**: Supports both text search and live camera sign-to-word top-3 lookup across bundled FSL templates.
- **CSV Telemetry Logger**: Built-in telemetry recorder in **Settings** exports per-attempt CSV logs (`timestamp, target_sign, kind, score_0_100, mean_angular_error_deg, passed, frame_latency_ms`) for empirical protocol evaluation.

## Development & Verification

Use Node.js 20+ and `pnpm`:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
```

The desktop shell is located in `src-tauri/` (Tauri 2 + Rust).
