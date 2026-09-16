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
  await expect(page.getByRole("heading", { name: "退休第一個月，錢夠不夠用" })).toBeVisible();
  await expect(page.locator(".cashflow-card").nth(0)).toContainText("$50,000");
  await expect(page.locator(".cashflow-card").nth(1)).toContainText("$28,100");
  await expect(page.locator(".cashflow-card").nth(2)).toContainText("$21,900");
  await expect(page.getByRole("heading", { name: "退休準備分開看" })).toBeVisible();
  await expect(page.locator(".chart-line")).toHaveAttribute("d", /^M/);

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasOverflow).toBe(false);
  expect(browserErrors).toEqual([]);
});

test("updates the combined result when investment and pension choices change", async ({ page, isMobile }) => {
  await page.getByLabel("目前市值").fill("0");
  await page.locator(".holding-item").first().getByLabel("每月投入").fill("0");
  await page.getByRole("button", { name: "按月領" }).click();
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();

  await expect(page.getByRole("heading", { name: /退休準備還差/ })).toBeVisible();
  await expect(page.getByText("開始時每月估算", { exact: true })).toBeVisible();
});

test("offers a clear choice for reinvesting a lump-sum labor pension", async ({ page }) => {
  await page.getByRole("button", { name: "一次領" }).click();
  const reinvestField = page.locator(".lump-reinvest-control").locator("input[type=number]");
  await expect(reinvestField).toHaveValue("100");
  await page.getByRole("button", { name: "投入一半" }).click();
  await expect(reinvestField).toHaveValue("50");
  await expect(page.getByText("未投入的部分會先當退休現金，有需要時再拿來支付生活費")).toBeVisible();
});

test("adds separate investments and offers a simple retirement allocation", async ({ page }) => {
  await expect(page.locator(".brand-note")).toContainText("0050 Life");
  await page.getByRole("button", { name: "新增一筆投資" }).click();
  await page.getByLabel("第 2 筆投資名稱").fill("006208");
  await page.getByLabel("目前市值").nth(1).fill("300000");
  await page.locator(".holding-item").nth(1).getByLabel("每月投入").fill("5000");
  await page.getByText("更多投資假設", { exact: true }).click();
  await page.getByRole("radio", { name: /穩健/ }).click();

  await expect(page.getByRole("radio", { name: /穩健/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("第 2 筆投資名稱")).toHaveValue("006208");
});

test("keeps part-time income optional", async ({ page, isMobile }) => {
  await page.getByText("更多生活假設", { exact: true }).click();
  const partTimeSwitch = page.getByRole("switch", { name: "退休後有兼職收入" });
  await expect(partTimeSwitch).not.toBeChecked();
  await expect(page.getByLabel("每月兼職收入")).toBeHidden();

  await page.getByText("退休後有兼職收入", { exact: true }).click();
  await page.getByLabel("每月兼職收入").fill("10000");
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();
  await expect(page.getByRole("heading", { name: "兼職收入" })).toBeVisible();
  await expect(page.getByText("65 至 70 歲")).toBeVisible();
});

test("keeps national pension separate and points to the official account", async ({ page, isMobile }) => {
  await expect(page.getByText("已繳費的國保年資")).toBeHidden();
  await page.getByText("曾經參加國民年金", { exact: true }).click();
  await page.getByLabel("已繳費的國保年資").fill("5");
  await expect(page.getByText("國保會依 B 式估算")).toBeVisible();
  await expect(page.getByRole("link", { name: "到勞保局查自己的國保資料" })).toHaveAttribute("href", "https://edesk.bli.gov.tw/me/#/na/overview");
  await expect(page.getByRole("link", { name: "到勞保局查自己的勞保資料" })).toHaveAttribute("href", "https://edesk.bli.gov.tw/me/#/na/overview");
  await expect(page.getByRole("link", { name: "到勞保局查自己的勞退專戶" })).toHaveAttribute("href", "https://edesk.bli.gov.tw/me/#/na/overview");
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();
  await expect(page.locator(".source-row h3", { hasText: "國民年金" })).toBeVisible();
  await expect(page.getByText("B 式每月估算", { exact: true })).toBeVisible();
});

test("shows an action plan when retirement assets are not enough", async ({ page, isMobile }) => {
  await page.locator(".holding-item").first().getByLabel("目前市值").fill("0");
  await page.locator(".holding-item").first().getByLabel("每月投入").fill("0");
  await page.getByLabel("目前專戶餘額").fill("0");
  await page.getByLabel("目前勞保年資").fill("0");
  await page.getByLabel("退休後每月生活費").fill("100000");
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();
  await expect(page.getByRole("heading", { name: "先選一個改變，結果會立刻更新" })).toBeVisible();
  await expect(page.getByRole("button", { name: /套用/ }).first()).toBeVisible();
});

test("stops the calculation and explains an invalid value", async ({ page, isMobile }) => {
  await page.getByText("預計持續加保到退休", { exact: true }).click();
  await page.getByLabel("未來還會加保").fill("99");
  await expect(page.getByText("未來勞保年資不可超過距退休的時間。")).toBeVisible();
  if (isMobile) await page.getByRole("tab", { name: "查看結果" }).click();
  await expect(page.getByRole("heading", { name: "先完成左側資料" })).toBeVisible();
});
