import {test,expect} from '@playwright/test';
import {guides} from '../../src/config/seo';
test('production routes are pre-rendered, canonical and usable without JavaScript',async({browser,request})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  for(const guide of guides){const response=await page.goto(`http://127.0.0.1:4173/${guide.slug}`);expect(response?.status()).toBe(200);await expect(page.getByRole('heading',{name:guide.title,exact:true})).toBeVisible();await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href',`https://drawgon.in/${guide.slug}`);expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('Drawgon');await expect(page.locator('.guide-example img')).toBeVisible();}
  const sitemap=await request.get('http://127.0.0.1:4173/sitemap.xml');expect(sitemap.status()).toBe(200);expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(10);
  const robots=await request.get('http://127.0.0.1:4173/robots.txt');expect(await robots.text()).toContain('Sitemap: https://drawgon.in/sitemap.xml');await context.close();
});
test('production application boots without console errors and guide CTA selects the type',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:4173/uml-diagram-maker');await expect(page.getByRole('heading',{name:'AI UML Diagram Maker',exact:true})).toBeVisible();await page.getByRole('button',{name:'Create your diagram',exact:true}).click();await expect(page.getByRole('heading',{name:'Connect Gemini',exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('project_diagram_ai_session')||'{}').selected)).toEqual(['uml-class']);expect(errors).toEqual([]);
});
