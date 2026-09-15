import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("shows a complete result without page overflow", async ({ page, isMobile }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await page.reload();
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();

  await expect(page.getByRole("heading", { name: /目前準備|退休準備還差/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "三筆退休來源" })).toBeVisible();
  await expect(page.locator(".chart-line")).toHaveAttribute("d", /^M/);

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
  expect(browserErrors).toEqual([]);
});

test("updates the combined result when investment and pension choices change", async ({ page, isMobile }) => {
  await page.getByLabel("目前投資資產").fill("0");
  await page.getByLabel("每月持續投入").fill("0");
  await page.getByRole("button", { name: "按月領" }).click();
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();

  await expect(page.getByRole("heading", { name: /退休準備還差/ })).toBeVisible();
  await expect(page.getByText("開始時每月估算", { exact: true })).toBeVisible();
});

test("stops the calculation and explains an invalid value", async ({ page, isMobile }) => {
  await page.getByLabel("未來還會加保").fill("99");
  await expect(page.getByText("未來勞保年資不可超過距退休的時間。")).toBeVisible();
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();
  await expect(page.getByRole("heading", { name: "先完成左側資料" })).toBeVisible();
});
