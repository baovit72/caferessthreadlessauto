const utils = require("./utils");
async function run() {
  const browser = await utils.getPuppeteerBrowser();
  const page1 = await browser.newPage();
  const page2 = await browser.newPage();
  page1.goto("https://www.cafepress.com/");
  page2.goto("https://www.threadless.com/");
}
run();
