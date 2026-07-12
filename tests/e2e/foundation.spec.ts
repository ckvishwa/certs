import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(supabaseUrl && serviceRole);

test.describe("Authenticated learning workspace", () => {
  test.skip(!configured, "Supabase admin environment is not configured");

  test("Security+ dashboard and heatmaps load real learner data", async ({
    page,
  }) => {
    const admin = createClient(supabaseUrl!, serviceRole!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = `e2e_${Date.now()}@example.com`;
    const password = `E2e-${crypto.randomUUID()}-A1!`;
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "E2E Tester" },
    });
    expect(createError).toBeNull();

    const consoleErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await page
      .getByLabel("Certification", { exact: true })
      .selectOption({ label: "CompTIA Security+ (CompTIA)" });
    await page
      .getByLabel("Exam version", { exact: true })
      .selectOption({ label: "CompTIA Security+ SY0-701" });
    await page.getByRole("button", { name: "Start studying" }).click();

    await expect(page).toHaveURL(/\/today/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "E2E Tester",
    );
    await expect(
      page.getByRole("heading", { name: "Objective mastery", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".mastery-cell")).toHaveCount(28);
    await expect(
      page.getByText("No classified mistakes in this range"),
    ).toBeVisible();

    await page.locator(".mastery-cell").nth(1).click();
    await expect(page.getByLabel("Close objective details")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Concept mastery", exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/today/);
    await expect(page.locator(".mastery-cell")).toHaveCount(28);

    await page.goto("/knowledge-map");
    await expect(
      page.getByRole("heading", { name: "Knowledge Map" }),
    ).toBeVisible();
    await expect(page.getByText(/28 objectives · 98 concepts/)).toBeVisible();
    await page.getByRole("button", { name: "Dependency view" }).click();
    await expect(
      page.getByRole("heading", { name: "Concept dependencies" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Mastery view" }).click();
    await expect(page.locator(".mastery-cell")).toHaveCount(28);
    await expect(
      page.getByRole("heading", {
        name: "1General Security Concepts",
        exact: true,
      }),
    ).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  });

  test("protected and frozen routes keep their release gates", async ({
    page,
  }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/practice");
    await expect(page).toHaveURL(/\/sign-in/);

    const response = await page.request.post("/api/ai/explain", { data: {} });
    expect(response.status()).toBe(404);
  });
});
