import {
  Mesh, MeshGeometry, Shader, compileHighShaderGlProgram, compileHighShaderGpuProgram,
  localUniformBit, localUniformBitGl, roundPixelsBit, roundPixelsBitGl,
} from 'pixi.js';

// MaimaiColorEffect uses the original sprite UV for both the radial fade and the
// hue. Only the texture lookup uses packed atlas coordinates. Pixi samples PMA.
const gl = {
  name: 'hanabi',
  fragment: {
    header: `
      uniform sampler2D uTexture;
      uniform vec4 uAtlas;
      uniform vec2 uFire;
    `,
    main: `
      vec4 texel = texture(uTexture, vUV * uAtlas.xy + uAtlas.zw);
      vec2 p = vec2(vUV.x - 0.5, 0.5 - vUV.y);
      float radius = min(4.0 * dot(p, p), 1.0) * uFire.x;
      float opacity = uFire.x * clamp((radius - 0.018) / 0.036, 0.0, 1.0)
                              * clamp((0.429 - radius) / 0.069, 0.0, 1.0);
      float angle = atan(p.y, p.x);
      angle = (angle + step(angle, 0.0) * 6.28318) / 6.28;
      float hue = ceil(fract(angle * 3.0 + uFire.y) * 5.0) / 5.0;
      vec3 rgb = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      rgb = rgb * rgb * (3.0 - 2.0 * rgb);
      outColor = texel * vec4(mix(vec3(1.0), rgb, 0.545), 1.0) * opacity;
    `,
  },
};
const gpu = {
  name: 'hanabi',
  fragment: {
    header: `
      struct FireUniforms { uAtlas: vec4<f32>, uFire: vec2<f32> }
      @group(2) @binding(0) var uTexture: texture_2d<f32>;
      @group(2) @binding(1) var uSampler: sampler;
      @group(2) @binding(2) var<uniform> fireUniforms: FireUniforms;
    `,
    main: `
      let atlas = fireUniforms.uAtlas;
      let fire = fireUniforms.uFire;
      let texel = textureSample(uTexture, uSampler, vUV * atlas.xy + atlas.zw);
      let p = vec2<f32>(vUV.x - 0.5, 0.5 - vUV.y);
      let radius = min(4.0 * dot(p, p), 1.0) * fire.x;
      let opacity = fire.x * clamp((radius - 0.018) / 0.036, 0.0, 1.0)
                           * clamp((0.429 - radius) / 0.069, 0.0, 1.0);
      let a = atan2(p.y, p.x);
      let angle = (a + select(0.0, 6.28318, a <= 0.0)) / 6.28;
      let hue = ceil(fract(angle * 3.0 + fire.y) * 5.0) / 5.0;
      let rgb = clamp(abs((hue * 6.0 + vec3<f32>(0.0, 4.0, 2.0)) % 6.0 - 3.0) - 1.0, vec3<f32>(0.0), vec3<f32>(1.0));
      let color = rgb * rgb * (3.0 - 2.0 * rgb);
      outColor = texel * vec4<f32>(mix(vec3<f32>(1.0), color, 0.545), 1.0) * opacity;
    `,
  },
};

export function createHanabiRays(texture) {
  const { trim, orig, frame, source } = texture;
  const l = trim.x, t = trim.y, r = l + trim.width, b = t + trim.height;
  const corners = [l, t, r, t, r, b, l, b];
  const geometry = new MeshGeometry({
    positions: Float32Array.from(corners, (v, i) => v - (i % 2 ? orig.height : orig.width) / 2),
    uvs: Float32Array.from(corners, (v, i) => v / (i % 2 ? orig.height : orig.width)),
  });
  const shader = new Shader({
    glProgram: compileHighShaderGlProgram({ name: 'hanabi', bits: [localUniformBitGl, roundPixelsBitGl, gl] }),
    gpuProgram: compileHighShaderGpuProgram({ name: 'hanabi', bits: [localUniformBit, roundPixelsBit, gpu] }),
    resources: {
      uTexture: source, uSampler: source.style,
      fireUniforms: {
        uAtlas: { type: 'vec4<f32>', value: new Float32Array([
          orig.width / source.width, orig.height / source.height,
          (frame.x - l) / source.width, (frame.y - t) / source.height,
        ]) },
        uFire: { type: 'vec2<f32>', value: new Float32Array(2) },
      },
    },
  });
  return new Mesh({ geometry, shader, texture, visible: false });
}
