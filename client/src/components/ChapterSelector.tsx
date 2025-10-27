import { useState } from "react";
import type { Chapter } from "../utils/types";

interface Props {
  chapters: Chapter[];
  onConfirm: (selected: Chapter[]) => void;
  onCancel?: () => void;
}

const ChapterSelector = ({ chapters, onConfirm, onCancel }: Props) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isQuarterMode = chapters.some((c) => c.title.startsWith("Quarter"));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl w-full mx-4">
      <h2 className="text-2xl font-bold mb-3 text-emerald-700 text-center">
        {isQuarterMode ? "Select Document Quarters" : "Select Chapters for Quiz"}
      </h2>
      <p className="text-gray-600 text-sm mb-5 text-center">
        {isQuarterMode
          ? "Choose one or more document quarters to generate questions from."
          : "Select which chapters to include in your quiz."}
      </p>

      <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
        {chapters.map((ch, i) => {
          const id = ch.title || `chapter-${i}`;
          return (
            <label
              key={id}
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={() => toggle(id)}
                className="h-4 w-4 text-emerald-600"
              />
              <span className="text-sm text-gray-800">
                {ch.title || `Chapter ${i + 1}`}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 mt-5">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => {
            const selectedChapters = chapters.filter((c, i) =>
              selected.includes(c.title || `chapter-${i}`)
            );
            onConfirm(selectedChapters);
          }}
          disabled={selected.length === 0}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            selected.length
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-emerald-300 cursor-not-allowed"
          }`}
        >
          Generate Quiz
        </button>
      </div>
    </div>
  );
};

export default ChapterSelector;
