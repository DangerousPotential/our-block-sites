"""Export editable period visitor prototypes using the map's Blender vocabulary."""
from pathlib import Path
builder = Path(__file__).with_name('build-pastimes1950s.py')
exec(compile(builder.read_text().split('# Ground, distinct paths')[0], str(builder), 'exec'))
for index in range(4):
    before = set(bpy.data.objects)
    # Two skirts and two shirts; no randomly assigned hats.
    guest_sequence = [0, 2, 3, 5][index]
    rng.seed(1950 + index)
    guest(0, 0, y=0, scale=1)
    root = bpy.data.objects.new('period_visitor_' + str(index), None)
    bpy.context.collection.objects.link(root)
    current = root
    end()
    root['evidence'] = 'NHB 2011-02733; typological dress, not identified individuals'
# Match the main scene's sRGB swatches in Blender's linear material space.
for color, material in palette.items():
    rgb = [int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    material.diffuse_color = (*linear,1)
    material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*linear,1)
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'period-visitors.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'period-visitors.glb'), export_format='GLB', export_extras=True)
