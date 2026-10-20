// Original tiny animated triangle, only for exercising the GLB pipeline.
export function makeGlb({ external = false, compressed = false, animated = true } = {}) {
  const floats = new Float32Array([-0.3, 0, 0, 0.3, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0.1, 0]);
  const binary = new Uint8Array(floats.buffer);
  const json = { asset: { version: '2.0', generator: 'NEON DODGE test fixture' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Robot', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: binary.length, ...(external ? { uri: 'https://example.com/model.bin' } : {}) }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 8 }, { buffer: 0, byteOffset: 44, byteLength: 24 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.3, 0, 0], max: [0.3, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 2, componentType: 5126, count: 2, type: 'VEC3' }],
    ...(animated ? { animations: ['Idle', 'Run', 'Dash', 'Hit', 'Death'].map(name => ({ name,
      samplers: [{ input: 1, output: 2, interpolation: 'LINEAR' }], channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }] })) } : {}),
    ...(compressed ? { extensionsUsed: ['KHR_draco_mesh_compression'] } : {}),
  };
  const encoded = new TextEncoder().encode(JSON.stringify(json)), padded = Math.ceil(encoded.length / 4) * 4;
  const bytes = new Uint8Array(12 + 8 + padded + 8 + binary.length), view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, bytes.length, true);
  view.setUint32(12, padded, true); view.setUint32(16, 0x4e4f534a, true); bytes.fill(32, 20, 20 + padded); bytes.set(encoded, 20);
  view.setUint32(20 + padded, binary.length, true); view.setUint32(24 + padded, 0x004e4942, true); bytes.set(binary, 28 + padded);
  return bytes.buffer;
}
