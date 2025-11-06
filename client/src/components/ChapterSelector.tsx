import { useState, useEffect } from "react";
import type { Chapter } from "../utils/types";

interface Props {
  chapters: Chapter[];
  onConfirm: (selected: Chapter[]) => void;
  onCancel?: () => void;
}

const ChapterSelector = ({ chapters, onConfirm, onCancel }: Props) => {
  const [selected, setSelected] = useState<string[]>([]);

  // Auto-select all chapters when component mounts
  useEffect(() => {
    if (chapters.length > 0) {
      const allIds = chapters.map((c, i) => c.title || `chapter-${i}`);
      setSelected(allIds);
    }
  }, [chapters]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelected(chapters.map((c, i) => c.title || `chapter-${i}`));
  };

  const clearAll = () => {
    setSelected([]);
  };

  const isQuarterMode = chapters.some((c) => c.title?.startsWith("Quarter"));
  const isPartMode = chapters.some((c) => c.title?.startsWith("Part"));
  const isDocumentMode = chapters.some((c) => c.title === "Document Content");

  // Determine selector mode based on chapter titles
  const getSelectorMode = () => {
    if (isQuarterMode) return "quarters";
    if (isPartMode) return "parts"; 
    if (isDocumentMode) return "document";
    return "chapters";
  };

  const selectorMode = getSelectorMode();

  const getModeTitle = () => {
    switch (selectorMode) {
      case "quarters": return "Select Document Quarters";
      case "parts": return "Select Document Parts";
      case "document": return "Select Document Sections";
      default: return "Select Chapters";
    }
  };

  const getModeDescription = () => {
    switch (selectorMode) {
      case "quarters": 
        return "Choose document quarters to generate questions from";
      case "parts":
        return "Choose document parts to generate questions from";
      case "document":
        return "Choose document sections to include in your quiz";
      default:
        return "Pick chapters to include in your quiz";
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-auto overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {getModeTitle()}
              </h2>
              <p className="text-indigo-100 text-sm">
                {selected.length} of {chapters.length} selected
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-indigo-100 text-sm">
          {getModeDescription()}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={selectAll}
            className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>
        <span className="text-sm text-slate-600 font-medium">
          {chapters.length} {selectorMode} available
        </span>
      </div>

      {/* Chapters List */}
      <div className="max-h-96 overflow-y-auto p-6 space-y-2">
        {chapters.map((ch, i) => {
          const id = ch.title || `chapter-${i}`;
          const isSelected = selected.includes(id);
          
          return (
            <label
              key={id}
              className={`group flex items-center space-x-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                isSelected
                  ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
                  : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
              }`}
            >
              {/* Custom Checkbox */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-600"
                  : "border-slate-300 group-hover:border-indigo-400"
              }`}>
                {isSelected && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(id)}
                className="sr-only"
              />
              
              {/* Chapter Info */}
              <div className="flex-1">
                <span className={`font-semibold block ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                  {ch.title || `${selectorMode.slice(0, -1)} ${i + 1}`}
                </span>
                {ch.content && (
                  <span className="text-xs text-slate-500 mt-1 block">
                    {Math.ceil(ch.content.length / 1000)} min read • {ch.content.length.toLocaleString()} chars
                  </span>
                )}
              </div>

              {/* Number Badge */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100"
              }`}>
                {i + 1}
              </div>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-600">
          {selected.length === 0 ? (
            <span>Please select at least one {selectorMode.slice(0, -1)}</span>
          ) : (
            <span className="font-semibold text-indigo-600">
              Ready to generate from {selected.length} {selected.length === 1 ? selectorMode.slice(0, -1) : selectorMode}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
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
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
              selected.length > 0
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            <span>Generate Quiz</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChapterSelector;