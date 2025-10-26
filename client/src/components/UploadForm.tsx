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
    if (e.target.files) setFile(e.target.files[0]);
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
    } catch (err) {
      console.error("❌ Chapter extraction error:", err);
      alert("Could not extract chapters from this document.");
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
    if (file) await handleExtractChapters();
    else await handleSubmitCore();
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg border max-w-3xl mx-auto space-y-5"
      >
        <h2 className="text-2xl font-bold text-center text-teal-700">
          Upload Document or Paste Text
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.pptx,.xlsx,.txt,.csv,.epub,.jpg,.png"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Max 25MB • Supports PDF, Word, PowerPoint, Excel, EPUB, TXT, and images
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste Text
            </label>
            <textarea
              placeholder="Paste text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex-1">
            <span className="text-gray-700 font-medium text-sm"># Questions</span>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 text-sm"
            >
              {[5, 10, 15, 20, 25, 30].map((n) => (
                <option key={n} value={n}>
                  {n} Questions
                </option>
              ))}
            </select>
          </label>

          <label className="flex-1">
            <span className="text-gray-700 font-medium text-sm">Difficulty</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 text-sm"
            >
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-600 text-white py-3 rounded-md font-medium hover:bg-teal-700 transition disabled:opacity-50"
        >
          {loading ? "Processing..." : "Generate Quiz"}
        </button>
      </form>

      {showSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
