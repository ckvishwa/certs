import { test, expect } from "@playwright/test";

/**
 * Foundation critical-path smoke test:
 * sign up → onboarding (choose cert + version) → Today → refresh (stay auth'd)
 * → Knowledge Map (DB-backed syllabus) → sign out.
 *
 * Requires a configured Supabase project (env in .env.local) with email
 * confirmation DISABLED and the syllabus seeded (`npm run db:seed`).
 * Skips automatically when Supabase env is absent so CI without creds is green.
 */
const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("Foundation user journey", () => {
  test.skip(!configured, "Supabase env not configured (.env.local)");

  test("sign up → onboard → today → knowledge map → sign out", async ({
    page,
  }) => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = "Test-password-123";

    // 1–3. Sign up (confirmation disabled ⇒ immediate session).
    await page.goto("/sign-up");
    await page.getByLabel("Display name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    // 4–7. Onboarding: defaults already select CCNA + active version.
    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByRole("button", { name: "Start studying" }).click();

    // 8. Today page.
    await expect(page).toHaveURL(/\/today/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "E2E Tester",
    );

    // 9. Refresh and remain authenticated.
    await page.reload();
    await expect(page).toHaveURL(/\/today/);

    // 10–11. Knowledge Map loads DB-backed syllabus.
    await page.goto("/knowledge-map");
    await expect(
      page.getByRole("heading", { name: "Knowledge Map" }),
    ).toBeVisible();
    await expect(page.getByText("Network Fundamentals")).toBeVisible();

    // 12. Sign out.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("unauthenticated access to a protected route redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
