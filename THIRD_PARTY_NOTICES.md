# Third-party notices

## Voxel Survivors

- Repository: https://github.com/ken-fs/voxel-survivors
- Revision: cf9f1fccbcb73487ff45b8e3a6619a19b000be86
- Copied source: lib/rng.js → src/vendor/voxel-survivors/rng.js (unchanged)
- Usage: deterministic collision tests, per-session enemy spawning, and stateless visual hash
- Copyright (c) 2026 BubuAi
- License: MIT; full text in public/licenses/voxel-survivors-MIT.txt
- Upstream README identifies voxel-musou as the origin of the extracted toolkit.

## Three.js

- Package: three 0.186.1
- Repository: https://github.com/mrdoob/three.js
- License: MIT; full package license copied to public/licenses/three-MIT.txt
- Copyright © 2010-2026 three.js authors
- Official addons used from the same package: GLTFLoader, ConvexHull, RoomEnvironment, EffectComposer, RenderPass, UnrealBloomPass, OutputPass and their internal dependencies.

## AETHER / 02 — ND-01 / PHANTOM

- Creator and repository: Ramon Linares, https://github.com/RamonLinares/atlas-09
- Revision: 1b8fb9d54160215c071c5a29a49b1c36dc01f0df
- Unmodified model: public/models/aether-02.glb, including embedded textures, rig and baked animations.
- License: CC0 1.0 Universal; full text in public/licenses/aether-02-CC0-1.0.txt.
- Retargeted source animations: Quaternius / Gonzalo Furnier, Universal Animation Libraries 1 and 2, CC0.
- Source statement, provenance and file checksums: public/models/README.md.
- The game uses its own ND-01 / PHANTOM identity. No endorsement is implied. No upstream viewer, tracking software or fonts are included.

The public/licenses directory is copied into the static build. Build/test tools remain development dependencies; their original licenses are retained in their packages. Other scene visuals use project geometry and local system fonts. Audio is synthesized locally; no sound packs are included.
