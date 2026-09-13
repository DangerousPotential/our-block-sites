# From generated images to playable Singapore memories

Our Block used Astra for creative direction and implementation, GPT Image 2.5 for image generation, and Blender for editable 3D scenes. The team identifies the image model as GPT Image 2.5; the saved prompt records name Codex's built-in ImageGen tool rather than recording a model ID.

## Characters that carry across the game

The [original prompts](../public/assets/prompts.json) specify eight local mascots in a 4 × 2 atlas and twelve neighbour sprites in a 4 × 3 atlas: four fictional individuals, each shown in their 20s, 40s and 60s. The characters include a kopi cup, pandan sprout, kueh, otter, durian, tissue packet, mosaic dragon and Merlion-inspired mascot.

Those prompts ask for consistent scale, full-body framing, a shared pixel palette and transparent backgrounds. A follow-up extraction prompt corrects the background while retaining character positions and colours. The [manifest](../public/assets/manifest.json) records the grid and identities; the runtime images are [pets.webp](../public/assets/pets.webp) and [neighbours.webp](../public/assets/neighbours.webp).

These atlases provide character images. Movement, reactions and ambient activity come from software transforms and choreography; image generation alone did not produce the world's animation system.

## Art composed around mechanics

### Teh Tarik!

The [generation and edit prompts](../public/assets/party/TEH-TARIK-ART.md) document a shift from an initial photographic direction to pixel art, followed by pose and stall refinements from supplied references. A later iteration separates the stall and foreground pourer for a cup-height view.

That separation matters: the receiving cups and tea stream must react to the player. Baking them into the image would prevent the interaction. The [tea renderer](../components/game/teh-tarik-art.ts) and [minigame scene](../components/game/PartyMinigame.tsx) connect the image layers to the live game.

### Flag erasers

The [art record](../public/assets/eraser/ART.md) preserves both the initial illustrated opponent poses and the later pixel-art classroom. The final background uses the existing mascot atlas as a style reference and deliberately excludes characters and erasers. The game adds the selected roster characters and game objects at runtime. Earlier opponent art remains in the repository but is not the active character system.

### Last Order, Lah!

The [food atlas record](../public/assets/party/HAWKER-ART.md) includes the exact prompt, delivered dimensions, alpha-channel inspection and measured bounds for kopi, kaya toast, kueh and laksa. The generated sheet returned real transparency; preserving it also preserves the pink kueh. [DishArt](../components/game/DishArt.tsx) and the [shared art loader](../components/game/minigame-art.ts) reuse those dishes in play.

### Getai Groove and Singapore Skyways

The [getai backdrop](../public/assets/party/getai-singapore.webp) brings a neighbourhood concert into the rhythm scene. The [Skyways artwork](../public/assets/party/singapore-skyways.webp) supports the climb's Singapore settings. The [minigame renderer](../components/game/PartyMinigame.tsx) supplies the lanes, platforms, inputs and scoring.

The earlier [forest prop record](../public/assets/party/FOREST-ART.md) shows another production problem: an unusable background required a second image edit to create a clean chroma matte. It also documents measured frames and preserving prop proportions. Retained art records describe their own iterations; their presence does not mean every earlier prop is active in the current game.

## From world references to Blender scenes

During development, Astra and the Product Design skill helped iterate on generated 2D world references before constructing and refining Blender scenes. Generated surface artwork and sprite residents were then integrated with native geometry and scripted neighbourhood activity. The scenes centre on recognisable daily life: residents gathering, playing and working.

The public snapshot contains the playable [1950s world](../public/assets/trip/pastimes.glb), [1987 world](../public/assets/trip/estate.glb), layout data and scene code. Historical reference images, research notes and editable Blender authoring files are outside this public snapshot. The [lobby art notes](../public/assets/lobby/ART.md) distinguish illustrative backdrops from the researched 3D worlds. These scenes are stylised composites, not geographically exact reconstructions.

## Delivering the artwork

Generated source images were converted into web assets and integrated with explicit sprite framing, alpha handling and gameplay anchors. The [compression map](../lib/storage/compression.json) connects logical source paths to runtime files; older provenance notes therefore refer to PNG originals where the shipped file is WebP.

The [download manifest](../lib/storage/download-assets.json) records asset sizes and SHA-256 hashes. The lobby downloads and verifies the asset pack before God Mode entry, allowing the browser to reuse models, sprites and backgrounds. This makes the generated art practical to load and replay while multiplayer continues to use the network.

## Astra's role beyond images

Astra helped turn broad product direction into world exploration, minigame integration, QR phone joining, shared room state, controls and feedback. Development included visual revisions, gameplay checks, browser testing and subsequent fixes to phone behaviour and delivery. The project was iterative; the public repository and hosted release can represent different checkpoints.

The team steered the experience through references and feedback. Astra helped implement it, GPT Image 2.5 supplied the image work, and Blender provided the 3D scene assets. Audio and external media remain separately credited.
