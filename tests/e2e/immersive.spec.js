import { test, expect } from '@playwright/test';
test('full-window scene fits the arena clear of floating HUD and toggles real fullscreen', async ({page}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1920,height:1080});await page.goto('./?diagnostics=1');
  await expect(page.getByRole('button',{name:/开始测试/})).toBeEnabled();
  await page.locator('#settings summary').click();await page.locator('#quality').selectOption('low');await page.locator('#settings summary').click();
  const graphics=await page.evaluate(()=>window.__ND.graphics());
  const f=graphics.framing;
  const canvas=await page.locator('#arena').boundingBox();
  expect(canvas).toMatchObject({x:0,y:0,width:1920,height:1080});
  const field={x:(f.left+1)/2*1920,y:(1-f.top)/2*1080,width:(f.right-f.left)/2*1920,height:(f.top-f.bottom)/2*1080};
  for(const selector of ['.topbar','.bottom-panel','.scene-note','.run-hud','.survival-clock']){
    const box=await page.locator(selector).boundingBox();
    expect(box.x+box.width<=field.x||box.x>=field.x+field.width||box.y+box.height<=field.y||box.y>=field.y+field.height).toBe(true);
  }
  if(await page.evaluate(()=>document.fullscreenEnabled)){
    await page.locator('#fullscreen').click();await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed','true');
    await page.locator('#fullscreen').click();await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed','false');
  }
  for(const [width,height]of [[1600,900],[1366,768],[844,390]]){
    await page.setViewportSize({width,height});
    const area=await page.locator('#arena').boundingBox(),bottom=await page.locator('.bottom-panel').boundingBox();
    expect(area).toMatchObject({x:0,y:0,width,height});expect(bottom.y+bottom.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:1920,height:1080});
  await page.getByRole('button',{name:/开始测试/}).click();
  await page.screenshot({path:'test-results/immersive-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  const narrow=await page.locator('#arena').boundingBox(),footer=await page.locator('.bottom-panel').boundingBox();
  expect(narrow).toMatchObject({x:0,y:0,width:390,height:844});expect(footer.y+footer.height).toBeLessThanOrEqual(844);
  await page.screenshot({path:'test-results/immersive-narrow.png'});expect(errors).toEqual([]);
});

test('central survival clock advances with simulation and freezes while paused', async ({page}) => {
  await page.goto('./?diagnostics=1');
  await expect(page.getByRole('button',{name:/开始测试/})).toBeEnabled();
  await expect(page.locator('.survival-clock')).toBeVisible();
  await expect(page.locator('#time-value')).toHaveText('00:00');
  await page.locator('#settings summary').click();
  await page.locator('#quality').selectOption('low');
  await page.locator('#settings summary').click();
  await page.waitForTimeout(600);
  await page.getByRole('button',{name:/开始测试/}).click();
  await expect.poll(()=>page.evaluate(()=>window.__ND.snapshot().tick)).toBeGreaterThanOrEqual(60);
  await page.keyboard.press('Escape');
  await expect(page.locator('#timer-status')).toHaveText('已暂停');
  const frozen=await page.locator('#time-value').textContent();
  await page.waitForTimeout(400);
  await expect(page.locator('#time-value')).toHaveText(frozen);
});
