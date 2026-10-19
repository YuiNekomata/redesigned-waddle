/* Focused Skyrim SE NIF preview reader, based on niftools' documented layout.
   Geometry is shown in bind pose. No animation or game shader simulation. */
(function(root){'use strict';
class Reader{
 constructor(buffer){this.b=new Uint8Array(buffer);this.v=new DataView(buffer);this.p=0;}
 need(n){if(n<0||this.p+n>this.b.length)throw Error('Truncated model data');}
 skip(n){this.need(n);this.p+=n;}
 u8(){this.need(1);return this.v.getUint8(this.p++);}
 u16(){this.need(2);const x=this.v.getUint16(this.p,true);this.p+=2;return x;}
 u32(){this.need(4);const x=this.v.getUint32(this.p,true);this.p+=4;return x;}
 i32(){return this.u32()|0;}
 f(){this.need(4);const x=this.v.getFloat32(this.p,true);this.p+=4;return x;}
 str(n=this.u32()){this.need(n);const s=new TextDecoder().decode(this.b.subarray(this.p,this.p+n));this.p+=n;return s.replace(/\0.*$/s,'');}
 slice(n){this.need(n);const b=this.b.slice(this.p,this.p+n);this.p+=n;return b.buffer;}
}
function half(h){const s=(h&32768)?-1:1,e=(h>>>10)&31,m=h&1023;return e===0?s*m*2**-24:e===31?(m?NaN:s*Infinity):s*(1+m/1024)*2**(e-15);}
function net(r){const name=r.u32(),n=r.u32();if(n>100000)throw Error('Too many model references');r.skip(n*4+4);return name;}
function av(r){const name=net(r);r.skip(4);const t=[r.f(),r.f(),r.f()],m=Array.from({length:9},()=>r.f()),scale=r.f();r.skip(4);return {name,t,m,scale};}
function vertices(r,count,stride){
 if(stride<16||stride>128||count>1000000)throw Error('Unsupported vertex layout');r.need(count*stride);
 const out=new Float32Array(count*5);
 for(let i=0;i<count;i++){const p=r.p+i*stride;for(let j=0;j<3;j++){const v=r.v.getFloat32(p+j*4,true);if(!Number.isFinite(v)||Math.abs(v)>1e7)throw Error('Invalid vertex position');out[i*5+j]=v;}if(stride>=20){out[i*5+3]=half(r.v.getUint16(p+16,true));out[i*5+4]=half(r.v.getUint16(p+18,true));}}
 r.skip(count*stride);return out;
}
function triangles(r,n){if(n>2000000)throw Error('Too many model triangles');return new Uint16Array(r.slice(n*6));}
function parseNif(buffer){
 const r=new Reader(buffer);const newline=r.b.indexOf(10);if(newline<0||newline>100)throw Error('Not a NIF model');r.p=newline+1;
 if(r.u32()!==0x14020007||r.u8()!==1)throw Error('Preview supports little-endian Skyrim SE NIF 20.2.0.7 only');
 const user=r.u32(),count=r.u32(),bs=r.u32();if(user!==12||bs!==100||count>100000)throw Error('Preview supports Skyrim SE NIFs only');
 for(let i=0;i<3;i++)r.str(r.u8());
 const nt=r.u16(),types=[];for(let i=0;i<nt;i++)types.push(r.str());
 const ti=Array.from({length:count},()=>r.u16()),sizes=Array.from({length:count},()=>r.u32());
 const ns=r.u32();r.skip(4);if(ns>1000000)throw Error('Too many NIF strings');const strings=Array.from({length:ns},()=>r.str());r.skip(r.u32()*4);
 const blocks=sizes.map((size,i)=>({type:types[ti[i]],buffer:r.slice(size)}));
 const shapes=[],nodes=new Map(),parents=new Map(),warnings=[];
 const partCache=new Map();
 function partition(id){
  if(partCache.has(id))return partCache.get(id);
  const block=blocks[id];if(!block||block.type!=='NiSkinPartition')throw Error('Missing skin partition');
  const q=new Reader(block.buffer),n=q.u32(),size=q.u32(),stride=q.u32();q.skip(8);
  if(!stride||size%stride||n>10000)throw Error('Unsupported skin partition');
  const verts=vertices(q,size/stride,stride),indices=[];
  for(let k=0;k<n;k++){
   const nv=q.u16(),nt=q.u16(),nb=q.u16(),strips=q.u16(),weights=q.u16();q.skip(nb*2);
   if(q.u8())q.skip(nv*2);if(q.u8())q.skip(nv*weights*4);
   const stripLengths=Array.from({length:strips},()=>q.u16());
   if(q.u8()){if(strips)q.skip(stripLengths.reduce((a,b)=>a+b,0)*2);else q.skip(nt*6);}
   if(q.u8())q.skip(nv*weights);q.skip(2+8);
   const tris=triangles(q,nt);for(const x of tris)indices.push(x);
  }
  const value={verts,indices:Uint16Array.from(indices)};partCache.set(id,value);return value;
 }
 blocks.forEach((block,id)=>{
  if(['NiNode','BSFadeNode'].includes(block.type)){
   try{const q=new Reader(block.buffer),transform=av(q);nodes.set(id,transform);const n=q.u32();if(n>100000)throw Error('Invalid child count');for(let j=0;j<n;j++)parents.set(q.i32(),id);}catch(e){warnings.push(e.message);}return;
  }
  if(!['BSTriShape','BSDynamicTriShape','BSSubIndexTriShape'].includes(block.type))return;
  try{
   const q=new Reader(block.buffer),transform=av(q);q.skip(16);const skin=q.i32(),shader=q.i32(),alpha=q.i32();const desc=q.u32();q.skip(4);const nt=q.u16(),nv=q.u16(),dataSize=q.u32();let geo;
   if(dataSize&&nv){const stride=(desc&15)*4;geo={verts:vertices(q,nv,stride),indices:triangles(q,nt)};}
   else if(skin>=0){const instance=blocks[skin];if(!instance)throw Error('Missing skin instance');const sr=new Reader(instance.buffer);sr.skip(4);geo=partition(sr.i32());}
   else return;
   if(block.type==='BSDynamicTriShape'&&nv&&q.p+4<=q.b.length){
    // Dynamic SSE shapes put their actual positions in a trailing Vector4 array.
    const particle=q.u32();if(particle)q.skip(nv*12+nt*6);
    if(q.p+4<=q.b.length){const bytes=q.u32();if(bytes===nv*16&&q.p+bytes<=q.b.length)for(let j=0;j<nv;j++){for(let a=0;a<3;a++)geo.verts[j*5+a]=q.f();q.skip(4);}}
   }
   const shape={...geo,name:strings[transform.name]||'Shape',transform,id,skin,texture:'',alpha:alpha>=0};
   if(shader>=0&&blocks[shader]?.type==='BSLightingShaderProperty'){
    const s=new Reader(blocks[shader].buffer);s.skip(4);net(s);s.skip(24);const tex=s.i32();
    if(blocks[tex]?.type==='BSShaderTextureSet'){const t=new Reader(blocks[tex].buffer);if(t.u32())shape.texture=t.str();}
   }
   shapes.push(shape);
  }catch(e){warnings.push((strings[new Reader(block.buffer).u32()]||block.type)+': '+e.message);}
 });
 // Apply hierarchy transforms for ordinary geometry. Skinned vertices are already
 // in the bind-pose coordinate frame used by SSE skin partitions.
 function transformPoint(x,y,z,t){return [t.scale*(t.m[0]*x+t.m[1]*y+t.m[2]*z)+t.t[0],t.scale*(t.m[3]*x+t.m[4]*y+t.m[5]*z)+t.t[1],t.scale*(t.m[6]*x+t.m[7]*y+t.m[8]*z)+t.t[2]];}
 for(const s of shapes){s.verts=s.verts.slice();if(s.skin<0){const chain=[s.transform];let p=parents.get(s.id),seen=new Set();while(nodes.has(p)&&!seen.has(p)){seen.add(p);chain.push(nodes.get(p));p=parents.get(p);}for(let i=0;i<s.verts.length;i+=5){let v=Array.from(s.verts.subarray(i,i+3));for(const t of chain)v=transformPoint(...v,t);s.verts.set(v,i);}}
  for(const index of s.indices)if(index>=s.verts.length/5)throw Error('Triangle references a missing vertex');
  s.body=/(^|[^a-z])(3ba|3bbb|cbbe|bhunp|uunp|body|basebody|femalebody|hands|feet)([^a-z]|$)/i.test(s.name)||/textures[\\/]actors[\\/]character/i.test(s.texture);
 }
 if(!shapes.length)throw Error('No supported triangle geometry found'+(warnings.length?': '+warnings[0]:''));
 return {shapes,warnings};
}
const norm=p=>p.replace(/\\/g,'/').replace(/^\/+/, '').toLowerCase();
function findAsset(files,path,prefix='meshes'){
 const target=norm(path).replace(new RegExp('^'+prefix+'/'),'');
 const matches=files.filter(f=>{const n=norm(f.path||f.webkitRelativePath||f.name);return n===target||n===prefix+'/'+target||n.endsWith('/'+prefix+'/'+target);});
 if(matches.length>1)throw Error('Multiple copies of '+path+'; choose the installed mod folder.');return matches[0];
}
async function modelFor(row,files){
 for(const m of row.previewModels||[]){const file=findAsset(files,m.path);if(file)return {...parseNif(await file.arrayBuffer()),kind:m.kind,path:m.path};}
 throw Error('Model not included. Load the full mod ZIP or folder.');
}
function dds(gl,buffer){
 const r=new Reader(buffer),v=r.v;if(v.getUint32(0,true)!==0x20534444)throw Error('Not a DDS texture');const h=v.getUint32(12,true),w=v.getUint32(16,true);if(w>16384||h>16384||!w||!h)throw Error('Unsupported DDS size');
 const four=v.getUint32(84,true);let format,offset=128;
 if(four===0x30315844){const dx=v.getUint32(128,true);offset=148;const ext=gl.getExtension('EXT_texture_compression_bptc');if((dx===98||dx===99)&&ext)format=ext.COMPRESSED_RGBA_BPTC_UNORM_EXT;}
 else{const ext=gl.getExtension('WEBGL_compressed_texture_s3tc');if(ext){if(four===0x31545844)format=ext.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(four===0x33545844)format=ext.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(four===0x35545844)format=ext.COMPRESSED_RGBA_S3TC_DXT5_EXT;}}
 if(!format)throw Error('DDS compression unsupported by this graphics device');const blockSize=(four===0x31545844)?8:16,n=Math.ceil(w/4)*Math.ceil(h/4)*blockSize;
 if(offset+n>buffer.byteLength)throw Error('Truncated DDS');
 const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.compressedTexImage2D(gl.TEXTURE_2D,0,format,w,h,0,new Uint8Array(buffer,offset,n));
 if(gl.getError()!==gl.NO_ERROR){gl.deleteTexture(t);throw Error('Graphics device rejected DDS texture');}
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;
}
async function viewer(canvas,model,files,onStatus=()=>{}){
 const gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL is unavailable');
 const vs=`attribute vec3 pos;attribute vec3 normal;attribute vec2 uv;uniform vec3 center;uniform float extent;uniform float aspect;uniform vec2 angle;uniform float zoom;varying vec3 N;varying vec2 UV;void main(){vec3 p=(pos-center)/extent;float a=angle.x,b=angle.y;mat3 rz=mat3(cos(a),-sin(a),0.,sin(a),cos(a),0.,0.,0.,1.);vec3 q=rz*p;vec3 n=rz*normal;vec3 t=vec3(q.x,q.y*cos(b)-q.z*sin(b),q.y*sin(b)+q.z*cos(b));N=vec3(n.x,n.y*cos(b)-n.z*sin(b),n.y*sin(b)+n.z*cos(b));UV=uv;gl_Position=vec4(t.x*zoom/aspect,t.z*zoom,-t.y*.3,1.);}`;
 const fs=`precision mediump float;varying vec3 N;varying vec2 UV;uniform sampler2D tex;uniform bool textured;uniform bool cutout;uniform vec3 color;void main(){vec4 c=textured?texture2D(tex,UV):vec4(color,1.);if(cutout&&c.a<.35)discard;float light=.35+.65*abs(dot(normalize(N),normalize(vec3(-.3,-.8,.6))));gl_FragColor=vec4(c.rgb*light,1.);}`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram(),sv=shader(gl.VERTEX_SHADER,vs),sf=shader(gl.FRAGMENT_SHADER,fs);gl.attachShader(program,sv);gl.attachShader(program,sf);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const uniforms={};for(const name of ['center','extent','aspect','angle','zoom','textured','cutout','color'])uniforms[name]=gl.getUniformLocation(program,name);
 const resources=[],messages=new Set(model.warnings),bodyMessages=new Set(),draws=[];let body=false,yaw=0,pitch=0,zoom=1.75,disposed=false;
 for(const shape of model.shapes){
  const n=shape.verts.length/5,normals=new Float32Array(n*3);
  for(let j=0;j<shape.indices.length;j+=3){const a=shape.indices[j],b=shape.indices[j+1],c=shape.indices[j+2],v=shape.verts;const x=[v[b*5]-v[a*5],v[b*5+1]-v[a*5+1],v[b*5+2]-v[a*5+2]],y=[v[c*5]-v[a*5],v[c*5+1]-v[a*5+1],v[c*5+2]-v[a*5+2]],cross=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];for(const k of [a,b,c])for(let l=0;l<3;l++)normals[k*3+l]+=cross[l];}
  for(let i=0;i<n;i++){const length=Math.hypot(...normals.subarray(i*3,i*3+3))||1;for(let j=0;j<3;j++)normals[i*3+j]/=length;}
  const buffer=gl.createBuffer(),nb=gl.createBuffer(),ib=gl.createBuffer();resources.push(buffer,nb,ib);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,shape.verts,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,normals,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,shape.indices,gl.STATIC_DRAW);
  let texture=null;if(shape.texture){try{const file=findAsset(files,shape.texture,'textures');if(!file)throw Error('Texture missing');texture=dds(gl,await file.arrayBuffer());}catch(e){(shape.body?bodyMessages:messages).add('Some materials shown untextured: '+e.message);}}
  draws.push({shape,buffer,nb,ib,texture});
 }
 function draw(){if(disposed)return;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.055,.075,.10,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);
  const active=draws.filter(d=>body||!d.shape.body);if(!active.length){onStatus('Only body geometry was found. Enable embedded body to inspect it.');return;}
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const d of active){const v=d.shape.verts;for(let i=0;i<v.length;i+=5)for(let j=0;j<3;j++){min[j]=Math.min(min[j],v[i+j]);max[j]=Math.max(max[j],v[i+j]);}}
  gl.uniform3fv(uniforms.center,min.map((m,i)=>(m+max[i])/2));gl.uniform1f(uniforms.extent,Math.max(...min.map((m,i)=>max[i]-m),1));gl.uniform1f(uniforms.aspect,canvas.width/canvas.height);gl.uniform2f(uniforms.angle,yaw,pitch);gl.uniform1f(uniforms.zoom,zoom);
  for(const d of active){
   const pos=gl.getAttribLocation(program,'pos'),uv=gl.getAttribLocation(program,'uv'),normal=gl.getAttribLocation(program,'normal');gl.bindBuffer(gl.ARRAY_BUFFER,d.buffer);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);gl.bindBuffer(gl.ARRAY_BUFFER,d.nb);gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,12,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,d.ib);gl.uniform1i(uniforms.textured,!!d.texture);gl.uniform1i(uniforms.cutout,d.shape.alpha);gl.uniform3f(uniforms.color,...(d.shape.body?[.52,.44,.38]:[.50,.77,.73]));if(d.texture)gl.bindTexture(gl.TEXTURE_2D,d.texture);gl.drawElements(gl.TRIANGLES,d.shape.indices.length,gl.UNSIGNED_SHORT,0);
  }
  const allMessages=[...messages,...(body?bodyMessages:[])];onStatus(allMessages.join(' · ')||(active.some(d=>!d.texture)?'Untextured geometry · material transparency is unavailable':'Textured model · drag to rotate, scroll to zoom'));
 }
 let last;canvas.onpointerdown=e=>{last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(last){yaw+=(e.clientX-last[0])*.015;pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-last[1])*.012));last=[e.clientX,e.clientY];draw();}};canvas.onpointerup=canvas.onpointercancel=()=>last=null;canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.5,Math.min(8,zoom*Math.exp(-e.deltaY*.001)));draw();};
 draw();
 return {setBody(value){body=value;draw();},reset(){yaw=pitch=0;zoom=1.75;draw();},dispose(){disposed=true;for(const x of resources)gl.deleteBuffer(x);for(const d of draws)if(d.texture)gl.deleteTexture(d.texture);gl.deleteProgram(program);gl.deleteShader(sv);gl.deleteShader(sf);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
root.KIDPreview={parseNif,modelFor,findAsset,viewer};
})(typeof module!=='undefined'?module.exports:globalThis);
