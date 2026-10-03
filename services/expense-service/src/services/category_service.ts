import { ConflictError, NotFoundError, ValidationError } from "@app/shared-errors";
import { prisma } from "../config/prisma";
import { CategoryBody } from "../types";

function validateCategoryBody(body: CategoryBody, partial: boolean) {
  const result: { name?: string; description?: string | null } = {};
  if (body.name !== undefined || !partial) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 100) {
      throw new ValidationError("name is required and must be under 100 characters");
    }
    result.name = body.name.trim().toUpperCase();
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== "string" || body.description.length > 500)) {
      throw new ValidationError("description must be a string under 500 characters");
    }
    result.description = body.description;
  }
  return result;
}

/** Global categories (userId null) plus the user's own. */
export async function listCategories(userId: string) {
  return prisma.expenseCategory.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ userId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
}

/** Throws NotFound unless the category is global or owned by the user. */
export async function assertCategoryAccessible(userId: string, categoryId: string) {
  const category = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, OR: [{ userId: null }, { userId }] },
  });
  if (!category) {
    throw new NotFoundError("Category not found.");
  }
  return category;
}

async function assertNameAvailable(userId: string, name: string, excludeId?: string) {
  const clash = await prisma.expenseCategory.findFirst({
    where: {
      name,
      OR: [{ userId: null }, { userId }],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (clash) {
    throw new ConflictError(`Category "${name}" already exists.`);
  }
}

async function getOwnCategory(userId: string, id: string) {
  const category = await prisma.expenseCategory.findUnique({ where: { id } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw new NotFoundError("Category not found.");
  }
  if (category.userId === null) {
    throw new ValidationError("Default categories cannot be modified.");
  }
  return category;
}

export async function createCategory(userId: string, body: CategoryBody) {
  const data = validateCategoryBody(body, false);
  await assertNameAvailable(userId, data.name!);
  return prisma.expenseCategory.create({
    data: { userId, name: data.name!, description: data.description ?? null },
  });
}

export async function updateCategory(userId: string, id: string, body: CategoryBody) {
  await getOwnCategory(userId, id);
  const data = validateCategoryBody(body, true);
  if (data.name) await assertNameAvailable(userId, data.name, id);
  return prisma.expenseCategory.update({ where: { id }, data });
}

export async function deleteCategory(userId: string, id: string) {
  await getOwnCategory(userId, id);
  const [expenseCount, recurringCount] = await Promise.all([
    prisma.expense.count({ where: { categoryId: id } }),
    prisma.recurringExpense.count({ where: { categoryId: id } }),
  ]);
  if (expenseCount > 0 || recurringCount > 0) {
    throw new ConflictError(
      "Category is in use by expenses or recurring expenses. Reassign them first.",
    );
  }
  await prisma.expenseCategory.delete({ where: { id } });
}
