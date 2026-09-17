import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/#investment");
});

test("investment tool supports all modes, input validation and explicit import", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "先把自己的投資算清楚" })).toBeVisible();
  await page.getByLabel("目前金額", { exact: true }).fill("100000");
  await page.getByLabel("每月投入", { exact: true }).fill("1000");
  await page.getByLabel("年報酬假設", { exact: false }).fill("0");
  await page.getByLabel("試算年數").fill("1");
  await page.getByRole("button", { name: "目標需要每月投多少" }).click();
  await expect(page.getByText(/達到目標：現在每月共投入約/)).toBeVisible();
  await page.getByRole("button", { name: "領錢後還剩多少" }).click();
  await expect(page.getByText(/個月開始無法領足設定金額/)).toBeVisible();
  await page.getByLabel("試算年數").fill("-1");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "帶入退休規劃", exact: true })).toHaveCount(0);
  await page.getByLabel("試算年數").fill("1");
  await page.getByRole("button", { name: "帶入退休規劃", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.getByRole("heading", { name: "先把自己的投資算清楚" })).toBeVisible();
  await page.getByRole("button", { name: "帶入退休規劃", exact: true }).click();
  await page.getByRole("button", { name: "確認取代投資資料" }).click();
  await expect(page.getByLabel("目前市值")).toHaveValue("100000");
  await expect(page.locator(".holding-item").first().getByLabel("每月投入")).toHaveValue("1000");
});

test("multiple holdings and single deposits render without overflow", async ({ page }) => {
  await page.getByRole("button", { name: "新增股票／ETF" }).click();
  await expect(page.getByRole("group", { name: "第 2 筆投資" })).toBeVisible();
  await page.getByText("物價、投入調整與單筆加碼", { exact: true }).click();
  await page.getByLabel("單筆加碼金額", { exact: false }).fill("100000");
  await page.getByLabel("加碼年月").fill("2027-01");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByText("每年資產餘額（今天物價）", { exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
