import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import type { ExpenseCategoryItem } from "../../types";
import { createCategory, deleteCategory, updateCategory } from "../../api/expenses";
import { DELETE_ICON, EDIT_ICON, IconButton, Modal, errorMessage, inputClasses } from "./ui";

export function CategoryManagerModal({
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
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    try {
      await deleteCategory(category.id);
      toast.success("Category deleted");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete category"));
    }
  };

  return (
    <Modal title="Categories" subtitle="Add your own categories alongside the defaults">
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
          className="shrink-0 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {editingId ? "Rename" : "Add"}
        </button>
      </form>

      <p className="text-xs text-gray-500 mb-2">Your categories</p>
      {custom.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">None yet.</p>
      ) : (
        <div className="space-y-1 mb-4">
          {custom.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
              <span className="text-sm text-gray-200">{c.name}</span>
              <div className="flex gap-1">
                <IconButton
                  title="Rename"
                  path={EDIT_ICON}
                  onClick={() => {
                    setEditingId(c.id);
                    setName(c.name);
                  }}
                />
                <IconButton title="Delete" path={DELETE_ICON} danger onClick={() => handleDelete(c)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mb-2">Defaults</p>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {defaults.map((c) => (
          <span key={c.id} className="text-xs text-gray-400 bg-gray-800 rounded-md px-2 py-1">
            {c.name}
          </span>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors"
      >
        Done
      </button>
    </Modal>
  );
}
