# Fruit Slice
A private-camera browser motion game for one or two people. Open the Pages URL in landscape, choose players and avatars, then tap Start camera. Stand in your assigned lane with shoulders and hands visible and raise one wrist. Swipe either hand through falling fruit. Choose Gentle, Classic, or Fast before or during play. Each level lasts two minutes of active play. Slice at least one fruit and finish with as many slices as misses to advance. From level two, fruit rotates through the left, middle and right of each lane in shuffled order. Every level increases the selected speed. A cut shows two separating halves and +1; a missed fruit shows a crying face. Toggle the soft instrumental loop with Music on/off. When players are tracking again in their original lanes, the paused round resumes automatically.

For a seventh-generation iPad, use a Lightning Digital AV Adapter and HDMI cable to mirror the game. Aim the iPad at the players. Try the camera on the iPad before buying any accessories.

## Development
Serve the docs folder over localhost (for example python -m http.server 8000 --directory docs). For an iPad use HTTPS. Run node --test test/game.test.mjs from the project root. Pages serves the docs directory on main. All runtime requests are same-origin; there is no application backend, camera upload or telemetry.

## Assets
MediaPipe Tasks Vision 0.10.21 (Apache 2.0) and matching SIMD/non-SIMD WebAssembly files are bundled in docs/vendor. The model is Google's pose_landmarker_lite/float16/1 from the mediapipe-models bucket. Model source: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
Each character uses a procedural full-body cartoon puppet with tracked limbs, on a character-specific illustrated stage. Named character choices use original species-based costumes. No avatar shows your mirrored camera view; mixed two-player mode extracts the camera player's silhouette and renders the teammate as a cartoon in their own lane. All camera processing stays on the device.

## Device acceptance
Record iPadOS and browser versions. Try every avatar alone, then two different avatars, matching avatars, one camera-view player, and two camera-view players. Test leaving and returning to the original lanes, denied permission and retry, and replay and both change actions. Repeat on the HDMI display. Watch the update counter over ten minutes of repeated rounds with two players (target 12 updates/s); compare real hand movement with the mirrored cursor. Desktop tests cannot establish iPad speed or display latency.
