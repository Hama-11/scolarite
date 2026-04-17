import { test, expect } from "@playwright/test";

test.describe("Pages publiques - smoke tests", () => {
  test("la home se charge avec hero et CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /SCOLARITE/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Construisez votre avenir/i })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Connexion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Commencer" })).toBeVisible();
  });

  test("navigation home vers login et register", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("navigation").getByRole("link", { name: "Connexion" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();

    await page.getByRole("link", { name: /Créer un compte|Créer un compte/i }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "Inscription" })).toBeVisible();
  });

  test("page de verification email accessible", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByRole("heading", { name: /Vérification email|Email vérifié/i })).toBeVisible();
  });
});
