import { test, expect } from "@playwright/test";

const studentUser = {
  id: 1001,
  name: "Etudiant Test",
  email: "etudiant@example.com",
  role: "student",
};

async function mockStudentApis(page) {
  await page.route("**/api/me", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(studentUser) });
  });

  await page.route("**/api/notifications/unread-count", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ unread_count: 0 }) });
  });

  await page.route("**/api/my/courses", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
  });

  await page.route("**/api/my/schedule", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
  });

  await page.route("**/api/my/grades", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
  });

  await page.route("**/api/my/announcements", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
  });

  await page.route("**/api/courses**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [], last_page: 1 }) });
  });
}

test.describe("Routes protegees", () => {
  test("redirige vers login si non connecte", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  });

  test("accede au dashboard avec session mockee", async ({ page }) => {
    await mockStudentApis(page);
    await page.addInitScript(({ user }) => {
      localStorage.setItem("token", "mock-token");
      localStorage.setItem("user", JSON.stringify(user));
    }, { user: studentUser });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Tableau de bord/i, level: 2 })).toBeVisible();
  });

  test("accede a la page cours avec session mockee", async ({ page }) => {
    await mockStudentApis(page);
    await page.addInitScript(({ user }) => {
      localStorage.setItem("token", "mock-token");
      localStorage.setItem("user", JSON.stringify(user));
    }, { user: studentUser });

    await page.goto("/courses");
    await expect(page).toHaveURL(/\/courses$/);
    await expect(page.locator("h2", { hasText: "Cours" })).toBeVisible();
  });
});
