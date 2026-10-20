import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamera } from '../../src/rendering/camera.js';
import { playfieldRect } from '../../src/rendering/playfield.js';
test('fixed 2.5D framing fits every boundary, uses 75–85% of a desktop playfield axis and reserves HUD rails', () => {
  const rig = createCamera(), direction = rig.camera.quaternion.clone();
  for (const [width, height] of [[1920,1080],[1600,900],[1366,768],[1440,1000],[844,390],[390,844],[390,440]]) {
    const rect = playfieldRect(width,height); rig.resize(rect.width,rect.height);
    const b = rig.framing(), occupancy = Math.max(b.right-b.left,b.top-b.bottom)/2;
    assert.ok(b.left > -1 && b.right < 1 && b.bottom > -1 && b.top < 1);
    if (width >= 1100) assert.ok(occupancy >= 0.75 && occupancy <= 0.85);
    assert.ok(rect.x >= 0 && rect.y >= 52 && rect.x+rect.width <= width && rect.y+rect.height <= height-78);
    assert.ok(rig.camera.quaternion.equals(direction));
  }
});
