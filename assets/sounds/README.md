# Sounds

This folder is intentionally empty.

Every sound effect (button click, dice roll, token move, capture, victory,
countdown) is **synthesized at runtime** with the Web Audio API in
`scripts/sound.js`, rather than shipped as binary `.mp3`/`.wav` assets.

Why:
- Keeps the repository 100% text-based and diff-friendly - genuinely "GitHub safe" with no binary blobs.
- Avoids any licensing ambiguity that comes with redistributing third-party audio.
- Guarantees a single `AudioContext`, no duplicate/overlapping playback, and instant mute - the exact reliability goals in the project brief.

If you'd rather use recorded audio, drop files here (e.g. `dice-roll.mp3`)
and swap the corresponding method in `scripts/sound.js` to play an
`HTMLAudioElement`/`AudioBufferSourceNode` loaded from this folder instead.
