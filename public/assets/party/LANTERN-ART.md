# Lantern Lane prop sprite source

Generated 13 September 2026 with the built-in ImageGen tool. No CLI/API fallback, raster post-processing, resizing or compositing was used. The final generated PNG was copied unmodified into this directory.

Asset: `lantern-props-key.png`, 1536 × 1024 pixels.

Art direction was inspected from the upper-right night-fair panel of `public/assets/party/game-worlds.png`: richly painted bamboo, warm amber lantern light, red fabric and worn gold detail. The atlas was viewed for direction, not passed as an image edit target.

## Sprite measurements

Bounding boxes use source pixels, [left, top, right-exclusive, bottom-exclusive], measured by excluding magenta background with `r > 180 && b > 150 && g < 100 && min(r,b) > g+90`.

| Prop | Bounding box | Size | Width : height |
| --- | --- | --- | --- |
| Low bamboo hurdle | [125, 168, 825, 393] | 700 × 225 | 3.11 |
| Tall lantern blocker | [1031, 20, 1252, 508] | 221 × 488 | 0.453 |
| Finish gateway | [67, 522, 1463, 991] | 1396 × 469 | 2.98 |

Suggested padded crop rectangles (x, y, width, height): hurdle (117,160,716,241), blocker (1023,12,237,504), gateway (59,516,1412,483). Gate and blocker have a narrow vertical gutter; do not expand the gateway crop above y=516.

The background is visually magenta and suitable for threshold chroma-keying, but ImageGen did not produce mathematically identical #ff00ff pixels. Sample background pixels: (237,12,239), (251,4,250), (251,3,250), (250,3,249). Use a tolerant magenta key, not exact RGB equality. Object colours contain no intended magenta. The sheet has no environment, floor or background lighting gradients after the correction.

Visual inspection: all three silhouettes complete, exactly three stacked lanterns, readable FINISH, warm material detail preserved, empty gateway interior keyed. Approximate ratios describe image silhouettes rather than measured real-world objects.

## Exact initial prompt

```text
Use case: stylized-concept.
Asset type: production-ready game sprite sheet, exactly 1536 x 1024 pixels.
Create three separated standalone nostalgic Singapore night-fair obstacle props with richly painted realistic bamboo grain, worn red cloth and warm golden lantern light. Style matches a detailed storybook miniature night market, tactile weathered materials, amber highlights, red paper lantern ribbing. Objects have crisp complete outlines, soft shading ONLY ON the objects themselves. Orthographic front view, slight top surface visible, no dramatic perspective.
Layout: upper left quadrant one LOW bamboo hurdle: one horizontal bamboo pole on two short stable legs, red and gold cloth wrapped accents, broad and low shape, about 570 pixels wide and 260 pixels tall. Upper right quadrant one TALL blocker: vertical stack of exactly three plump red Chinese lanterns held on a narrow bamboo stand, each internally glowing warm amber, gold caps, stand feet fully visible. About 290 pixels wide and 410 pixels tall. Bottom half one WIDE finish gateway: two bamboo uprights and a gently bowed bamboo crossbar, warm red lantern string across the top and a cream cloth banner with the exact readable dark red word "FINISH" (F I N I S H). Entire gateway about 1150 pixels wide and 430 pixels tall, its open interior entirely empty background. Keep all three props separate with generous gutters and no cropping. Each prop complete from tip to feet.
BACKGROUND STRICTLY one flat uniform pure RGB(255,0,255), hex #ff00ff, including inside gateway and all gaps between bamboo and lanterns. This is a chroma-key sprite sheet. No ground, floor, scenery, environment, contact shadow, cast shadow, glow spill or gradients on the background, no border, no labels, no characters, no extra props, no watermark. Never use magenta within the objects. Isolated prop assets, not a scene.
```

Initial result had an unwanted dark gradient background and was not selected for deployment.
Original generation: `C:/Users/Teh/.codex/generated_images/01a097e8-fb12-72d0-89c2-03b668464299/exec-d169afda-c28d-425e-afd9-9206e6292889.png`.

## Exact correction prompt

```text
Change ONLY the background of this exact sprite sheet to completely flat, uniform saturated pure magenta RGB(255,0,255), hex #FF00FF. Every pixel outside the three props must be magenta, including all spaces inside the bamboo hurdle, behind the lantern stack and throughout the open interior of the FINISH gateway. Remove all background gradients, glow halos, cast shadows and vignette. Preserve the exact three props, their positions, dimensions, silhouettes, materials, colours, warm internal lantern light, red cloth, gold detail and FINISH lettering unchanged. Keep 1536x1024 dimensions. This is a production chroma-key texture: strict uniform magenta empty background is the entire purpose of this edit.
```

Input: initial generated image above, supplied as the sole referenced image.
Selected final source: `C:/Users/Teh/.codex/generated_images/01a097e8-fb12-72d0-89c2-03b668464299/exec-7fb9185b-a373-46bf-862c-fbb16c1a59e9.png`.

