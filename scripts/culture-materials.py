"""Exportable PBR maps derived from the approved painted surface assets.

Executed inside Blender by the world builder. Colour remains the supplied art;
normal and roughness encode material relief rather than re-lighting that art.
"""
import numpy as np
import hashlib
import time

surface_maps={}
mosaic_image=None

def packed_image(name, pixels, non_color=False):
    height,width=pixels.shape[:2]
    image=bpy.data.images.new(name,width=width,height=height,alpha=False)
    if non_color:image.colorspace_settings.name='Non-Color'
    image.pixels.foreach_set(np.ascontiguousarray(pixels,dtype=np.float32).ravel())
    image.filepath_raw=str(OUT/(name+'.png'));image.file_format='PNG'
    image.save();image.pack()
    return image

def prepare_surface_maps():
    global mosaic_image
    # Every atlas cell has its own border. Differentiate inside the cell so
    # neighbouring painted panels cannot leave false normal-map seams.
    for source,label in [(atlas,'surfaces'),(detail_atlas,'interiors')]:
        w,h=source.size
        rgba=np.empty(w*h*4,dtype=np.float32);source.pixels.foreach_get(rgba)
        rgba=rgba.reshape(h,w,4)
        if label=='interiors':
            mosaic=rgba[:h//2,2*w//3:,:].copy()
            mosaic_image=packed_image('dragon-mosaic',mosaic)
        else:mosaic=None
        # Half-size maps retain tactile detail without doubling world downloads.
        work=rgba[::2,::2,:]
        normal=np.ones_like(work);normal[...,:2]=.5
        rough=np.ones_like(work)
        for row in range(2):
            for col in range(3):
                tile=(1-row)*3+col+(6 if label=='interiors' else 0)
                sy=slice(row*work.shape[0]//2,(row+1)*work.shape[0]//2)
                sx=slice(col*work.shape[1]//3,(col+1)*work.shape[1]//3)
                rgb=work[sy,sx,:3]
                lum=rgb@np.array([.2126,.7152,.0722])
                if tile==11:
                    # Cream grout is recessed; orange ceramic faces are raised.
                    relief=np.clip((rgb[...,0]-rgb[...,2])*.95,0,.5)
                    finish=np.clip(.66-relief*.7,.32,.7)
                elif tile<6:
                    relief=lum*.22
                    base=[.86,.38,.72,.57,.89,.78][tile]
                    finish=np.clip(base+(lum-lum.mean())*.2,.22,.98)
                else:
                    # Posters, menus and shelving art are painted colour, not
                    # fabricated sculptural relief from their light/dark marks.
                    relief=np.zeros_like(lum);finish=np.full_like(lum,.8)
                dy,dx=np.gradient(relief)
                vector=np.stack([-dx*2.5,-dy*2.5,np.ones_like(dx)],axis=-1)
                vector/=np.linalg.norm(vector,axis=-1,keepdims=True)
                normal[sy,sx,:3]=vector*.5+.5
                rough[sy,sx,:3]=finish[...,None]
        if label=='surfaces':
            surface_maps[label]=(packed_image(label+'-normal',normal,True),packed_image(label+'-roughness',rough,True))
        if mosaic is not None:
            surface_maps['mosaic']=tuple(packed_image('dragon-'+kind,array[:array.shape[0]//2,2*array.shape[1]//3:,:].copy(),True) for kind,array in [('normal',normal),('roughness',rough)])

def connect_surface_maps(m,node,tile):
    key='mosaic' if tile==11 else 'surfaces' if tile<6 else None
    if key is None:return
    normal_image,rough_image=surface_maps[key]
    nodes=m.node_tree.nodes;links=m.node_tree.links
    normal_tex=nodes.new('ShaderNodeTexImage');normal_tex.image=normal_image
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.7
    links.new(normal_tex.outputs['Color'],normal.inputs['Color'])
    links.new(normal.outputs['Normal'],node.inputs['Normal'])
    rough_tex=nodes.new('ShaderNodeTexImage');rough_tex.image=rough_image
    links.new(rough_tex.outputs['Color'],node.inputs['Roughness'])
    m['surfaceAuthoring']='reference-pbr-v1'

def prepare_export_images():
    # Keep colours compact while preserving tangent-space vectors losslessly.
    # AUTO alone exports every historical painted grain as PNG; forced JPEG
    # corrupts normal vectors. Pack JPEG copies of colour inputs only.
    cache=ART/'export-colour';cache.mkdir(parents=True,exist_ok=True)
    converted={}
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH':continue
        for m in obj.data.materials:
            if not m or not m.use_nodes:continue
            bsdf=m.node_tree.nodes.get('Principled BSDF')
            if not bsdf:continue
            for link in bsdf.inputs['Base Color'].links:
                tex=link.from_node
                if tex.type!='TEX_IMAGE' or not tex.image or tex.image.file_format=='JPEG':continue
                source=tex.image
                if source.name not in converted:
                    copy=source.copy()
                    path=cache/(hashlib.sha256(source.name.encode()).hexdigest()[:16]+'.jpg')
                    copy.filepath_raw=str(path);copy.file_format='JPEG';copy.save()
                    packed=bpy.data.images.load(str(path),check_existing=False)
                    packed.name=source.name+' colour';packed.pack()
                    converted[source.name]=packed
                    bpy.data.images.remove(copy)
                tex.image=converted[source.name]

def export_native_world(era):
    # Export outside Vite's watched asset folder, then replace the completed
    # file. Browser requests must never receive a partially written GLB.
    staging=ART/'export-glb';staging.mkdir(parents=True,exist_ok=True)
    temporary=staging/(era+'.glb')
    target=ROOT/'public/assets/trip'/(era+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(temporary),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_image_format='AUTO',export_jpeg_quality=90,export_lights=True,export_import_convert_lighting_mode='SPEC')
    for attempt in range(12):
        try:
            temporary.replace(target)
            return
        except OSError as error:
            # Windows readers can briefly hold an old asset during a build.
            if attempt==11 or (error.errno not in [13,22] and getattr(error,'winerror',None) not in [5,32]):raise
            time.sleep(.2)
