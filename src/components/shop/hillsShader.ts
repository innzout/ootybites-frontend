// The Nilgiri hills, generated.
//
// No .glb, no textures, no three.js — the whole hero is one fragment shader, so
// it costs a few kilobytes instead of a few megabytes and there is nothing to
// download before it paints. Ridge lines come from value-noise fbm; each range
// sits further back, paler and hazier, which is what actually sells depth in a
// hill landscape. Mist is the same noise scrolled sideways at two speeds.
//
// Colours are the brand palette, passed in as uniforms so the shader never
// hard-codes a hex and the art follows globals.css.

export const VERT = `#version 300 es
// One oversized triangle covers the viewport with no vertex buffer at all:
// gl_VertexID drives the position, so there is no geometry to upload or delete.
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAG = `#version 300 es
precision mediump float;

uniform vec2  u_res;
uniform float u_time;
uniform vec3  u_skyTop;
uniform vec3  u_skyLow;
uniform vec3  u_sun;
uniform vec3  u_hillFar;
uniform vec3  u_hillNear;

out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// Height of one ridge at horizontal position x. Layers differ only by seed,
// amplitude and base height, which is enough to read as distinct ranges.
float ridge(float x, float seed, float amp, float base) {
  float h = fbm(vec2(x * 1.6 + seed, seed * 0.7));
  h += 0.35 * fbm(vec2(x * 4.1 + seed * 2.0, seed));
  return base + (h - 0.6) * amp;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 sp = vec2(uv.x * aspect, uv.y);

  // --- sky: warm low band lifting into a pale top, with a soft sun bloom ---
  vec3 col = mix(u_skyLow, u_skyTop, smoothstep(0.05, 0.95, uv.y));
  float sun = 1.0 - distance(sp, vec2(aspect * 0.74, 0.78));
  col = mix(col, u_sun, smoothstep(0.62, 1.0, sun) * 0.55);

  // --- five ranges, far to near ---
  const int LAYERS = 5;
  for (int i = 0; i < LAYERS; i++) {
    float t = float(i) / float(LAYERS - 1);      // 0 = farthest, 1 = nearest
    float drift = u_time * (0.004 + 0.010 * t);  // parallax: near ranges slide faster
    float h = ridge(sp.x + drift, 7.3 * float(i) + 1.7, 0.16 + 0.20 * t, 0.62 - 0.34 * t);

    // Anti-aliased edge, one pixel wide in uv space.
    float edge = fwidth(uv.y) * 1.5;
    float mask = smoothstep(h + edge, h - edge, uv.y);

    vec3 hill = mix(u_hillFar, u_hillNear, t);
    // Far ranges keep some sky in them — that haze is the depth cue.
    hill = mix(hill, col, (1.0 - t) * 0.42);
    // Gentle vertical shading so each range is not a flat silhouette.
    hill *= 0.88 + 0.12 * smoothstep(h - 0.35, h, uv.y);

    col = mix(col, hill, mask);
  }

  // --- mist: two noise bands scrolling at different speeds, low in the frame ---
  float band = fbm(vec2(sp.x * 2.2 - u_time * 0.025, uv.y * 5.0 + u_time * 0.012));
  float band2 = fbm(vec2(sp.x * 3.7 + u_time * 0.018, uv.y * 7.0));
  float mist = smoothstep(0.42, 0.85, band * 0.65 + band2 * 0.45);
  mist *= smoothstep(0.62, 0.20, uv.y) * smoothstep(0.02, 0.16, uv.y);
  col = mix(col, u_skyTop, mist * 0.5);

  // --- grain, and a soft fade into the page below ---
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.022;
  float fadeOut = smoothstep(0.0, 0.14, uv.y);

  outColor = vec4(col, fadeOut);
}`;
