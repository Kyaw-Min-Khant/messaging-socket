import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "FOOD", description: "Groceries, restaurants, and food delivery" },
  {
    name: "TRANSPORT",
    description: "Fuel, public transit, ride-sharing, and vehicle maintenance",
  },
  { name: "HOUSING", description: "Rent, mortgage, and home maintenance" },
  {
    name: "UTILITIES",
    description: "Electricity, water, internet, and phone bills",
  },
  {
    name: "HEALTHCARE",
    description: "Doctor visits, medication, and health insurance",
  },
  {
    name: "ENTERTAINMENT",
    description: "Movies, games, concerts, and subscriptions",
  },
  {
    name: "SHOPPING",
    description: "Clothing, electronics, and personal items",
  },
  { name: "EDUCATION", description: "Tuition, books, courses, and training" },
  { name: "TRAVEL", description: "Hotels, flights, and vacation expenses" },
  { name: "SAVINGS", description: "Savings deposits and investments" },
  { name: "OTHER", description: "Miscellaneous expenses" },
];

async function main() {
  console.log("Seeding expense categories...");

  // Global categories have userId null. Prisma can't upsert on a compound key
  // containing null, so look up by name among global rows instead.
  for (const cat of CATEGORIES) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { userId: null, name: cat.name },
    });
    if (existing) {
      await prisma.expenseCategory.update({
        where: { id: existing.id },
        data: { description: cat.description },
      });
    } else {
      await prisma.expenseCategory.create({ data: { ...cat, userId: null } });
    }
  }

  console.log(`Seeded ${CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    // process.exit(1);
  })
  .finally(() => prisma.$disconnect());
