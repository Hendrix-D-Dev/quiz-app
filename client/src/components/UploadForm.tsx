import { useState } from "react";
import api, { extractChapters } from "../services/api";
import { getAuth } from "firebase/auth";
import ChapterSelector from "./ChapterSelector";
import type { Chapter } from "../utils/types";

type Props = { onUploadComplete: (questions?: any[]) => void };

const UploadForm = ({ onUploadComplete }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Clear text when file is selected
      setText("");
    }
  };

  const handleExtractChapters = async () => {
    if (!file) return alert("Please upload a file first.");
    setLoading(true);
    try {
      const result = await extractChapters(file);
      if (result.fallback && result.text) {
        const useFallback = confirm(
          "No chapters were detected. Would you like to divide the document into quarters and pick one for the quiz?"
        );
        if (useFallback) {
          const quarters = chunkIntoQuarters(result.text);
          setChapters(quarters);
          setShowSelector(true);
          return;
        } else {
          await handleSubmitCore();
          return;
        }
      }

      if (result.chapters.length <= 1) await handleSubmitCore();
      else {
        setChapters(result.chapters);
        setShowSelector(true);
      }
    } catch (err: any) {
      console.error("❌ Chapter extraction error:", err);
      alert(err.message || "Could not extract chapters from this document.");
    } finally {
      setLoading(false);
    }
  };

  const chunkIntoQuarters = (text: string): Chapter[] => {
    const total = text.length;
    const chunkSize = Math.floor(total / 4);
    return Array.from({ length: 4 }, (_, i) => ({
      index: i,
      title: `Quarter ${i + 1}`,
      content: text.slice(i * chunkSize, i === 3 ? total : (i + 1) * chunkSize),
    }));
  };

  const handleSubmitSelected = async (selected: Chapter[]) => {
    const selectedIndexes = selected.map((ch) => ch.index);
    setShowSelector(false);
    await handleSubmitCore(selectedIndexes);
  };

  const handleSubmitCore = async (selectedIndexes?: number[]) => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (text.trim()) formData.append("text", text.trim());
      if (selectedIndexes)
        formData.append("selectedChapterIndexes", JSON.stringify(selectedIndexes));

      formData.append("numQuestions", numQuestions.toString());
      formData.append("difficulty", difficulty);

      const auth = getAuth();
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const res = await api.post("/ai/generate-quiz", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const questions = res.data?.questions || [];
      if (!questions.length) {
        alert("No questions were generated from the selected content.");
        return onUploadComplete([]);
      }
      onUploadComplete(questions);
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      alert(err?.response?.data?.error || "Error generating quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !text.trim()) {
      return alert("Please upload a file or paste some text.");
    }
    if (file) await handleExtractChapters();
    else await handleSubmitCore();
  };

  const removeFile = () => {
    setFile(null);
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-4xl mx-auto p-8 md:p-10 space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full mb-4">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-semibold text-indigo-700">AI-Powered</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Generate Quiz Questions
          </h2>
          <p className="text-slate-600">Upload a document or paste text to create your quiz</p>
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Document
            </span>
            
            {!file ? (
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.pptx,.xlsx,.txt,.csv,.epub,.jpg,.png"
                  className="sr-only"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-indigo-200 rounded-2xl cursor-pointer bg-gradient-to-br from-indigo-50/50 to-purple-50/50 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-indigo-400 group-hover:text-indigo-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500">PDF, Word, PowerPoint, Excel, Images (Max 25MB)</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-2 hover:bg-rose-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </label>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-medium">OR</span>
            </div>
          </div>

          {/* Text Area */}
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Paste Text
            </span>
            <textarea
              placeholder="Paste your study material here... (e.g., lecture notes, textbook excerpts)"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Clear file when text is entered
                if (e.target.value.trim()) setFile(null);
              }}
              rows={6}
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-slate-50"
            />
          </label>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 mb-2 block">Number of Questions</span>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
            >
              {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => (
                <option key={n} value={n}>
                  {n} Questions
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700 mb-2 block">Difficulty Level</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all bg-white"
            >
              <option value="easy">Easy - Basic concepts</option>
              <option value="normal">Normal - Standard difficulty</option>
              <option value="medium">Medium - Challenging</option>
              <option value="hard">Hard - Advanced level</option>
            </select>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || (!file && !text.trim())}
          className="w-full btn-primary py-4 text-lg relative overflow-hidden group"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-3">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating Quiz...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Quiz with AI</span>
            </span>
          )}
        </button>

        {/* Info Banner */}
        <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Tip:</p>
            <p>For best results, upload structured content with clear topics or chapters. The AI will analyze and create relevant questions automatically.</p>
          </div>
        </div>
      </form>

      {/* Chapter Selector Modal */}
      {showSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <ChapterSelector
            chapters={chapters}
            onConfirm={handleSubmitSelected}
            onCancel={() => setShowSelector(false)}
          />
        </div>
      )}
    </>
  );
};

export default UploadForm;