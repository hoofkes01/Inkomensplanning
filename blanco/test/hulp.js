// Start de app en open een klant: de eerste in de lijst, of een nieuwe als de lijst leeg is.
async function start(page, url, wacht) {
  await page.goto(url);
  await openKlant(page, wacht);
}
async function openKlant(page, wacht) {
  await page.waitForSelector(".kop");
  if (await page.locator('[data-scherm="klanten"]').count()) {
    if (await page.locator('[data-klant]').count()) await page.locator('[data-klant] [data-knop="klant-open"]').first().click();
    else { await page.click('[data-knop="nieuwe-klant"]'); await page.click('[data-knop="klant-maak"]'); }
  }
  await page.waitForSelector(wacht || ".kop small");
}
module.exports = { start, openKlant };
