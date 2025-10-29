import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPastResults, fetchLatestResult, fetchResultById } from "../services/api";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";

type Result = {
  id?: string;
  quizTitle: string;
  score: number;
  total: number;
  createdAt: number;
  user?: string;
  displayId?: string; // Added for generated results
};

const Results = () => {
  const { id } = useParams();
  const [result, setResult] = useState<Result | null>(null);
  const [pastResults, setPastResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const percentage = result ? (result.score / result.total) * 100 : 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Fetch single result by ID or latest result
        let resultData = null;
        if (id) {
          console.log("🔍 Fetching specific result:", id);
          resultData = await fetchResultById(id);
        } else {
          console.log("🔍 Fetching latest result");
          resultData = await fetchLatestResult();
        }
        setResult(resultData);

        // Fetch all past results
        console.log("🔍 Fetching past results");
        const allResults = await fetchPastResults();
        setPastResults(allResults);
        
        console.log("✅ Results loaded successfully");
      } catch (err: any) {
        console.error("❌ Failed to load results:", err);
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const exportCSV = (r: Result) => {
    const csvData = [
      ["Quiz Title", "Score", "Total", "Percentage", "Date"],
      [
        r.quizTitle,
        r.score,
        r.total,
        `${((r.score / r.total) * 100).toFixed(1)}%`,
        new Date(r.createdAt).toLocaleString(),
      ],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${r.quizTitle}-result.csv`);
  };

  const exportDOCX = async (r: Result) => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Quiz Result Summary", bold: true, size: 32 }),
              ],
            }),
            new Paragraph(""),
            new Paragraph(`Quiz Title: ${r.quizTitle}`),
            new Paragraph(`Score: ${r.score}/${r.total}`),
            new Paragraph(`Percentage: ${((r.score / r.total) * 100).toFixed(1)}%`),
            new Paragraph(`Date: ${new Date(r.createdAt).toLocaleString()}`),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${r.quizTitle}-result.docx`);
  };

  if (error) {
    return (
      <div className="text-center text-red-600 mt-10">
        <p className="text-lg font-medium mb-2">Error loading results</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading)
    return (
      <div className="text-center text-gray-600 mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p>Loading results...</p>
      </div>
    );

  if (!result)
    return (
      <div className="text-center text-gray-600 mt-10">
        <p className="text-lg font-medium mb-2">No results found.</p>
        <p className="text-sm">Take a quiz to see your results here!</p>
      </div>
    );

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 py-12 px-6 flex flex-col items-center gap-10">
      {/* Current Result */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-emerald-700 mb-6 text-center border-b pb-3">
          Quiz Result
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative flex items-center justify-center">
            <svg className="w-32 h-32 -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="10" fill="transparent" />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={
                  percentage >= 70
                    ? "#16a34a"
                    : percentage >= 40
                    ? "#facc15"
                    : "#dc2626"
                }
                strokeWidth="10"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - percentage / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-2xl font-semibold text-gray-800">
              {percentage.toFixed(0)}%
            </span>
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{result.quizTitle}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {new Date(result.createdAt).toLocaleString()}
            </p>
            <p className="text-lg font-medium text-gray-700">
              Score: <span className="text-emerald-600 font-bold">{result.score} / {result.total}</span>
            </p>
            {result.displayId && result.displayId.startsWith("generated-") && (
              <p className="text-xs text-gray-500 mt-2">
                Generated Quiz Result
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => exportCSV(result)}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportDOCX(result)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Export DOCX
          </button>
        </div>
      </div>

      {/* Past Results */}
      {pastResults.length > 0 && (
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-lg p-6 animate-fade-in">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4 text-center border-b pb-2">
            Past Results
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">Quiz Title</th>
                  <th className="p-2 border">Score</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Percentage</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastResults.map((r) => {
                  const pct = ((r.score / r.total) * 100).toFixed(1);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="p-2 border">{r.quizTitle}</td>
                      <td className="p-2 border">{r.score}</td>
                      <td className="p-2 border">{r.total}</td>
                      <td className="p-2 border">{pct}%</td>
                      <td className="p-2 border">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="p-2 border flex gap-2">
                        <button
                          onClick={() => exportCSV(r)}
                          className="px-2 py-1 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700 transition"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => exportDOCX(r)}
                          className="px-2 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                        >
                          DOCX
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
};

export default Results;