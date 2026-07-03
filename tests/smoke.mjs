/**
 * End-to-end smoke test for the Bika MVP.
 * Drives a real Chromium browser through the full business flow:
 *   buyer orders -> distributor processes -> admin oversees.
 *
 * Run: node tests/smoke.mjs   (server must be running on :3000)
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}
function fail(name, err) {
  failed++;
  console.error(`  ✗ ${name}: ${err}`);
}

async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    fail(name, e.message?.split("\n")[0] ?? e);
  }
}

async function login(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
}

async function logout(page) {
  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST" }));
  await page.context().clearCookies();
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile-sized
const page = await context.newPage();

console.log("\n— Аутентификация и роли —");

await check("логин покупателя ведёт в /shop", async () => {
  await login(page, "magazin-baraka", "buyer123");
  if (!page.url().includes("/shop")) throw new Error(`got ${page.url()}`);
});

await check("покупатель не может открыть /admin (redirect)", async () => {
  await page.goto(`${BASE}/admin`);
  await page.waitForURL((u) => !u.pathname.startsWith("/admin"), { timeout: 10000 });
});

await check("неверный пароль отклоняется", async () => {
  await logout(page);
  await page.goto(`${BASE}/login`);
  await page.fill('input[autocomplete="username"]', "magazin-baraka");
  await page.fill('input[type="password"]', "wrong");
  await page.click('button[type="submit"]');
  await page.locator("text=Неверный логин или пароль").waitFor({ timeout: 10000 });
});

console.log("\n— Покупатель: каталог и заказ —");

let orderNumber = null;

await check("каталог показывает товары обоих дистрибьюторов", async () => {
  await login(page, "magazin-baraka", "buyer123");
  await page.goto(`${BASE}/shop/catalog`);
  await page.locator("text=Молоко 1л").waitFor();
  await page.locator("text=Сок яблочный").waitFor();
});

await check("поиск фильтрует каталог", async () => {
  await page.fill('input[type="search"]', "Кефир");
  await page.locator("text=Кефир 0.5л").waitFor({ timeout: 10000 });
  await page.waitForTimeout(600); // debounce + rerender
  const milk = await page.locator("text=Молоко 1л").count();
  if (milk > 0) throw new Error("Молоко всё ещё в выдаче");
  await page.fill('input[type="search"]', "");
  await page.waitForTimeout(700);
});

/** Open a product's detail page from the catalog and add it to the cart. */
async function addProductToCart(name) {
  await page.goto(`${BASE}/shop/catalog?q=${encodeURIComponent(name)}`);
  await page.locator(`a:has-text("${name}")`).first().click();
  await page.locator("button:has-text(\"В корзину\")").waitFor();
  await page.click('button:has-text("В корзину")');
  await page.waitForTimeout(300);
}

await check("добавление в корзину (2 товара разных дистрибьюторов)", async () => {
  await addProductToCart("Молоко 1л");
  await addProductToCart("Сок яблочный");
});

await check("оформление заказа (сплит по дистрибьюторам)", async () => {
  await page.goto(`${BASE}/shop/cart`);
  await page.locator("text=Оформление заказа").waitFor();
  await page.fill('input[placeholder="Город, улица, дом"]', "г. Ташкент, ул. Навои 12");
  await page.fill("textarea", "Тестовый заказ — привезите утром");
  await page.click('button:has-text("Оформить заказ")');
  await page.locator("text=Заказ оформлен").waitFor({ timeout: 15000 });
});

await check("история заказов показывает новые заказы", async () => {
  await page.goto(`${BASE}/shop/orders`);
  await page.locator("text=Заказ №").waitFor();
  const first = await page.locator("text=/Заказ №\\d+/").first().textContent();
  orderNumber = first.match(/№(\d+)/)[1];
  await page.locator("text=Новый").waitFor();
});

await check("детали заказа открываются", async () => {
  await page.locator("a:has-text('Заказ №')").first().click();
  await page.locator("text=Итого").waitFor();
  await page.locator("text=Доставка").waitFor();
});

console.log("\n— Дистрибьютор: обработка заказа —");

await check("логин дистрибьютора ведёт в /distributor", async () => {
  await logout(page);
  await login(page, "milkline", "dist123");
  if (!page.url().includes("/distributor")) throw new Error(`got ${page.url()}`);
});

await check("новый заказ виден в списке заказов", async () => {
  await page.goto(`${BASE}/distributor/orders`);
  await page.locator("text=Магазин Барака").waitFor();
  await page.locator("text=Новый").waitFor();
});

await check("статус: Новый → Подтверждён → Отправлен → Доставлен", async () => {
  await page.locator("tbody tr").first().locator("a").first().click();
  await page.locator("text=Управление статусом").waitFor();
  await page.click('button:has-text("Подтверждён")');
  await page.locator("span:has-text(\"Подтверждён\")").waitFor({ timeout: 10000 });
  await page.click('button:has-text("Отправлен")');
  await page.locator("span:has-text(\"Отправлен\")").waitFor({ timeout: 10000 });
  await page.click('button:has-text("Доставлен")');
  await page.locator("text=Заказ доставлен").waitFor({ timeout: 10000 });
});

