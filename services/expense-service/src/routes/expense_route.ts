import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  createExpenseController,
  deleteExpenseController,
  getExpenseController,
  getSummaryController,
  listCategoriesController,
  listExpensesController,
  updateExpenseController,
} from "../controllers/expense_controller";

const router = Router();

router.get("/categories", auth, listCategoriesController);
router.get("/summary", auth, getSummaryController);
router.post("/", auth, createExpenseController);
router.get("/", auth, listExpensesController);
router.get("/:id", auth, getExpenseController);
router.put("/:id", auth, updateExpenseController);
router.delete("/:id", auth, deleteExpenseController);

export default router;

/**
 * @openapi
 * components:
 *   schemas:
 *     Expense:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         amount:
 *           type: string
 *           example: "42.00"
 *           description: Decimal amount serialized as a fixed 2-decimal string
 *         currency:
 *           type: string
 *           example: "USD"
 *         category:
 *           type: string
 *           enum: [FOOD, TRANSPORT, HOUSING, UTILITIES, HEALTHCARE, ENTERTAINMENT, SHOPPING, EDUCATION, TRAVEL, SAVINGS, OTHER]
 *         description:
 *           type: string
 *           nullable: true
 *         spentAt:
 *           type: string
 *           format: date
 *           example: "2026-07-01"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ApiError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *     SuccessMessage:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 */

/**
 * @openapi
 * /v1/api/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, category, spentAt]
 *             properties:
 *               amount: { type: number, example: 42.00 }
 *               currency: { type: string, example: "USD" }
 *               category: { type: string, example: "FOOD" }
 *               description: { type: string, example: "Lunch with team" }
 *               spentAt: { type: string, format: date, example: "2026-07-01" }
 *     responses:
 *       201:
 *         description: Expense created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Expense created successfully" }
 *                 data: { $ref: '#/components/schemas/Expense' }
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: List expenses for the current user
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated expense list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Expense' }
 */

/**
 * @openapi
 * /v1/api/expenses/summary:
 *   get:
 *     summary: Get daily or category-grouped expense totals
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [day, category], default: day }
 *     responses:
 *       200:
 *         description: Aggregated totals
 */

/**
 * @openapi
 * /v1/api/expenses/{id}:
 *   get:
 *     summary: Get a single expense by id
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense found
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense updated
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete an expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Expense deleted
 *       404:
 *         description: Not found
 */
