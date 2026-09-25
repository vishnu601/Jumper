import { test, expect, type Page } from '@playwright/test';

/**
 * These cover the flows spec 7.4 names: completing project 1, failing a
 * checkpoint and seeing fixes, progress surviving a reload, and the mobile
 * layout.
 */

const FIRST_LIGHT_STEPS = 8;

async function goToStep(page: Page, step: number) {
  await page.goto(`/projects/first-light/${step}`);
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
}

test('the home page offers the first project and shows the finished circuit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /one wire at a time/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /start with setup/i })).toBeVisible();
  await expect(
    page.getByRole('img', { name: /finished LED circuit with the LED blinking/i }),
  ).toBeVisible();
});

test('completes project 1 from the first step to done', async ({ page }) => {
  await goToStep(page, 1);

  for (let step = 1; step < FIRST_LIGHT_STEPS; step++) {
    await expect(page.getByText(`Step ${step} of ${FIRST_LIGHT_STEPS}`)).toBeVisible();
    await page.getByRole('link', { name: 'Next step' }).click();
  }

  await expect(page.getByText(`Step ${FIRST_LIGHT_STEPS} of ${FIRST_LIGHT_STEPS}`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Test it' })).toBeVisible();

  await page.getByRole('button', { name: 'Yes, it works' }).click();
  await expect(page.getByText('Project complete.')).toBeVisible();
  await expect(page.getByText(/You built a complete circuit/)).toBeVisible();

  // The path should now show the project as done.
  await page.goto('/');
  await expect(page.getByText('Done ✓')).toBeVisible();
});

test('a failed checkpoint shows ordered fixes, then recovers', async ({ page }) => {
  await goToStep(page, FIRST_LIGHT_STEPS);

  await page.getByRole('button', { name: "No, something's off" }).click();

  const fixes = page.getByTestId('fixes').getByRole('listitem');
  await expect(fixes).toHaveCount(5);
  // Most likely first (spec 3.5): the upload check, then the backwards LED.
  await expect(fixes.first()).toContainText('Check the upload finished');
  await expect(fixes.nth(1)).toContainText('Flip the LED');
  // At least one isolation test per checkpoint.
  await expect(page.getByText(/Test the LED on its own/)).toBeVisible();

  await page.getByRole('button', { name: 'It works now' }).click();
  await expect(page.getByText('Project complete.')).toBeVisible();
});

test('progress survives a reload and can be reset', async ({ page }) => {
  await goToStep(page, 4);
  await page.goto('/');
  await expect(page.getByText('Continue at step 4')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Continue at step 4')).toBeVisible();

  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByText('Continue at step 4')).toBeHidden();
});

test('checklist ticks persist across a reload', async ({ page }) => {
  await goToStep(page, 2);
  const box = page.getByTestId('checklist').getByRole('checkbox').first();
  await box.check();
  await page.reload();
  await expect(page.getByTestId('checklist').getByRole('checkbox').first()).toBeChecked();
});

test('the zoom toggle switches between step and whole board', async ({ page }) => {
  await goToStep(page, 2);
  const toggle = page.getByRole('button', { name: 'Show whole board' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  const zoomed = await page.locator('svg.scene').getAttribute('viewBox');
  await toggle.click();

  await expect(page.getByRole('button', { name: 'Zoom to this step' })).toBeVisible();
  const whole = await page.locator('svg.scene').getAttribute('viewBox');
  expect(whole).toBe('0 0 880 395');
  expect(zoomed).not.toBe(whole);
});

test('the diagram describes the current step to screen readers', async ({ page }) => {
  await goToStep(page, 2);
  await expect(
    page.getByRole('img', { name: /step 2: Place the LED/i }),
  ).toBeVisible();
});

test('the whole step panel is reachable by keyboard', async ({ page }) => {
  await goToStep(page, 2);

  const reached = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return '';
      return `${el.tagName}:${(el.textContent ?? '').trim().slice(0, 30)}`;
    });
    reached.add(label);
  }

  const joined = [...reached].join('|');
  expect(joined).toMatch(/Show whole board/);
  expect(joined).toMatch(/INPUT:/);
  expect(joined).toMatch(/Next step/);
});

// Step 7 carries the sketch. A long line in a <pre> will widen the whole page
// unless the grid column is allowed to shrink, which pushes "Next step" off
// screen entirely -- so every step gets checked, not just a prose one.
test('renders at 360px with no horizontal overflow on any step', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });

  for (let step = 1; step <= FIRST_LIGHT_STEPS; step++) {
    await goToStep(page, step);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `step ${step} overflows horizontally`).toBeLessThanOrEqual(0);

    // The last step has no "Next step" link, so check whatever nav it does have.
    const navLinks = page.getByRole('link', { name: /Next step|All projects|^Back$/ });
    const count = await navLinks.count();
    expect(count, `step ${step} has no step navigation`).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await navLinks.nth(i).boundingBox();
      if (box) {
        expect(box.x + box.width, `step ${step} nav link ${i} is off screen`).toBeLessThanOrEqual(360);
      }
    }
  }
});

test('an unknown project or step is a 404', async ({ page }) => {
  expect((await page.goto('/projects/nope/1'))?.status()).toBe(404);
  expect((await page.goto('/projects/first-light/99'))?.status()).toBe(404);
});
