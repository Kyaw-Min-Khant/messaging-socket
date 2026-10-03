/**
 * OpenAPI 3 spec for expense-service. Served at /api-docs (UI) and /api-docs.json.
 *
 * Prefer the gateway server in Swagger UI so Try it out carries the JWT cookie
 * and the gateway stamps x-internal-secret. Hitting this service directly
 * returns 403 whenever INTERNAL_SECRET is set.
 */

const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const paymentMethod = {
  type: "string",
  enum: ["CASH", "KBZ_PAY", "AYA_PAY", "ONLINE_PAYMENT"],
  example: "CASH",
} as const;

const frequency = {
  type: "string",
  enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
  example: "MONTHLY",
} as const;

const money = {
  type: "string",
  example: "5000.00",
  description: "Decimal serialized as a 2-place string",
} as const;

const dateOnly = {
  type: "string",
  format: "date",
  example: "2026-10-01",
} as const;

const month = {
  type: "string",
  pattern: "^\\d{4}-\\d{2}$",
  example: "2026-10",
  description: "Calendar month (UTC). Defaults to the current month.",
} as const;

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiError" },
    },
  },
});

const authErrors = {
  401: errorResponse("Missing or invalid JWT"),
  403: errorResponse(
    "Request did not come through the gateway (missing or wrong x-internal-secret)",
  ),
};

