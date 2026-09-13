# Last Order Lah food sprite provenance

- Mode: built-in ImageGen, generated September 13, 2026.
- Original: `C:/Users/Teh/.codex/generated_images/01a097e9-3be1-7430-bb34-ccd79309620a/exec-a3d08c96-0b82-4913-9dee-5e71b9219057.png`
- Deployable copy: `public/assets/party/hawker-dishes.png`
- Source image dimensions: **1254 × 1254 pixels**, RGBA. Equal 2 × 2 atlas cells are **627 × 627 pixels**.
- The tool returned genuine alpha transparency despite the requested chroma matte; preserve that original alpha. Do not chroma-key the pink kueh.
- No image processing, crop, resampling, or alpha manipulation has been applied. This is the original generated file copied byte-for-byte.
- Art direction reference inspected before generation: `public/assets/party/game-worlds.png`, especially the kopi tabletop and hawker kitchen panels. No reference was passed as an edit target.
- Visually inspected: four complete independent dishes, matching green-floral porcelain, warm realistic painted food texture, no labels or environment. Kaya toast has four triangles; kueh and laksa are clearly distinct.
- Minor limitation: the delivered size differs from the requested 1024 square. Runtime should crop using the actual 627-pixel cell dimension, or normalized cell coordinates.

## Measured bounds

Coordinates are local to each 627 × 627 cell and use Pillow's exclusive right/bottom convention. Bounds include pixels with alpha >16, retaining the visible antialiased edge.

| Dish | Cell origin | Visible bounds (left, top, right, bottom) |
| --- | --- | --- |
| Kopi | (0, 0) | (55, 70, 573, 507) |
| Kaya toast | (627, 0) | (30, 79, 591, 514) |
| Kueh | (0, 627) | (43, 50, 581, 498) |
| Laksa | (627, 627) | (34, 22, 584, 535) |

Alpha range is 0–255. Corner (0,0) is (0,0,0,0). There are faint almost-transparent pixels beyond these alpha >16 bounds, so use the full cell when extracting rather than applying a hard alpha threshold.

## Exact generation prompt

```text
Use case: stylized-concept.
Asset type: deployable food sprite sheet for a nostalgic Singapore kopitiam multiplayer game.
Create one square 1024x1024 image, precisely organized as an equal 2x2 grid, four 512x512 cells. NO drawn grid lines. Entire background perfectly flat pure chroma magenta #ff00ff (RGB255,0,255), no gradient, no floor, no cast shadows on this background.
Each quadrant contains exactly one complete isolated dish, centered in its quadrant, with generous empty magenta margins, the entire dish including saucer or plate staying inside that quadrant.
Top-left: traditional off-white porcelain kopitiam cup decorated with dark green floral motifs, filled with glossy dark kopi, on its matching whole saucer. Cup handle visible.
Top-right: whole porcelain plate of exactly four golden kaya toast triangles with crisp grilled bread texture and visible pale green kaya and butter filling.
Bottom-left: whole porcelain plate of assorted Singapore kueh: green pandan pieces, pink-and-white layered slices, and green coconut-covered ondeh ondeh balls.
Bottom-right: whole porcelain bowl of rich orange laksa, with visible noodles, two prawns, half a boiled egg, and small herbs.
All four dishes viewed at the same camera angle, approximately 35 degrees top-down, with coherent realistic proportions. Richly painted realistic game art, exquisite nostalgic material detail, soft warm upper-left lighting, subtle ceramic patina, appetizing food textures. Match the warm detailed old kopitiam sensibility, jewel green porcelain decoration, worn material richness, and handcrafted painted realism of the existing game-worlds hawker/cup art.
No labels, text, logos, watermark, utensils, separate garnish outside dishes, table, setting, environment, or shadows outside the objects. Do not cut off any object. Flat #ff00ff matte must touch all image edges and fill the gaps around every dish.
```

