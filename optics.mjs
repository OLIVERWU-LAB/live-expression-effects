export const personRimGain=style=>style==='flat'?0:style==='cinema'?1.6:style==='gift'?1.7:1;
import {fireworkLights} from './lighting.mjs?v=fe7620d58eeb';
// Independent WebGL composition: base camera, transparent VFX and a low-resolution
// person matte. No camera readback; no images leave this browser.
const vertex = `attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=vec2(aPosition.x*.5+.5,.5-aPosition.y*.5);gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 vUV;
uniform sampler2D uBase,uFX,uMask;
uniform vec2 uResolution;
uniform float uNight,uTime,uDigital,uWater,uRimGain;

uniform vec4 uLights[5];uniform vec3 uColors[5];
vec3 background(vec2 uv){
  vec2 sampleUV=uv;
  float depth=(uv.y*uResolution.y-(uResolution.y-uWater))/max(1.,uWater);
  if(uDigital>.5&&depth>0.){sampleUV.x+=sin(uv.y*110.+uTime*.0018)*.002*min(1.,depth*5.);sampleUV.y+=sin(uv.x*75.+uTime*.0012)*.0015;}
  vec3 c=texture2D(uBase,clamp(sampleUV,vec2(.001),vec2(.999))).rgb;
  // Neutral black exposure only; preserve camera hue and readable faces.
  c*=1.-.32*uNight;
  float m=texture2D(uMask,uv).r;
  vec2 nearStep=vec2(3.5)/uResolution,wideStep=vec2(mix(6.,7.,uDigital))/uResolution;
  float le=texture2D(uMask,uv-vec2(nearStep.x,0.)).r,ri=texture2D(uMask,uv+vec2(nearStep.x,0.)).r;
  float up=texture2D(uMask,uv-vec2(0.,nearStep.y)).r,dn=texture2D(uMask,uv+vec2(0.,nearStep.y)).r;
  float wl=texture2D(uMask,uv-vec2(wideStep.x,0.)).r,wr=texture2D(uMask,uv+vec2(wideStep.x,0.)).r;
  float wu=texture2D(uMask,uv-vec2(0.,wideStep.y)).r,wd=texture2D(uMask,uv+vec2(0.,wideStep.y)).r;
  float tight=clamp((m-(le+ri+up+dn)*.25)*3.2,0.,1.);
  float broad=clamp((m-(wl+wr+wu+wd)*.25)*2.2,0.,1.);
  float outside=clamp((wl+wr+wu+wd)*.25-m,0.,1.);
  vec2 normal=vec2(wl-wr,wu-wd);normal/=max(length(normal),.001);
  vec3 chroma=vec3(0.);float energy=0.,chromaWeight=0.;
  for(int i=0;i<5;i++){
    vec4 light=uLights[i];vec2 delta=(light.xy-uv)*uResolution;
    float distance=length(delta)/uResolution.y;
    float attenuation=light.w/(1.+pow(distance/.65,2.))*min(1.,uNight*2.);
    float facing=max(.06,dot(normal,delta/max(length(delta),.01)));
    float rim=(tight*.90+broad*.30)*facing;
    float strength=attenuation*(rim+m*.020+outside*.025)*mix(.75,1.,uDigital)*uRimGain;
    // Strongest directional reflections keep their hue; complementary sources
    // must not sum into an all-white contour. Cubic weights blend continuously.
    float weight=strength*strength*strength;
    chroma+=pow(uColors[i],vec3(2.2))*weight;chromaWeight+=weight;energy+=strength;
  }
  chroma/=max(chromaWeight,.000001);
  chroma/=max(.001,max(chroma.r,max(chroma.g,chroma.b)));
  // One scalar controls exposure. Per-channel limiting used to wash colours out.
  float reflected=1.-exp(-energy*1.05);
  c=mix(c,c*.40+chroma*.78,reflected);
  vec2 q=(uv-.5)*vec2(uResolution.x/uResolution.y,1.);
  return c*(1.-uNight*.035*smoothstep(.2,1.,length(q)));
}
vec3 scene(vec2 uv){vec4 fx=texture2D(uFX,clamp(uv,vec2(.001),vec2(.999)));return background(uv)*(1.-fx.a)+fx.rgb;}
void main(){
 vec2 uv=vUV;vec3 col=scene(uv);
 // Exposure and vignette are applied only to the camera, before VFX composition.
 float noise=fract(sin(dot(uv*uResolution+uTime*.013,vec2(12.9898,78.233)))*43758.5453);
 col+=(noise-.5)*.008*uDigital;
 gl_FragColor=vec4(col,1.);
}`;
export class Optics {
 constructor(canvas) {
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!this.gl)throw new Error('WebGL unavailable');const gl=this.gl;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(this.program,'aPosition');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  this.uniforms={};for(const n of ['uBase','uFX','uMask','uResolution','uNight','uTime','uDigital','uWater','uRimGain','uLights[0]','uColors[0]'])this.uniforms[n]=gl.getUniformLocation(this.program,n);
  this.textures=Array.from({length:3},(_,i)=>{gl.activeTexture(gl.TEXTURE0+i);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;});
  gl.uniform1i(this.uniforms.uBase,0);gl.uniform1i(this.uniforms.uFX,1);gl.uniform1i(this.uniforms.uMask,2);
  this.lights=new Float32Array(5*4);this.colors=new Float32Array(5*3);this.lost=false;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;canvas.hidden=true;canvas.previousElementSibling.hidden=false;});
 }
 resize(w,h,dpr){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 render(base,fx,mask,world,{night,time,width,height,colors,lights=fireworkLights(world)}){
  if(this.lost)return false;const gl=this.gl;gl.useProgram(this.program);
  [base,fx,mask].forEach((source,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,i===1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);});
  this.lights.fill(0);this.colors.fill(0);
  lights.slice(0,5).forEach((light,i)=>{this.lights.set([light.x/width,light.y/height,0,light.energy],i*4);this.colors.set(light.color||colors[light.variant],i*3);});
  gl.uniform2f(this.uniforms.uResolution,width,height);gl.uniform1f(this.uniforms.uNight,night);gl.uniform1f(this.uniforms.uTime,time);gl.uniform1f(this.uniforms.uDigital,['cinema','glow'].includes(world.style)?1:0);gl.uniform1f(this.uniforms.uWater,world.water.level);gl.uniform1f(this.uniforms.uRimGain,personRimGain(world.style));
  gl.uniform4fv(this.uniforms['uLights[0]'],this.lights);gl.uniform3fv(this.uniforms['uColors[0]'],this.colors);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return true;
 }
}