export const openApiDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Expense Tracker API",
    version: "1.0.0",
    description: [
      "Daily expense tracker: expenses, custom categories, monthly budgets,",
      "income, recurring rules, and reports.",
      "",
      "**Auth.** Same JWT as the messaging app. After `POST /v1/api/auth/login`",
      "on the gateway, either:",
      "1. Click **Authorize** and paste the `token` cookie value as a Bearer token, or",
      "2. Call from the same browser origin so the httpOnly cookie is sent.",
      "",
      "**Try it out.** Select the *Local gateway* server. Direct calls to this",
      "process are rejected with 403 when `INTERNAL_SECRET` is set.",
    ].join("\n"),
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local gateway (recommended — stamps x-internal-secret)",
    },
    {
      url: "http://localhost:4004",
      description: "Expense service direct (only when INTERNAL_SECRET is unset)",
    },
  ],
  tags: [
    { name: "Health", description: "Liveness / Postgres probe" },
    { name: "Expenses", description: "CRUD and daily/category totals" },
    { name: "Categories", description: "Global defaults plus per-user custom categories" },
    { name: "Budgets", description: "Monthly limits (overall or per category)" },
    { name: "Income", description: "Income entries" },
    { name: "Recurring", description: "Rules that generate expenses on a schedule" },
    { name: "Reports", description: "Monthly rollup and CSV export" },
  ],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JWT from POST /v1/api/auth/login (DevTools → Application → Cookies → token).",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "token",
        description: "httpOnly JWT cookie set by the auth service on login.",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string", example: "Validation error message" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 42 },
          totalPages: { type: "integer", example: 3 },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: uuid },
          userId: {
            type: "string",
            nullable: true,
            description: "null = global default seeded for everyone",
            example: null,
          },
          name: { type: "string", example: "FOOD" },
          description: {
            type: "string",
            nullable: true,
            example: "Groceries, restaurants, and food delivery",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Expense: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: uuid },
          userId: { type: "string", example: "64f1a2b3c4d5e6f7a8b9c0d1" },
          amount: money,
          currency: { type: "string", example: "MMK" },
          categoryId: { type: "string", format: "uuid", example: uuid },
          category: { type: "string", example: "FOOD" },
          paymentMethod,
          description: { type: "string", nullable: true, example: "Lunch with team" },
          spentAt: dateOnly,
          recurringId: {
            type: "string",
            format: "uuid",
            nullable: true,
            description: "Set when this row was generated by a recurring rule",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      BudgetWarning: {
        type: "object",
        description: "Returned on expense create/update when a touched budget is ≥ 80% used.",
        properties: {
          budgetId: { type: "string", format: "uuid" },
          category: { type: "string", nullable: true, example: "FOOD" },
          limit: money,
          spent: money,
          percentUsed: { type: "number", example: 85.5 },
          exceeded: { type: "boolean", example: false },
        },
      },
      Budget: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: uuid },
          categoryId: {
            type: "string",
            format: "uuid",
            nullable: true,
            description: "null = overall monthly limit across all categories",
          },
          category: { type: "string", nullable: true, example: "FOOD" },
          amount: money,
          currency: { type: "string", example: "MMK" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      BudgetStatus: {
        type: "object",
        properties: {
          budgetId: { type: "string", format: "uuid" },
          categoryId: { type: "string", format: "uuid", nullable: true },
          category: { type: "string", nullable: true, example: "FOOD" },
          limit: money,
          spent: money,
          remaining: money,
          percentUsed: { type: "number", example: 42.5 },
          exceeded: { type: "boolean", example: false },
        },
      },
      Income: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: uuid },
          userId: { type: "string", example: "64f1a2b3c4d5e6f7a8b9c0d1" },
          amount: money,
          currency: { type: "string", example: "MMK" },
          source: { type: "string", example: "Salary" },
          description: { type: "string", nullable: true },
          receivedAt: dateOnly,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Recurring: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: uuid },
          amount: money,
          currency: { type: "string", example: "MMK" },
          categoryId: { type: "string", format: "uuid", example: uuid },
          category: { type: "string", example: "HOUSING" },
          paymentMethod,
          description: { type: "string", nullable: true, example: "Rent" },
          frequency,
          startDate: dateOnly,
          endDate: { type: "string", format: "date", nullable: true },
          nextRunAt: dateOnly,
          active: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      MonthlyReport: {
        type: "object",
        properties: {
          month,
          totalIncome: money,
          totalExpense: money,
          net: money,
          expenseCount: { type: "integer", example: 18 },
          byCategory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categoryId: { type: "string", format: "uuid" },
                category: { type: "string", example: "FOOD" },
                total: money,
                count: { type: "integer", example: 6 },
              },
            },
          },
          byPaymentMethod: {
            type: "array",
            items: {
              type: "object",
              properties: {
                paymentMethod,
                total: money,
                count: { type: "integer", example: 10 },
              },
            },
          },
          byDay: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: dateOnly,
                total: money,
              },
            },
          },
        },
      },
      CreateExpenseBody: {
        type: "object",
        required: ["amount", "categoryId", "spentAt"],
        properties: {
          amount: { type: "number", example: 5000, description: "Positive, max 2 decimal places" },
          currency: { type: "string", example: "MMK", default: "MMK" },
          categoryId: { type: "string", format: "uuid", example: uuid },
          paymentMethod: { ...paymentMethod, default: "CASH" },
          description: { type: "string", maxLength: 500, example: "Lunch with team" },
          spentAt: dateOnly,
        },
      },
    },
  },
  paths: {
    "/v1/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Registered before the internal-secret guard so Render can probe it directly.",
        security: [],
        responses: {
          200: {
            description: "Postgres reachable",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Expense service is running" },
                    dependencies: {
                      type: "object",
                      properties: { postgres: { type: "boolean", example: true } },
                    },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          503: { description: "Postgres unreachable" },
        },
      },
    },

    "/v1/api/expenses/categories": {
      get: {
        tags: ["Categories"],
        summary: "List default categories plus the user's own",
        responses: {
          200: {
            description: "Global categories first (userId null), then custom ones",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Category" },
                    },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create a custom category",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", maxLength: 100, example: "PETS" },
                  description: { type: "string", maxLength: 500, example: "Pet food and vet visits" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Category created (name is stored uppercase)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Category created successfully" },
                    data: { $ref: "#/components/schemas/Category" },
                  },
                },
              },
            },
          },
          409: errorResponse( "Name already exists (default or own)"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/categories/{id}": {
      put: {
        tags: ["Categories"],
        summary: "Update one of the user's custom categories",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", maxLength: 100, example: "PETS" },
                  description: { type: "string", maxLength: 500, nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Category updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Category updated successfully" },
                    data: { $ref: "#/components/schemas/Category" },
                  },
                },
              },
            },
          },
          400: errorResponse( "Default categories cannot be modified"),
          404: errorResponse( "Category not found"),
          409: errorResponse( "Name already exists"),
          ...authErrors,
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Delete an unused custom category",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Category deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Category deleted successfully" },
                  },
                },
              },
            },
          },
          400: errorResponse( "Default categories cannot be deleted"),
          409: errorResponse( "Category is still used by an expense, budget, or recurring rule"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses": {
      post: {
        tags: ["Expenses"],
        summary: "Create an expense",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateExpenseBody" },
            },
          },
        },
        responses: {
          201: {
            description: "Expense created. budgetWarnings is present when a limit is ≥ 80% used.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Expense created successfully" },
                    data: { $ref: "#/components/schemas/Expense" },
                    budgetWarnings: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BudgetWarning" },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse( "Validation error"),
          ...authErrors,
        },
      },
      get: {
        tags: ["Expenses"],
        summary: "List expenses for the current user",
        parameters: [
          { in: "query", name: "startDate", schema: dateOnly },
          { in: "query", name: "endDate", schema: dateOnly },
          {
            in: "query",
            name: "category",
            schema: { type: "string", example: "FOOD" },
            description: "Filter by category name",
          },
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: "Paginated list (newest spentAt first). Due recurring rows are materialized first.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/Expense" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/summary": {
      get: {
        tags: ["Expenses"],
        summary: "Totals grouped by day or category",
        parameters: [
          { in: "query", name: "startDate", schema: dateOnly },
          { in: "query", name: "endDate", schema: dateOnly },
          {
            in: "query",
            name: "groupBy",
            required: true,
            schema: { type: "string", enum: ["day", "category"] },
            example: "category",
          },
        ],
        responses: {
          200: {
            description: "Aggregated totals",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string", example: "FOOD" },
                          total: money,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/{id}": {
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "string", format: "uuid" },
          example: uuid,
        },
      ],
      get: {
        tags: ["Expenses"],
        summary: "Get one expense",
        responses: {
          200: {
            description: "Expense found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Expense" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Expense not found"),
          ...authErrors,
        },
      },
      put: {
        tags: ["Expenses"],
        summary: "Update an expense",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                description: "All fields optional — only provided fields are updated",
                properties: {
                  amount: { type: "number", example: 8000 },
                  currency: { type: "string", example: "MMK" },
                  categoryId: { type: "string", format: "uuid" },
                  paymentMethod,
                  description: { type: "string", example: "Updated note" },
                  spentAt: dateOnly,
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Expense updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Expense updated successfully" },
                    data: { $ref: "#/components/schemas/Expense" },
                    budgetWarnings: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BudgetWarning" },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse( "Validation error"),
          404: errorResponse( "Expense not found"),
          ...authErrors,
        },
      },
      delete: {
        tags: ["Expenses"],
        summary: "Delete an expense",
        responses: {
          200: {
            description: "Expense deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Expense deleted successfully" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Expense not found"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/budgets": {
      get: {
        tags: ["Budgets"],
        summary: "List monthly budgets",
        responses: {
          200: {
            description: "User's budgets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/Budget" } },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
      post: {
        tags: ["Budgets"],
        summary: "Create a monthly budget",
        description: "Omit categoryId for an overall limit across all categories.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: {
                  categoryId: { type: "string", format: "uuid", nullable: true },
                  amount: { type: "string", example: "300000" },
                  currency: { type: "string", example: "MMK" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Budget created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Budget created successfully" },
                    data: { $ref: "#/components/schemas/Budget" },
                  },
                },
              },
            },
          },
          409: errorResponse( "A budget already exists for this category (or overall)"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/budgets/status": {
      get: {
        tags: ["Budgets"],
        summary: "Spent vs limit for each budget in a month",
        parameters: [{ in: "query", name: "month", schema: month }],
        responses: {
          200: {
            description: "Per-budget status for the month",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        month,
                        budgets: {
                          type: "array",
                          items: { $ref: "#/components/schemas/BudgetStatus" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/budgets/{id}": {
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
      ],
      put: {
        tags: ["Budgets"],
        summary: "Update a budget's amount or currency",
        description: "categoryId cannot be changed — delete and recreate instead.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "string", example: "350000" },
                  currency: { type: "string", example: "MMK" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Budget updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Budget updated successfully" },
                    data: { $ref: "#/components/schemas/Budget" },
                  },
                },
              },
            },
          },
          400: errorResponse( "categoryId cannot be changed"),
          404: errorResponse( "Budget not found"),
          ...authErrors,
        },
      },
      delete: {
        tags: ["Budgets"],
        summary: "Delete a budget",
        responses: {
          200: {
            description: "Budget deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Budget deleted successfully" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Budget not found"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/income": {
      get: {
        tags: ["Income"],
        summary: "List income entries",
        parameters: [
          { in: "query", name: "startDate", schema: dateOnly },
          { in: "query", name: "endDate", schema: dateOnly },
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: "Paginated list (newest receivedAt first)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/Income" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
      post: {
        tags: ["Income"],
        summary: "Record income",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "source", "receivedAt"],
                properties: {
                  amount: { type: "string", example: "1500000" },
                  currency: { type: "string", example: "MMK" },
                  source: { type: "string", maxLength: 100, example: "Salary" },
                  description: { type: "string", maxLength: 500 },
                  receivedAt: dateOnly,
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Income created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Income created successfully" },
                    data: { $ref: "#/components/schemas/Income" },
                  },
                },
              },
            },
          },
          400: errorResponse( "Validation error"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/income/{id}": {
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
      ],
      get: {
        tags: ["Income"],
        summary: "Get one income entry",
        responses: {
          200: {
            description: "Income entry",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Income" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Income not found"),
          ...authErrors,
        },
      },
      put: {
        tags: ["Income"],
        summary: "Update an income entry",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "string", example: "1600000" },
                  currency: { type: "string", example: "MMK" },
                  source: { type: "string", example: "Salary" },
                  description: { type: "string", nullable: true },
                  receivedAt: dateOnly,
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Income updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Income updated successfully" },
                    data: { $ref: "#/components/schemas/Income" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Income not found"),
          ...authErrors,
        },
      },
      delete: {
        tags: ["Income"],
        summary: "Delete an income entry",
        responses: {
          200: {
            description: "Income deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Income deleted successfully" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Income not found"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/recurring": {
      get: {
        tags: ["Recurring"],
        summary: "List recurring expense rules",
        responses: {
          200: {
            description: "Rules for the current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "array", items: { $ref: "#/components/schemas/Recurring" } },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
      post: {
        tags: ["Recurring"],
        summary: "Create a recurring expense",
        description:
          "Past occurrences since startDate (up to today, max 366) are generated immediately. Later due rows are materialized on the next list/report/status call.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "categoryId", "frequency", "startDate"],
                properties: {
                  amount: { type: "string", example: "250000" },
                  currency: { type: "string", example: "MMK" },
                  categoryId: { type: "string", format: "uuid" },
                  paymentMethod,
                  description: { type: "string", example: "Rent" },
                  frequency,
                  startDate: dateOnly,
                  endDate: { type: "string", format: "date", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Rule created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Recurring expense created successfully" },
                    data: { $ref: "#/components/schemas/Recurring" },
                  },
                },
              },
            },
          },
          400: errorResponse( "Validation error"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/recurring/{id}": {
      parameters: [
        { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
      ],
      get: {
        tags: ["Recurring"],
        summary: "Get a recurring rule",
        responses: {
          200: {
            description: "Rule",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Recurring" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Recurring expense not found"),
          ...authErrors,
        },
      },
      put: {
        tags: ["Recurring"],
        summary: "Update a rule",
        description: "Changes apply to future occurrences only. Already generated expenses are kept.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "string", example: "260000" },
                  currency: { type: "string", example: "MMK" },
                  categoryId: { type: "string", format: "uuid" },
                  paymentMethod,
                  description: { type: "string", nullable: true },
                  frequency,
                  startDate: dateOnly,
                  endDate: { type: "string", format: "date", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Rule updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Recurring expense updated successfully" },
                    data: { $ref: "#/components/schemas/Recurring" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Recurring expense not found"),
          ...authErrors,
        },
      },
      delete: {
        tags: ["Recurring"],
        summary: "Delete a rule",
        description: "Generated expenses are kept; recurringId on those rows is set to null.",
        responses: {
          200: {
            description: "Rule deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Recurring expense deleted successfully" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Recurring expense not found"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/recurring/{id}/pause": {
      post: {
        tags: ["Recurring"],
        summary: "Pause a rule",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Rule paused",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Recurring expense paused" },
                    data: { $ref: "#/components/schemas/Recurring" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Recurring expense not found"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/recurring/{id}/resume": {
      post: {
        tags: ["Recurring"],
        summary: "Resume a rule",
        description: "The paused period is not back-filled. Generation continues from nextRunAt.",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: {
            description: "Rule resumed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Recurring expense resumed" },
                    data: { $ref: "#/components/schemas/Recurring" },
                  },
                },
              },
            },
          },
          404: errorResponse( "Recurring expense not found"),
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/reports/monthly": {
      get: {
        tags: ["Reports"],
        summary: "Monthly income, expense, net, and breakdowns",
        parameters: [{ in: "query", name: "month", schema: month }],
        responses: {
          200: {
            description: "Month rollup. Due recurring expenses are materialized first.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/MonthlyReport" },
                  },
                },
              },
            },
          },
          ...authErrors,
        },
      },
    },

    "/v1/api/expenses/reports/export": {
      get: {
        tags: ["Reports"],
        summary: "Download expenses or income as CSV",
        parameters: [
          {
            in: "query",
            name: "type",
            schema: { type: "string", enum: ["expense", "income"], default: "expense" },
          },
          { in: "query", name: "from", schema: dateOnly, description: "Defaults to the first day of the current month" },
          { in: "query", name: "to", schema: dateOnly, description: "Defaults to the last day of the current month" },
        ],
        responses: {
          200: {
            description: "UTF-8 CSV with BOM (Excel-friendly). Max 10,000 rows.",
            content: {
              "text/csv": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          400: errorResponse( "type must be expense or income"),
          ...authErrors,
        },
      },
    },
  },
};