await check("дистрибьютор может добавить товар", async () => {
  await page.goto(`${BASE}/distributor/products`);
  await page.click('button:has-text("Добавить товар")');
  await page.fill('input[placeholder*="Молоко"]', "Ряженка 0.5л (тест)");
  await page.fill('input[placeholder="0"]', "9500");
  await page.click('button:has-text("Сохранить")');
  await page.locator("text=Ряженка 0.5л (тест)").waitFor({ timeout: 10000 });
});

await check("список покупателей содержит заказчика", async () => {
  await page.goto(`${BASE}/distributor/buyers`);
  await page.locator("text=Магазин Барака").waitFor();
});

await check("CSV экспорт отдаёт файл", async () => {
  const res = await page.request.get(`${BASE}/api/orders/export`);
  if (!res.ok()) throw new Error(`status ${res.status()}`);
  const text = await res.text();
  if (!text.includes("№ заказа")) throw new Error("нет заголовка CSV");
});

console.log("\n— Покупатель: статус обновился + подсказки —");

await check("покупатель видит статус «Доставлен»", async () => {
  await logout(page);
  await login(page, "magazin-baraka", "buyer123");
  await page.goto(`${BASE}/shop/orders`);
  await page.locator("text=Доставлен").waitFor();
});

await check("новый товар дистрибьютора виден в каталоге", async () => {
  await page.goto(`${BASE}/shop/catalog`);
  await page.fill('input[type="search"]', "Ряженка");
  await page.locator("text=Ряженка 0.5л (тест)").waitFor({ timeout: 10000 });
});

await check("блок «Подсказки Bika» с прогрессом обучения", async () => {
  await page.goto(`${BASE}/shop`);
  await page.locator("text=Подсказки Bika").waitFor();
  await page.locator("text=/\\d+\\/10 заказов/").waitFor();
});

console.log("\n— Ещё 2 заказа → появляются рекомендации —");

await check("делаем ещё 2 заказа (3+ для рекомендаций)", async () => {
  for (let i = 0; i < 2; i++) {
    await addProductToCart("Молоко 1л");
    await page.goto(`${BASE}/shop/cart`);
    await page.fill('input[placeholder="Город, улица, дом"]', "г. Ташкент, ул. Навои 12");
    await page.click('button:has-text("Оформить заказ")');
    await page.locator("text=Заказ оформлен").waitFor({ timeout: 15000 });
  }
});

await check("рекомендации «вам может понадобиться» на главной", async () => {
  await page.goto(`${BASE}/shop`);
  await page.locator("text=вам может понадобиться").waitFor();
  await page.locator("text=Молоко 1л").waitFor();
});

console.log("\n— Админ: полный контроль —");

await check("логин админа ведёт в /admin", async () => {
  await logout(page);
  await login(page, "admin", "admin123");
  if (!page.url().includes("/admin")) throw new Error(`got ${page.url()}`);
});

await check("дашборд показывает статистику и топ товаров", async () => {
  await page.locator("text=Заказов всего").waitFor();
  await page.locator("text=Топ товаров").waitFor();
  await page.locator("text=Молоко 1л").waitFor();
});

await check("все заказы видны с фильтром по статусу", async () => {
  await page.goto(`${BASE}/admin/orders`);
  await page.locator("text=Магазин Барака").waitFor();
  await page.goto(`${BASE}/admin/orders?status=DELIVERED`);
  await page.locator("text=Доставлен").waitFor();
});

await check("админ создаёт пользователя с паролем", async () => {
  await page.goto(`${BASE}/admin/users`);
  await page.click('button:has-text("Новый пользователь")');
  await page.fill('input[placeholder="magazin-lola"]', "test-shop");
  await page.fill('input[placeholder="••••••"]', "test123");
  await page.fill('input[placeholder="Имя Фамилия"]', "Тест Тестов");
  await page.fill('input[placeholder="Магазин / Компания"]', "Тестовый Магазин");
  await page.click('button:has-text("Сохранить")');
  await page.locator("text=Тестовый Магазин").waitFor({ timeout: 10000 });
});

await check("созданный пользователь может войти", async () => {
  await logout(page);
  await login(page, "test-shop", "test123");
  if (!page.url().includes("/shop")) throw new Error(`got ${page.url()}`);
});

await check("новый покупатель видит пустое состояние (изоляция данных)", async () => {
  await page.goto(`${BASE}/shop/orders`);
  await page.locator("text=Заказов пока нет").waitFor();
});

await check("журнал активности фиксирует действия", async () => {
  await logout(page);
  await login(page, "admin", "admin123");
  await page.goto(`${BASE}/admin/activity`);
  await page.locator("text=Создан пользователь").waitFor();
  await page.locator("text=Изменён статус заказа").waitFor();
});

await browser.close();

console.log(`\n═══════════════════════════════`);
console.log(`Пройдено: ${passed}  Провалено: ${failed}`);
if (failed > 0) process.exit(1);
