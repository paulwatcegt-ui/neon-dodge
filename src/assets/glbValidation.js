export const MAX_GLB_BYTES = 30 * 1024 * 1024;
export function inspectGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) throw Error('文件不是有效的 GLB。');
  if (buffer.byteLength > MAX_GLB_BYTES) throw Error('模型超过 30 MB，请先优化后再导入。');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw Error('需要完整的 glTF 2.0 GLB 文件。');
  let json = null;
  for (let offset = 12; offset < buffer.byteLength;) {
    if (offset + 8 > buffer.byteLength) throw Error('GLB 数据块损坏。');
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
    if (length % 4 || offset + 8 + length > buffer.byteLength) throw Error('GLB 数据块长度不正确。');
    if (offset === 12 && type !== 0x4e4f534a) throw Error('GLB 缺少 JSON 数据块。');
    if (type === 0x4e4f534a) {
      try { json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset + 8, length))); }
      catch { throw Error('GLB 描述数据无法解析。'); }
    }
    offset += 8 + length;
  }
  if (!json || json.asset?.version !== '2.0') throw Error('模型需要使用 glTF 2.0。');
  for (const resource of [...(json.buffers || []), ...(json.images || [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw Error('请导出贴图与几何数据全部内嵌的单文件 GLB。');
  }
  const decoders = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu'];
  if ((json.extensionsUsed || []).some(e => decoders.includes(e))) throw Error('当前先支持未压缩 GLB；请导出不含 Draco、Meshopt 或 KTX2 压缩的版本。');
  return json;
}
