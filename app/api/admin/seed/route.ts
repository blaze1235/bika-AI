import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * One-time production seeding endpoint, guarded by SEED_SECRET.
 * Mirrors prisma/seed.ts — safe to call more than once (upserts only).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-seed-secret");
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = (p: string) => bcrypt.hash(p, 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: await hash("admin123"),
      role: "ADMIN",
      name: "Администратор Bika",
    },
  });

  const categoryNames = [
    "Напитки",
    "Молочные продукты",
    "Бакалея",
    "Снеки",
    "Бытовая химия",
    "Кондитерские изделия",
  ];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = c.id;
  }

  const dist1 = await prisma.user.upsert({
    where: { username: "tashkent-foods" },
    update: {},
    create: {
      username: "tashkent-foods",
      passwordHash: await hash("dist123"),
      role: "DISTRIBUTOR",
      name: "Азиз Каримов",
      businessName: "Tashkent Foods",
      phone: "+998 90 123 45 67",
      address: "г. Ташкент, Яккасарайский район",
    },
  });

  const dist2 = await prisma.user.upsert({
    where: { username: "milkline" },
    update: {},
    create: {
      username: "milkline",
      passwordHash: await hash("dist123"),
      role: "DISTRIBUTOR",
      name: "Дилшод Рахимов",
      businessName: "MilkLine Distribution",
      phone: "+998 91 234 56 78",
      address: "г. Ташкент, Чиланзарский район",
    },
  });

  await prisma.user.upsert({
    where: { username: "magazin-baraka" },
    update: {},
    create: {
      username: "magazin-baraka",
      passwordHash: await hash("buyer123"),
      role: "BUYER",
      name: "Умид Ахмедов",
      businessName: "Магазин Барака",
      phone: "+998 93 345 67 89",
      address: "г. Ташкент, ул. Навои 12",
    },
  });

  await prisma.user.upsert({
    where: { username: "cafe-sharq" },
    update: {},
    create: {
      username: "cafe-sharq",
      passwordHash: await hash("buyer123"),
      role: "BUYER",
      name: "Нилуфар Юсупова",
      businessName: "Кафе Шарк",
      phone: "+998 94 456 78 90",
      address: "г. Ташкент, ул. Амира Темура 45",
    },
  });

  const products: Array<{
    name: string;
    description: string;
    price: number;
    unit: "PIECE" | "KG" | "LITER" | "BOX" | "PACK";
    stock: number | null;
    category: string;
    distributorId: string;
  }> = [
    { name: "Вода питьевая 1.5л (упак. 6 шт)", description: "Негазированная питьевая вода, упаковка 6 бутылок", price: 18000, unit: "PACK", stock: 200, category: "Напитки", distributorId: dist1.id },
    { name: "Кока-Кола 1л (упак. 12 шт)", description: "Газированный напиток, упаковка 12 бутылок", price: 96000, unit: "PACK", stock: 80, category: "Напитки", distributorId: dist1.id },
    { name: "Сок яблочный 1л", description: "100% натуральный яблочный сок", price: 14000, unit: "PIECE", stock: 150, category: "Напитки", distributorId: dist1.id },
    { name: "Рис лазер (мешок 25 кг)", description: "Рис высшего сорта для плова", price: 425000, unit: "BOX", stock: 40, category: "Бакалея", distributorId: dist1.id },
    { name: "Мука высший сорт 50 кг", description: "Пшеничная мука высшего сорта", price: 280000, unit: "BOX", stock: 60, category: "Бакалея", distributorId: dist1.id },
    { name: "Масло хлопковое 5л", description: "Рафинированное хлопковое масло", price: 95000, unit: "PIECE", stock: 100, category: "Бакалея", distributorId: dist1.id },
    { name: "Сахар песок 50 кг", description: "Сахар-песок, мешок", price: 550000, unit: "BOX", stock: 35, category: "Бакалея", distributorId: dist1.id },
    { name: "Чипсы картофельные (кор. 24 шт)", description: "Картофельные чипсы, короб 24 пачки", price: 168000, unit: "BOX", stock: 50, category: "Снеки", distributorId: dist1.id },
    { name: "Печенье ассорти 3 кг", description: "Печенье ассорти в коробке", price: 78000, unit: "BOX", stock: 45, category: "Кондитерские изделия", distributorId: dist1.id },
    { name: "Стиральный порошок 3 кг", description: "Универсальный стиральный порошок", price: 52000, unit: "PIECE", stock: 70, category: "Бытовая химия", distributorId: dist1.id },
    { name: "Молоко 1л (упак. 12 шт)", description: "Пастеризованное молоко 3.2%", price: 132000, unit: "PACK", stock: 90, category: "Молочные продукты", distributorId: dist2.id },
    { name: "Кефир 0.5л (упак. 20 шт)", description: "Кефир 2.5%, упаковка 20 бутылок", price: 130000, unit: "PACK", stock: 60, category: "Молочные продукты", distributorId: dist2.id },
    { name: "Сметана 20% 500г", description: "Сметана 20% жирности", price: 16000, unit: "PIECE", stock: 120, category: "Молочные продукты", distributorId: dist2.id },
    { name: "Творог 5% 1 кг", description: "Свежий творог 5% жирности", price: 42000, unit: "KG", stock: 80, category: "Молочные продукты", distributorId: dist2.id },
    { name: "Сыр голландский", description: "Полутвёрдый сыр, цена за кг", price: 98000, unit: "KG", stock: 50, category: "Молочные продукты", distributorId: dist2.id },
    { name: "Масло сливочное 82.5% 5 кг", description: "Сливочное масло, монолит", price: 490000, unit: "BOX", stock: 25, category: "Молочные продукты", distributorId: dist2.id },
    { name: "Йогурт питьевой (упак. 24 шт)", description: "Питьевой йогурт в ассортименте", price: 144000, unit: "PACK", stock: 70, category: "Молочные продукты", distributorId: dist2.id },
  ];

  for (const p of products) {
    const exists = await prisma.product.findFirst({
      where: { name: p.name, distributorId: p.distributorId },
    });
    if (!exists) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          unit: p.unit,
          stock: p.stock,
          categoryId: categories[p.category],
          distributorId: p.distributorId,
        },
      });
    }
  }

  await prisma.setting.upsert({
    where: { key: "companyName" },
    update: {},
    create: { key: "companyName", value: "Bika" },
  });

  return NextResponse.json({ ok: true });
}
