"""Native Blender civic/work buildings. Each is a place, not a relabelled shop.
Singapore-inspired composites, not surveyed reconstructions of named buildings.
"""
def city_building(kind, era, x, z, sign, solid):
    old=era in ['river','fair']; modern=era in ['town','garden']
    wall='#e3d5ae' if old else '#c5d6cb'
    if kind=='school':
        # Open classroom with a sheltered verandah and visible desks/chalkboard.
        B('School classroom back wall',x,z-1.4,1.7,5.4,.18,3,wall)
        for dx in [-2.65,2.65]: B('School end wall',x+dx,z,1.7,.18,2.8,3,wall)
        B('School terrazzo floor',x,z,.24,5.5,3,.15,'#bfbaa2')
        roof(x,-z,3.35,6,3.6,'#995b43')
        for dx in [-2.6,0,2.6]:B('Verandah column',x+dx,z+1.8,1.6,.14,.14,3,'#e9e0c8')
        B('School shelter fascia',x,z+1.8,3.05,5.8,.2,.28,'#508c89')
        B('Classroom chalkboard',x,z-1.27,1.8,2.9,.04,1.1,'#285851')
        label('SELAMAT PAGI',x,z-1.22,1.9,.19)
        label('GOOD MORNING',x,z-1.22,1.6,.17)
        for dx in [-1.5,0,1.5]:
            for dz in [-.5,.7]:
                B('School wooden desk',x+dx,z+dz,.82,.9,.55,.12,'#b17b4f')
                for leg in [-.32,.32]: B('Desk steel leg',x+dx+leg,z+dz,.45,.04,.4,.7,'#596e6a')
                B('School exercise book',x+dx,z+dz,.91,.32,.23,.035,'#ddcda1')
                B('Classroom stool',x+dx,z+dz+.45,.43,.4,.35,.09,'#aa744c')
        B('School notice board',x+2,z+1.51,1.6,.8,.05,1,'#906847')
        for j in range(3):B('School notices',x+1.75+j*.25,z+1.55,1.7,.19,.01,.3,'#f0e6bd')
        B('Flagpole',x-3.3,z+1.6,2,.04,.04,4,'#849d98')
        B('Red flag field',x-2.94,z+1.6,3.7,.65,.018,.23,'#c75d54')
        B('White flag field',x-2.94,z+1.6,3.47,.65,.018,.23,'#eae8d4')
        for dx in [-2.65,2.65]:solid(x+dx,z,.18,2.8)
        solid(x,z-1.4,5.4,.18)
        for dx in [-1.5,0,1.5]:
            for dz in [-.5,.7]:solid(x+dx,z+dz,.9,.55,.04)
    elif kind=='industry':
        # Open loading bay: corrugated shed, working rollers, goods, dispatch desk.
        B('Workshop rear brickwork',x,z-1.5,1.7,5.8,.2,3.1,'#ad7057')
        for dx in [-2.8,2.8]:B('Workshop steel frame',x+dx,z,1.9,.16,3,3.6,'#637c78')
        for dx in [-1.5,1.5]:roof(x+dx,-z,3.6,3,3.6,'#7c9692')
        B('Loading bay slab',x,z,.23,6,3.5,.2,'#a8aca0')
        B('Factory conveyor frame',x,z+.65,.8,3.7,.65,.18,'#537f79')
        for j in range(12):
            o=cyl('Conveyor roller',(x-1.65+j*.3,-z-.65,.96),.065,.7,'#acbcb4');o.rotation_euler.x=math.pi/2
        for j in range(6):
            B('Stacked export crate',x-2+(j%2)*.65,z-.8, .5+(j//2)*.52,.6,.6,.5,'#ad8a58')
            label('SG',x-2+(j%2)*.65,z-.485,.47+(j//2)*.52,.12)
        B('Dispatch desk',x+2,z+.4,.85,.9,.7,.12,'#b28a59')
        for j in range(7):B('Roller shutter slat',x,z-1.36,2.3+j*.11,2.7,.045,.075,'#879b92')
        for j in range(8):B('Loading bay safety stripe',x-2.6+j*.75,z+1.67,.36,.3,.07,.18,'#dfbf58')
        label('DELIVERIES',x,z+1.8,2.9,.25)
        if era=='garden':
            for dx in [-1.5,1.5]:B('Roof solar panel',x+dx,z-.3,3.85,2.2,1.8,.06,'#365d79')
        solid(x,z-1.5,5.8,.2)
        for dx in [-2.8,2.8]:solid(x+dx,z,.16,3)
        solid(x,z+.65,3.7,.65)
    elif kind=='office':
        # Earlier trading office -> concrete banking tower -> contemporary glass CBD.
        height={'river':4,'fair':6,'estate':8,'town':9,'garden':11}[era]
        B('Commercial office core',x,z,height/2+.2,4.7,2.8,height,wall)
        for level in range(int(height)):
            y=level+.75
            for dx in [-1.75,-.9,0,.9,1.75]:
                B('Office glazing',x+dx,z+1.42,y,.62,.045,.6,'#4d8390' if modern else '#55746e')
            B('Office sunshade ledge',x,z+1.6,y+.38,5,.45,.08,'#bbccc0')
        for dx in [-2.2,0,2.2]:B('Bank colonnade',x+dx,z+2,1.2,.18,.18,2.2,'#e6dcc0')
        B('Office covered pavement',x,z+2,.24,5.5,1.2,.12,'#bfb79e')
        B('Office entrance',x,z+1.45,1,1.15,.04,1.6,'#294e60')
        label('TRADING OFFICE' if old else 'CITY OFFICES',x,z+1.7,2.2,.24)
        if modern:
            for dx in [-1.8,1.8]:
                B('Office planter',x+dx,z+2,.5,.75,.7,.5,'#82998a')
                ball('Office tropical planting',(x+dx,-z-2,.95),(.55,.45,.5),'#438763')
        solid(x,z,4.8,2.9)
    label(sign,x,z+1.85,3.12,.21)

def add_city_housing(era,solid,activities):
    if era not in ['fair','town']:return
    positions=[(4,-11,6)] if era=='fair' else [(8.5,-17,7),(14.5,-17,8)]
    for index,(x,z,floors) in enumerate(positions):
        hdb(x,-z,floors,'#d7c5a3' if era=='fair' else '#a6c4bf',str(60+index) if era=='fair' else str(310+index))
        solid(x,z,4,2)
        for j in range(4):
            B('Resident bamboo laundry pole',x-1.2+j*.7,z+1.15,2.3,.035,.65,.035,'#a28a5d')
            B('Laundry drying at home',x-1.2+j*.7,z+1.37,2.03,.38,.04,.48,['#e0b454','#628eab','#b56260','#dccaaa'][j])
        for j in range(6):B('Void deck letterbox',x-1.5+j*.2,z+1.1,.8,.17,.15,.2,'#748f89')
        B('Void deck chess table',x,z+2.3,.7,1.1,1.1,.1,'#c8bda2')
        for j in range(4):B('Stone stool',x+math.cos(j*math.pi/2)*1.1,z+2.3+math.sin(j*math.pi/2)*1.1,.3,.38,.38,.5,'#aeb69f')
        activities.append({'kind':'housing','x':x,'z':z+2.3,'count':4,'name':'Void-deck neighbours','dialogue':['Home at last. Come downstairs for a game before dinner.','The laundry is drying upstairs; we can hear our neighbours calling from the corridor.']})

def surface_details(objects=None):
    """Packed UV textures survive GLB export; original material-specific patterns."""
    cache={}
    for o in list(bpy.context.scene.objects) if objects is None else objects:
        if o.type!='MESH' or not o.data.materials:continue
        name=o.name.lower()
        kind=next((k for k,words in [
            ('timber',['timber','wooden','crate','desk','wall slat']),
            ('tile',['five foot','terrazzo','mosaic','paved apron']),
            ('brick',['brickwork','stone quay']),
            ('metal',['shutter slat','steel','roller','solar']),
            ('plaster',['classroom','office core','hdb block','shophouse']),
            ('thatch',['pitched roof'])
        ] if any(w in name for w in words)),None)
        if not kind:continue
        original=o.data.materials[0];key=(kind,original.name)
        if key not in cache:
            m=original.copy();m.name=kind+' '+original.name
            rgb=original.diffuse_color[:3];rng=random.Random(str(key));pixels=[];size=128
            for y in range(size):
                for x in range(size):
                    grain=rng.uniform(.94,1.04)
                    if kind=='timber':grain*=.7 if x%32<2 else .96+.05*math.sin(x*.7+math.sin(y*.09))
                    elif kind=='tile':grain*=.68 if x%16<1 or y%16<1 else (1.08 if (x//16+y//16)%2 else .93)
                    elif kind=='brick':grain*=.68 if y%16<2 or (x+(y//16%2)*16)%32<2 else .96
                    elif kind=='metal':grain*=.8+.2*math.sin(x*math.pi/8)**2
                    elif kind=='thatch':grain*=.74+.25*abs(math.sin(x*1.7+math.sin(y*.05)))
                    else:grain*=.96+.04*math.sin(x*.1)*math.cos(y*.1)
                    pixels.extend([min(1,c*grain) for c in rgb]+[1])
            img=bpy.data.images.new(m.name,width=size,height=size);img.pixels.foreach_set(pixels);img.pack()
            node=m.node_tree.nodes.get('Handmade surface') or m.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
            bsdf=m.node_tree.nodes['Principled BSDF'];bsdf.inputs['Base Color'].default_value=(1,1,1,1)
            bsdf.inputs['Roughness'].default_value=.38 if kind=='metal' else .85
            m.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color']);cache[key]=m
        o.data.materials[0]=cache[key]
