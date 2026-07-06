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
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: >
 *         Paste your JWT here. To get a token: call POST /v1/api/auth/login on
 *         the main service, copy the token value from the response cookie
 *         (DevTools → Application → Cookies → token), then click Authorize and
 *         paste it.
 *   schemas:
 *     Expense:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         userId:
 *           type: string
 *           example: "64f1a2b3c4d5e6f7a8b9c0d1"
 *         amount:
 *           type: string
 *           example: "5000.00"
 *           description: Decimal amount serialized as a fixed 2-decimal string
 *         currency:
 *           type: string
 *           example: "MMK"
 *         categoryId:
 *           type: string
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         category:
 *           type: string
 *           example: "FOOD"
 *         paymentMethod:
 *           type: string
 *           enum: [CASH, KBZ_PAY, AYA_PAY, ONLINE_PAYMENT]
 *           example: "CASH"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Lunch with team"
 *         spentAt:
 *           type: string
 *           format: date
 *           example: "2026-07-06"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         name:
 *           type: string
 *           example: "FOOD"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Groceries, restaurants, and food delivery"
 *     ApiError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Validation error message"
 *     Pagination:
 *       type: object
 *       properties:
 *         page: { type: integer, example: 1 }
 *         limit: { type: integer, example: 20 }
 *         total: { type: integer, example: 42 }
 *         totalPages: { type: integer, example: 3 }
 */

/**
 * @openapi
 * /v1/api/expenses/categories:
 *   get:
 *     summary: List all expense categories
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Category' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
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
 *             required: [amount, categoryId, spentAt]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *                 description: Positive number, max 2 decimal places
 *               currency:
 *                 type: string
 *                 example: "MMK"
 *                 default: "MMK"
 *               categoryId:
 *                 type: string
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 description: UUID from GET /v1/api/expenses/categories
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, KBZ_PAY, AYA_PAY, ONLINE_PAYMENT]
 *                 default: CASH
 *               description:
 *                 type: string
 *                 example: "Lunch with team"
 *                 maxLength: 500
 *               spentAt:
 *                 type: string
 *                 format: date
 *                 example: "2026-07-06"
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
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *   get:
 *     summary: List expenses for the current user
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         example: "2026-07-01"
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         example: "2026-07-31"
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         example: "FOOD"
 *         description: Filter by category name
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
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */

/**
 * @openapi
 * /v1/api/expenses/summary:
 *   get:
 *     summary: Get expense totals grouped by day or category
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         example: "2026-07-01"
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         example: "2026-07-31"
 *       - in: query
 *         name: groupBy
 *         required: true
 *         schema:
 *           type: string
 *           enum: [day, category]
 *         example: "category"
 *     responses:
 *       200:
 *         description: Aggregated totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label: { type: string, example: "FOOD" }
 *                       total: { type: string, example: "25000.00" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */

/**
 * @openapi
 * /v1/api/expenses/{id}:
 *   get:
 *     summary: Get a single expense by ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Expense found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Expense' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
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
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: All fields are optional — only provided fields are updated
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 8000
 *               currency:
 *                 type: string
 *                 example: "MMK"
 *               categoryId:
 *                 type: string
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, KBZ_PAY, AYA_PAY, ONLINE_PAYMENT]
 *               description:
 *                 type: string
 *                 example: "Updated note"
 *               spentAt:
 *                 type: string
 *                 format: date
 *                 example: "2026-07-06"
 *     responses:
 *       200:
 *         description: Expense updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Expense updated successfully" }
 *                 data: { $ref: '#/components/schemas/Expense' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
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
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Expense deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Expense deleted successfully" }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
