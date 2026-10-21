import type { Renderer } from './model';

const vertex = `#version 300 es
precision highp float;
layout(location=0) in vec2 position;
layout(location=1) in float depth;
layout(location=2) in float alpha;
layout(location=3) in float size;
uniform vec2 viewport;
uniform float ratio;
uniform float maxSize;
out float z;
out float strength;
void main() {
  gl_Position = vec4(position / viewport * vec2(2.,-2.) + vec2(-1.,1.),0.,1.);
  gl_PointSize = min(maxSize,size * ratio);
  z = depth; strength = alpha;
}`;
const fragment = `#version 300 es
precision highp float;
in float z;
in float strength;
uniform vec3 colour;
out vec4 outputColour;
void main() {
  float r = length(gl_PointCoord * 2. - 1.);
  if (r >= 1.) discard;
  float core = .09 + z * .055;
  float glow = r < core ? mix(1.,.98,r/core) : r < core*2. ? mix(.98,.25,(r-core)/core) : r < .62 ? mix(.25,.055,(r-core*2.)/(.62-core*2.)) : mix(.055,0.,(r-.62)/.38);
  vec3 light = mix(colour,vec3(1.),(1.-z)*.32);
  light = mix(mix(light,vec3(1.),z*z*.78),light,smoothstep(core,core*2.,r));
  outputColour = vec4(light,glow * strength);
}`;

export function webglRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  if (!gl) return null;
  function shader(type: number, source: string) {
    const item = gl?.createShader(type);
    if (!item || !gl) return null;
    gl.shaderSource(item, source); gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) { gl.deleteShader(item); return null; }
    return item;
  }
  const vs = shader(gl.VERTEX_SHADER, vertex);
  const fs = shader(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  const buffer = gl.createBuffer();
  if (!buffer) { gl.deleteProgram(program); return null; }
  const viewport = gl.getUniformLocation(program, 'viewport');
  const ratioUniform = gl.getUniformLocation(program, 'ratio');
  const colourUniform = gl.getUniformLocation(program, 'colour');
  const maxSize = gl.getUniformLocation(program, 'maxSize');
  const pointSizes: Float32Array = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  gl.useProgram(program);
  gl.uniform1f(maxSize, pointSizes[1] ?? 64);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const attributes: [number, number, number][] = [[0, 2, 0], [1, 1, 8], [2, 1, 12], [3, 1, 16]];
  for (const [location, size, offset] of attributes) {
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 20, offset);
  }
  gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);
  return {
    kind: 'webgl2',
    resize(width, height, ratio) {
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program); gl.uniform2f(viewport, width, height); gl.uniform1f(ratioUniform, ratio);
    },
    draw(points, count, colour) {
      gl.useProgram(program); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform3f(colourUniform, colour[0] / 255, colour[1] / 255, colour[2] / 255);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, points.subarray(0, count * 5), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.POINTS, 0, count);
    },
    dispose() { gl.deleteBuffer(buffer); gl.deleteProgram(program); },
  };
}
