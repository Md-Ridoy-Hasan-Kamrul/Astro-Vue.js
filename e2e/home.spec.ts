import { expect, test, type Page } from '@playwright/test';

test.describe('Home landing page', () => {
  test('has brand title and main sections', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/Astro Vue/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByText('Astro Vue').first()).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: /Digital Product Design & Development Company/i,
      }),
    ).toBeVisible();
    await expect(page.locator('#orbit-projects')).toBeAttached();
    await expect(page.locator('#capabilities')).toBeAttached();
    await expect(page.locator('#specialists')).toBeAttached();
    await expect(page.locator('#faq')).toBeAttached();
    await expect(page.locator('#how')).toHaveCount(0);
    await expect(page.locator('#stack')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('navbar links to a home page section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Blog' })
      .click();
    await expect(page).toHaveURL(/\/#faq/);
  });

  test('navbar navigates to the about route', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const about = page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'About Us', exact: true });
    if (!(await about.isVisible())) {
      await page.getByRole('button', { name: 'Menu' }).click();
    }
    await about.click();
    await expect(page).toHaveURL(/\/about\/?$/);
    await expect(page.getByRole('button', { name: /Astro pages/i })).toBeVisible();
  });
});

/** The button is server-rendered; clicking before Vue hydrates does a native submit. */
async function openHydratedFeedback(page: Page) {
  await page.goto('/about', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const island = document.querySelector('#feedback form')?.closest('astro-island');
    return island !== null && island !== undefined && !island.hasAttribute('ssr');
  });
}

test.describe('About feedback form', () => {
  test.describe.configure({ mode: 'serial' });

  test('shows validation errors for invalid input', async ({ page }) => {
    await openHydratedFeedback(page);

    const form = page.locator('#feedback form');
    await expect(
      form.getByRole('button', { name: 'Send feedback' }),
    ).toBeVisible();
    await form.getByLabel('Name').fill('Ada');
    await form.locator('#feedback-email').fill('foo@bar');
    await form.getByLabel('Message').fill('too short');
    await form.getByRole('button', { name: 'Send feedback' }).click();

    await expect(page.getByText('Please fix the form')).toBeVisible();
    await expect(form.getByText('Enter a valid email')).toBeVisible();
    await expect(form.getByText(/Message must be at least/)).toBeVisible();
  });

  test('submits feedback and shows a success toast', async ({ page }) => {
    await openHydratedFeedback(page);

    const form = page.locator('#feedback form');
    await form.getByLabel('Name').fill('Ada Lovelace');
    await form.locator('#feedback-email').fill('ada@example.com');
    await form
      .getByLabel('Message')
      .fill('Routing plus mutation toast feels solid for learning.');
    await form.getByRole('button', { name: 'Send feedback' }).click();

    await expect(
      page.getByRole('region', { name: /Notifications/ }).getByText('Feedback sent'),
    ).toBeVisible();
    await expect(form.getByLabel('Name')).toHaveValue('');
  });
});
