/**
 * @file Author credit e2e: the footer credit line is visible, the
 * `<meta name="author">` tag is in the head, the footer keeps WCAG AA contrast
 * in light and dark schemes, and on a phone-width viewport it does not overlap
 * the canvas or the toolbar. Runs on the source page and on dist/index.html.
 */

import { test, expect } from '@playwright/test';

const CREDIT = 'Creado por Carlos Carpio García · 2026';

/**
 * Opens the app and waits until it is ready.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<void>}
 */
async function openApp(page) {
  await page.goto('index.html');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
}

/**
 * Tells whether two bounding boxes intersect (touching edges do not count).
 *
 * @param {{x: number, y: number, width: number, height: number}} a - First box.
 * @param {{x: number, y: number, width: number, height: number}} b - Second box.
 * @returns {boolean} True when the boxes share some area.
 */
function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Computes the WCAG contrast ratio between the footer text colour and the
 * page background, in the browser.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<number>} The contrast ratio (1 to 21).
 */
async function footerContrast(page) {
  return page.evaluate(() => {
    /**
     * Relative luminance of a computed `rgb(...)` colour.
     *
     * @param {string} css - The computed colour.
     * @returns {number} The luminance (0 to 1).
     */
    const luminance = (css) => {
      const [r, g, b] = css.match(/[\d.]+/g).slice(0, 3).map((v) => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const text = getComputedStyle(document.querySelector('.app-footer')).color;
    const background = getComputedStyle(document.body).backgroundColor;
    const [hi, lo] = [luminance(text), luminance(background)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  });
}

test('the author credit and meta tag are present', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('footer.app-footer')).toBeVisible();
  await expect(page.locator('footer.app-footer')).toHaveText(CREDIT);
  await expect(page.locator('head meta[name="author"]')).toHaveAttribute('content', 'Carlos Carpio García');
});

for (const colorScheme of ['light', 'dark']) {
  test(`the credit has AA contrast in the ${colorScheme} scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await openApp(page);
    expect(await footerContrast(page)).toBeGreaterThanOrEqual(4.5);
  });
}

test('on a phone the credit does not cover the canvas or the toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openApp(page);
  const footer = page.locator('footer.app-footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeInViewport();
  const footerBox = await footer.boundingBox();
  const canvasBox = await page.locator('.canvas-area').boundingBox();
  const toolbarBox = await page.locator('#toolbar').boundingBox();
  expect(overlaps(footerBox, canvasBox)).toBe(false);
  expect(overlaps(footerBox, toolbarBox)).toBe(false);
  // No horizontal scroll caused by the footer.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
