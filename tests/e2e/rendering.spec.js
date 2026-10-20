import { test, expect } from '@playwright/test';

test('96 projectiles render in one draw with identical triangle count and bounded resources', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/batch-fixture.html', route => route.fulfill({ contentType: 'text/html', body: `
    <canvas id="arena"></canvas><script type="module">
    import * as THREE from '/node_modules/three/build/three.module.js';
    import { createProjectileBatch } from '/src/rendering/projectileBatch.js';
    import { COMBAT } from '/src/config/combat.js';
    const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('arena')});
    renderer.setSize(640,480); const camera = new THREE.PerspectiveCamera(60,640/480,0.1,100);
    camera.position.set(0,20,20); camera.lookAt(0,0,0);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x071116);
    const threats = Array.from({length:96}, (_,i)=>({x:i%12-5.5,z:Math.floor(i/12)-3.5,
      previousX:i%12-5.5,previousZ:Math.floor(i/12)-3.5,kind:'bullet'}));
    const geometry = new THREE.SphereGeometry(COMBAT.projectileRadius,8,6), material = new THREE.MeshBasicMaterial({color:0xffba77});
    for(const b of threats){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(b.x,0.45,b.z);mesh.frustumCulled=false;scene.add(mesh);}
    renderer.render(scene,camera); const before={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
    scene.clear();geometry.dispose();material.dispose();
    const batch=createProjectileBatch(scene);batch.update(threats,1);renderer.render(scene,camera);
    const after={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
    const counts=[];
    for(let i=0;i<20;i++){batch.reset();renderer.render(scene,camera);batch.update(threats,1);renderer.render(scene,camera);counts.push(renderer.info.memory.geometries);}
    batch.dispose();renderer.render(scene,camera);
    window.__batch={before,after,counts,remaining:renderer.info.memory.geometries,children:scene.children.length};
    </script>` })) ;
  await page.goto('http://127.0.0.1:5181/batch-fixture.html');
  await page.waitForFunction(() => window.__batch);
  const result = await page.evaluate(() => window.__batch);
  expect(result.before.calls).toBe(96); expect(result.after.calls).toBe(1);
  expect(result.after.triangles).toBe(result.before.triangles);
  expect(result.after.triangles).toBeGreaterThan(0);
  expect(new Set(result.counts).size).toBe(1);
  expect(result.remaining).toBe(0); expect(result.children).toBe(0); expect(errors).toEqual([]);
});
