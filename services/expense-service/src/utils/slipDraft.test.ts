import { test } from "node:test";
import assert from "node:assert/strict";
import { sniffImageMime, toDraft } from "./slipDraft";

const categories = [
  { id: "c1", name: "FOOD" },
  { id: "c2", name: "TRANSPORT" },
];

test("valid answer maps to a draft", () => {
  const draft = toDraft(
    { amount: 12500, category: "food", paymentMethod: "KBZ_PAY", date: "2026-10-20", note: " Lunch at Feel " },
    categories,
    "2026-10-23",
  );
  assert.deepEqual(draft, {
    amount: "12500.00",
    categoryId: "c1",
    category: "FOOD",
    paymentMethod: "KBZ_PAY",
    spentAt: "2026-10-20",
    description: "Lunch at Feel",
  });
});

test("invalid fields become null", () => {
  for (const date of ["2026-12-01", "2026-02-31", "20/10/2026", ""]) {
    const draft = toDraft({ amount: 0, category: "PETS", paymentMethod: "BITCOIN", date, note: "  " }, categories, "2026-10-23");
    assert.deepEqual(Object.values(draft), [null, null, null, null, null, null], date);
  }
  assert.equal(toDraft({ amount: "5000" }, categories, "2026-10-23").amount, null);
  assert.equal(toDraft({ amount: 5000.505 }, categories, "2026-10-23").amount, "5000.51");
});

test("image type sniffing", () => {
  assert.equal(sniffImageMime("/9j/4AAQ"), "image/jpeg");
  assert.equal(sniffImageMime("iVBORw0KGgo"), "image/png");
  assert.equal(sniffImageMime("UklGRiQAAABXRUJQ"), "image/webp");
  assert.equal(sniffImageMime("R0lGODlh"), null);
});
