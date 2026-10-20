import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamera } from '../../src/rendering/camera.js';
import { playfieldRect } from '../../src/rendering/playfield.js';
test('full-window camera keeps every boundary inside the floating HUD safe region at all aspect ratios', () => {
  const rig = createCamera(), direction = rig.camera.quaternion.clone();
  for (const [width, height] of [[1920,1080],[1600,900],[1366,768],[1440,1000],[844,390],[390,844],[390,440]]) {
    const rect = playfieldRect(width,height); rig.resize(width,height,rect);
    const b = rig.framing();
    assert.ok(b.left > -1 && b.right < 1 && b.bottom > -1 && b.top < 1);
    const left=(b.left+1)/2*width,right=(b.right+1)/2*width,top=(1-b.top)/2*height,bottom=(1-b.bottom)/2*height;
    assert.ok(left >= rect.x && right <= rect.x+rect.width && top >= rect.y && bottom <= rect.y+rect.height);
    assert.ok(Math.max((right-left)/rect.width,(bottom-top)/rect.height)>0.85);
    assert.ok(rig.camera.quaternion.equals(direction));
  }
});
