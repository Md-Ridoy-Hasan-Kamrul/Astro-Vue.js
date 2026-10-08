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
      .getByRole('link', { name: 'FAQ', exact: true })
      .click();
    await expect(page).toHaveURL(/\/#faq/);
  });

  test('footer section links land on that section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'About', exact: true })).toHaveCount(0);

    await footer.getByRole('link', { name: 'Partner', exact: true }).click();
    await expect(page).toHaveURL(/\/#partner$/);
    await expect(page.locator('#partner')).toBeInViewport();

    await footer.getByRole('link', { name: 'FAQ', exact: true }).first().click();
    await expect(page).toHaveURL(/\/#faq$/);
    // The hash is written when the smooth glide starts; poll until it lands under the navbar.
    const faqTop = () => page.locator('#faq').evaluate((el) => el.getBoundingClientRect().top);
    await expect.poll(faqTop).toBeGreaterThan(40);
    await expect.poll(faqTop).toBeLessThan(140);
  });

  test('footer contact link opens the contact page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('contentinfo').getByRole('link', { name: 'Contact', exact: true }).first().click();
    await expect(page).toHaveURL(/\/contact\/?$/);
    await expect(page.getByRole('button', { name: 'Send feedback' })).toBeVisible();
  });
});

/** The button is server-rendered; clicking before Vue hydrates does a native submit. */
async function openHydratedFeedback(page: Page) {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const island = document.querySelector('#feedback form')?.closest('astro-island');
    return island !== null && island !== undefined && !island.hasAttribute('ssr');
  });
}

test.describe('Contact feedback form', () => {
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
