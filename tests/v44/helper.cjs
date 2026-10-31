const h=require('../v42/verify-helpers.cjs');
async function authorize(page,password='Admin2026'){await h.goto(page,'actual','index.html');await page.locator('.ops-brand').focus();await page.keyboard.press('Control+m');await page.locator('#adminAccessDialog').waitFor({state:'visible'});await page.locator('#adminAccessPassword').fill(password);await page.locator('#adminAccessSubmit').click();await page.waitForURL('**/administracion.html');await page.waitForFunction(()=>document.documentElement.classList.contains('auth-ready'));}
module.exports={...h,authorize};
