import { expect, test } from "@playwright/test";

for (const hash of ["#income", "#cashflow"]) test(`${hash} is an independent tool`, async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`/${hash}`);
  await expect(page.getByRole("navigation", { name: "試算工具" })).toBeVisible();
  if (hash === "#income") {
    await expect(page.getByRole("heading", { name: "只看退休後有哪些收入" })).toBeVisible();
    await expect(page.getByText("本頁不計算投資餘額")).toBeVisible();
    await expect(page.getByRole("list")).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "只看退休後資產夠不夠用" })).toBeVisible();
    await expect(page.getByText("不重新計算勞保或投資累積")).toBeVisible();
    await page.getByLabel("每月由資產支付").fill("100000");
    await expect(page.getByText(/開始不足|規劃期間內尚未用完/)).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
