# Bubble Pop
A private-camera browser motion game for one or two people. Open the Pages URL in landscape, choose players and avatars, then tap Start camera. Stand in your assigned lane with shoulders and hands visible and raise one wrist. Reach for bubbles for 60 seconds. When players are tracking again in their original lanes, the paused round resumes automatically.

For a seventh-generation iPad, use a Lightning Digital AV Adapter and HDMI cable to mirror the game. Aim the iPad at the players. Try the camera on the iPad before buying any accessories.

## Development
Serve the docs folder over localhost (for example python -m http.server 8000 --directory docs). For an iPad use HTTPS. Run node --test test/game.test.mjs from the project root. Pages serves the docs directory on main. All runtime requests are same-origin; there is no application backend, camera upload or telemetry.

## Assets
MediaPipe Tasks Vision 0.10.21 (Apache 2.0) and matching SIMD/non-SIMD WebAssembly files are bundled in docs/vendor. The model is Google's pose_landmarker_lite/float16/1 from the mediapipe-models bucket. Model source: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
Animal icons use the device emoji font. The three named character choices use initials on colored game tokens. Licensed illustrations can replace the tokens once provided. No character artwork is distributed.

## Device acceptance
Record iPadOS and browser versions. Try every avatar alone, then two different avatars, matching avatars, one cursor-only player, and two cursor-only players. Test leaving and returning to the original lanes, denied permission and retry, and replay and both change actions. Repeat on the HDMI display. Watch the update counter over ten minutes of repeated rounds with two players (target 12 updates/s); compare real hand movement with the mirrored cursor. Desktop tests cannot establish iPad speed or display latency.
