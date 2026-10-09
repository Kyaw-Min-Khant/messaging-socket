import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import type { ExpenseCategoryItem } from "../../types";
import { createCategory, deleteCategory, updateCategory } from "../../api/expenses";
import { BottomSheet } from "./BottomSheet";
import { categoryLabel } from "./categoryStyle";
import { CategoryIcon, errorMessage, inputClasses } from "./ui";

export function CategoriesSheet({
  categories,
  onChanged,
  onClose,
}: {
  categories: ExpenseCategoryItem[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const custom = categories.filter((c) => c.userId);
  const defaults = categories.filter((c) => !c.userId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name });
        toast.success("Category renamed");
      } else {
        await createCategory({ name });
        toast.success("Category added");
      }
      setName("");
      setEditingId(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: ExpenseCategoryItem) => {
    if (!window.confirm(`Delete category ${categoryLabel(category.name)}?`)) return;
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted");
      if (editingId === category.id) {
        setEditingId(null);
        setName("");
      }
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete category"));
    }
  };

  return (
    <BottomSheet title="Categories" subtitle="Add your own alongside the defaults" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={editingId ? "New name" : "e.g. Pets"}
          maxLength={100}
          className={inputClasses}
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="shrink-0 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {editingId ? "Rename" : "Add"}
        </button>
      </form>

      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Yours</p>
      {custom.length === 0 ? (
        <p className="text-sm text-gray-500 mb-5">None yet.</p>
      ) : (
        <div className="space-y-1 mb-5">
          {custom.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-2xl px-2 py-2 ${editingId === c.id ? "bg-indigo-500/10" : ""}`}
            >
              <CategoryIcon category={c.name} size="sm" />
              <button
                onClick={() => {
                  setEditingId(c.id);
                  setName(c.name);
                }}
                className="flex-1 text-left text-sm text-gray-200"
              >
                {categoryLabel(c.name)}
                <span className="block text-[11px] text-gray-500">Tap to rename</span>
              </button>
              <button
                onClick={() => handleDelete(c)}
                aria-label={`Delete ${c.name}`}
                className="p-2 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Defaults</p>
      <div className="flex flex-wrap gap-1.5">
        {defaults.map((c) => (
          <span key={c.id} className="text-xs text-gray-400 bg-gray-800 rounded-full px-2.5 py-1">
            {categoryLabel(c.name)}
          </span>
        ))}
      </div>
    </BottomSheet>
  );
}
