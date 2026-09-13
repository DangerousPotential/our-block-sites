# Steady Kopi prop sprites

Generated with the built-in ImageGen tool on 13 September 2026. No CLI/API fallback. The original generated output is copied without raster post-processing to `kopi-props-key.png`.

## Inputs and provenance

Style reference inspected: `public/assets/party/game-worlds.png`, middle-left tabletop panel. It informed the warm amber lighting, aged materials and ivory porcelain with teal floral decoration; no pixels were copied from it.

Initial output: `C:/Users/Teh/.codex/generated_images/01a097e9-7828-7a22-95ab-1fec0696b816/exec-38197884-5387-4d2a-8f54-3c6125150a73.png`.

Selected ImageGen edit: `C:/Users/Teh/.codex/generated_images/01a097e9-7828-7a22-95ab-1fec0696b816/exec-b065cdb5-026a-461a-8143-4a5f0913af52.png`.

## Exact initial prompt

```text
Use case: stylized-concept.
Asset type: production game sprite sheet, exact canvas 1536 x 1024 pixels.
Create exactly THREE separate isolated game props against a perfectly flat uniform chroma-key magenta #ff00ff background. This is an asset sheet, not a scene. No environmental shadows or background texture.
The upper two-thirds contains ONE complete large antique kopitiam serving tray seen directly top-down. Centre (768,350), width about 920 pixels, height about 560 pixels; complete oval silhouette with at least 50 pixels of uninterrupted magenta around it. Oval ellipse aspect roughly 1.65:1. Rich tarnished brushed brass raised rim, subtly scratched flat dark teal enamel interior, faint worn circular central medallion that will indicate a balance target. Empty tray: no cup or props on it.
Lower third: at centre (400,845) ONE isolated porcelain kopi cup directly top-down, ivory porcelain with delicate dark teal floral decoration around the rim, handle to the right, filled with glossy black coffee. Circular cup body diameter approximately 200 pixels, entire silhouette plus handle visible. No saucer.
At centre (1100,845) ONE same ivory floral kopi cup, slightly tilted to one side with a little black coffee splashed beside it, all splash droplets close by and within a roughly 280 x 250 pixel area. Complete silhouette, no saucer.
Materials and style: richly painted believable warm-lit nostalgic Singapore kopitiam props; fine ceramic glaze crazing, deep coffee with thin tan bubble edge, burnished weathered brass. Reference aesthetic is an amber-lit old kopitiam wooden tabletop with ivory cups bearing teal flower patterns. Do not depict the table itself. Lighting warm upper left highlights on objects only; no cast shadows on magenta.
Hard constraints: exact 1536x1024 horizontal sheet. Top-down view. Three isolated groups, no overlap, generous gap between tray and cups. No text, labels, letters, watermarks, people, furniture, scenery, extra objects, saucers, gradient background, tinted magenta or checkerboard. Every pixel outside object silhouettes is flat #ff00ff.
```

## Exact corrective edit prompt

Edit target was the initial output above.

```text
Edit the provided sprite sheet. Preserve the three existing painted objects and their fine material texture. Change ONLY the background and scale/placement to make a usable chroma-key sprite sheet. The entire background outside hard object silhouettes MUST be vivid, flat solid MAGENTA RGB(255,0,255) HEX #ff00ff, including inside the handle holes. No black, brown, grey, gradient, soft glow, shadow or table anywhere outside the objects. Remove ALL cast shadows and glows completely. Output exact 1536 x 1024 pixels.
Resize the top tray to fit within x260..1276, y55..650 (including handles), still directly top-down and complete, with even magenta border around it. Preserve teal enamel, brass rim, central worn circle.
Resize the lower left upright cup to fit within x285..535,y730..965, with handle to right; complete silhouette and exact top-down camera.
Resize lower right tilted cup and small spill together to fit within x955..1245,y725..975; complete silhouette.
Preserve the three subjects. Add no text or other objects. The background is technical CHROMA KEY MAGENTA, not a pretty scene background. Saturated #ff00ff in every outside pixel is the most critical requirement.
```

## Inspected output and crop measurements

Canvas: 1536 × 1024 RGBA PNG, opaque. Three separate complete object groups. No lettering or environment. Selected edit removes the unwanted brown vignette and cast glows from the initial output. Generated matte is vivid magenta but does not exactly equal the requested #ff00ff; top-left RGB is (235, 12, 240). Use a tolerant chroma key, not exact colour equality.

Measurements below are read-only pixel analysis, rejecting magenta pixels with R>180, B>130, G<100, and min(R,B)-G>90. Bounding boxes use exclusive right/bottom coordinates.

| Sprite | Bounds (left, top, right, bottom) | Pixel size | Aspect |
| --- | --- | --- | --- |
| Tray including handles | 126, 28, 1405, 621 | 1279 × 593 | 2.15683 |
| Upright cup with handle | 328, 654, 689, 948 | 361 × 294 | 1.22789 |
| Tilted cup with all spill droplets | 944, 657, 1325, 985 | 381 × 328 | 1.16159 |

The generator preserved wider tray proportions and larger objects than the requested layout; use measured crops rather than assumed prompt coordinates. Add crop padding for antialiasing. The tray's dark teal playable interior excludes its raised brass rim and handles. Lighting is painted on the props; live game movement, tilt and shadow are implementation responsibilities.

