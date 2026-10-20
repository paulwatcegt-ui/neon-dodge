import { test, expect } from '@playwright/test';
test('desktop viewport expands the arena, keeps persistent HUD outside it and toggles real fullscreen', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1920,height:1080});await page.goto('./?diagnostics=1');
  await expect(page.getByRole('button',{name:/开始测试/})).toBeEnabled();
  await page.locator('#settings summary').click();await page.locator('#quality').selectOption('low');await page.locator('#settings summary').click();
  const graphics=await page.evaluate(()=>window.__ND.graphics());
  const f=graphics.framing;expect(Math.max(f.right-f.left,f.top-f.bottom)/2).toBeGreaterThanOrEqual(0.75);
  const canvas=await page.locator('#arena').boundingBox();
  for(const selector of ['.topbar','.bottom-panel','.scene-note','.run-hud','.enemy-legend']){
    const box=await page.locator(selector).boundingBox();
    expect(box.x+box.width<=canvas.x||box.x>=canvas.x+canvas.width||box.y+box.height<=canvas.y||box.y>=canvas.y+canvas.height).toBe(true);
  }
  if(await page.evaluate(()=>document.fullscreenEnabled)){
    await page.locator('#fullscreen').click();await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed','true');
    await page.locator('#fullscreen').click();await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed','false');
  }
  for(const [width,height]of [[1600,900],[1366,768],[844,390]]){
    await page.setViewportSize({width,height});
    const area=await page.locator('#arena').boundingBox(),bottom=await page.locator('.bottom-panel').boundingBox();
    expect(area.y+area.height).toBeLessThanOrEqual(bottom.y);expect(bottom.y+bottom.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:1920,height:1080});
  await page.getByRole('button',{name:/开始测试/}).click();
  await page.screenshot({path:'test-results/immersive-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  const narrow=await page.locator('#arena').boundingBox(),footer=await page.locator('.bottom-panel').boundingBox();
  expect(narrow.y+narrow.height).toBeLessThanOrEqual(footer.y);
  await page.screenshot({path:'test-results/immersive-narrow.png'});expect(errors).toEqual([]);
});
