const axios = require("axios");
const utils = require("./utils");

const fs = require("fs");

const {
  CAFEPRESS_EMAIL,
  CAFEPRESS_PASSWORD,
  THREADLESS_USERNAME,
  THREADLESS_PASSWORD,
} = require("./config");

const PAGE_URL_CAFEPRESS = {
  upload_image:
    "https://www.cafepress.com/seller/designs/upload?pageOrigin=MyDesigns",
};
const PAGE_URL_THREADLESS = {
  upload_image:
    "https://www.threadless.com/profile/artist_dashboard/artist-shop/products/create/",
};

async function run() {
  const browser = await utils.getPuppeteerBrowser();
  const page = await browser.newPage();

  /**
   * HELPER
   */
  function getProfileId(profileUrl) {
    //https://www.cafepress.com/profile/147391463
    return +profileUrl.replace("https://www.cafepress.com/profile/", "");
  }
  async function waitThenGetElement(selector, unique) {
    await page.waitForSelector(selector, { timeout: 60000 });
    await utils.sleep(2000);
    if (unique) {
      return await page.$(selector);
    }
    return await page.$$(selector);
  }
  async function typeToInput(selector, text) {
    await waitThenGetElement(selector);
    await page.type(selector, text, { delay: 50 });
  }
  async function evalScript(selector, evalCb) {
    await waitThenGetElement(selector);
    return await page.$eval(selector, evalCb);
  }
  function pushProducts(pId, mId, recommendations) {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams();
      params.append("imageNo", pId);
      params.append("memberNo", mId);
      for (let r of recommendations) {
        params.append("merchandiseUrls[]", r.Url);
      }
      fetch(
        "https://members.cafepress.com/s/productinfo/createproductsforrecommendationsandsuggestionsrestful",
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            pragma: "no-cache",
            "sec-ch-ua":
              '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-newrelic-id": "UgAHVF5TGwUDVlJTBwU=",
            "x-requested-with": "XMLHttpRequest",
          },
          referrer: `https://members.cafepress.com/editdesign/${pId}?source=designDetails`,
          referrerPolicy: "strict-origin-when-cross-origin",
          body: params,
          method: "POST",
          mode: "cors",
          credentials: "include",
        }
      )
        .then((response) => response.json())
        .then((data) => resolve(data));
    });
  }
  function fetchProducts(pId) {
    return new Promise((resolve, reject) => {
      fetch(
        `https://members.cafepress.com/m/memberdesigns/getproductsbydepartments?imageno=${pId}`,
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            pragma: "no-cache",
            "sec-ch-ua":
              '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-newrelic-id": "UgAHVF5TGwUDVlJTBwU=",
            "x-requested-with": "XMLHttpRequest",
          },
          referrer: `https://members.cafepress.com/editdesign/${pId}?source=designDetails`,
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        }
      )
        .then((response) => response.json())
        .then((data) => resolve(data.ProductsByDepartments));
    });
  }

  function fetchRecommendations(pId, ids) {
    return new Promise((resolve, reject) => {
      fetch(
        `https://members.cafepress.com/s/productinfo/getproductrecommendationsandsuggestionsforimagenorestful?imageNo=${pId}&productTypeNos=${ids}`,
        {
          headers: {
            accept: "application/json, text/javascript, */*; q=0.01",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            pragma: "no-cache",
            "sec-ch-ua":
              '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-newrelic-id": "UgAHVF5TGwUDVlJTBwU=",
            "x-requested-with": "XMLHttpRequest",
          },
          referrer: `https://members.cafepress.com/editdesign/${pId}?source=designDetails`,
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        }
      )
        .then((response) => response.json())
        .then((data) => resolve(data.Suggestions));
    });
  }
  /**
   * FLOW
   */
  async function uploadThreadless(title, description, tag, image) {
    await page.goto(PAGE_URL_THREADLESS.upload_image);
    await utils.sleep(2000);
    if (page.url().includes("login")) {
      await typeToInput("#id_username", THREADLESS_USERNAME);
      await typeToInput("#id_password", THREADLESS_PASSWORD);
      await (
        await waitThenGetElement("input[name='login_threadless']", true)
      ).click();
    }

    await typeToInput("#id_title", title);
    const imgInput = await waitThenGetElement(
      "#product_image_ajax_upload input[type='file'].not-ie",
      true
    );
    await imgInput.uploadFile(image);
    await waitThenGetElement(".as-design-thumb");
    await waitThenGetElement("input#id_design_bg_color");
    await page.evaluate(() => {
      document.querySelector("input#id_design_bg_color").value = "#000000";
    });
    await (await waitThenGetElement("#id_nsfw_1", true)).click();
    await page.evaluate(() => {
      const selectors = [
        "bucket_checkboxes",
        "mens_checkboxes",
        "womens_checkboxes",
        "kids_checkboxes",
        "home_checkboxes",
        "accessories_checkboxes",
      ];
      selectors.forEach((s) =>
        document.querySelector(`a[data-manage-select-all="${s}"]`).click()
      );
    });
    await utils.sleep(2000);
    await (await waitThenGetElement("#id_design_ownership", true)).click();
    await utils.sleep(5000);
    await waitThenGetElement("#createProductSubmit");
    await page.evaluate(() => {
      document.querySelector("#createProductSubmit").click();
    });
    await utils.sleep(1000);
    await typeToInput("#id_description", description);
    await typeToInput("#id_meta_description", description);
    await typeToInput("#id_tags", tag);
    await (
      await waitThenGetElement("a[data-product-update='addtag']", true)
    ).click();
    await utils.sleep(2000);
    await (await waitThenGetElement("#designPublishToggle", true)).click();
  }
  async function uploadCafePress(title, description, tag, image) {
    console.log(title, description, tag, image);
    await page.goto(PAGE_URL_CAFEPRESS.upload_image);
    await utils.sleep(2000);
    if (page.url().includes("login")) {
      await typeToInput("#loginEmail", CAFEPRESS_EMAIL);
      await typeToInput("#loginPassword", CAFEPRESS_PASSWORD);
      await (await waitThenGetElement("#btnSignin", true)).click();
    }
    const imgInput = await waitThenGetElement("#uploadImage", true);
    await imgInput.uploadFile(image);
    await typeToInput("#designDisplayName", title);
    await typeToInput("#designDescription", description);
    await typeToInput("#designSearchTags", tag);
    await (await waitThenGetElement(".btn-add-tag", true)).click();
    await evalScript("input[value='1']", (elem) => elem.click());
    await (
      await waitThenGetElement("#title-actions-wrap button.btn-cp-green", true)
    ).click();
    const pId = await evalScript(".dm-img-wrap > div", (elem) =>
      elem.getAttribute("data")
    );

    const mId = getProfileId(
      await evalScript("#b_ghlink_profile > a", (elem) =>
        elem.getAttribute("href")
      )
    );
    console.log(pId, mId);

    const products = await page.evaluate(fetchProducts, pId);
    const productIds = [];
    for (let p of products) {
      for (let t of p.merchandiseTypes) {
        if (!p.memberProductTypeIds.includes(t.Id)) productIds.push(t.Id);
      }
    }
    console.log("fetch recommendations");
    const recommendations = await page.evaluate(
      fetchRecommendations,
      pId,
      productIds.join(",")
    );
    console.log(recommendations);

    console.log("push products");
    await page.evaluate(pushProducts, pId, mId, recommendations);
  }

  const data_rows = utils.deepClone(await utils.readCsv("data.csv"));
  // .filter(
  //   (item) =>
  //     Object.keys(item) &&
  //     item.title &&
  //     item.description &&
  //     item.tag &&
  //     item.image
  // );
  console.log(data_rows);
  for (let row of data_rows) {
    console.log(row, row.title);
    await utils.sleep(60000);
    try {
      await uploadCafePress(row.title, row.description, row.tag, row.image);
      row.upload_cafepress = "TRUE";
    } catch (e) {
      fs.appendFile("error.txt", e.toString(), () => {});
      row.upload_cafepress = "FALSE";
    }
    try {
      await uploadThreadless(row.title, row.description, row.tag, row.image);
      row.upload_threadless = "TRUE";
    } catch (e) {
      fs.appendFile("error.txt", e.toString(), () => {});
      row.upload_threadless = "FALSE";
    }
  }
  browser.close();
  utils.writeCsv("output.csv", data_rows);
}

run();
