import { chromium, firefox } from "playwright";

const base = "http://localhost:5199";

async function shoot(browserType, name, colorScheme = "light") {
  const browser = await browserType.launch();
  const page = await browser.newPage({
    viewport: { width: 1100, height: 900 },
    colorScheme,
  });
  const messages = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      messages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => messages.push(`[pageerror] ${err.message}`));

  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/dab-${name}-1-initial.png` });

  // Draw two edges and let the computer reply.
  const groups = page.locator("svg g.group");
  await groups.nth(0).click({ force: true });
  await page.waitForTimeout(900);
  await groups.nth(2).click({ force: true });
  await page.waitForTimeout(900);
  // Hover a third edge for the telegraph preview.
  await groups.nth(4).hover({ force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/dab-${name}-2-mid.png` });

  console.log(`=== ${name} (${colorScheme}) ===`);
  console.log(
    messages.length === 0 ? "no console errors" : messages.join("\n"),
  );
  await browser.close();
}

await shoot(chromium, "chromium-light");
await shoot(chromium, "chromium-dark", "dark");
await shoot(firefox, "firefox-light");
