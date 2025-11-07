import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPastResults, fetchLatestResult, fetchResultById } from "../services/api";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle } from "docx";

type Result = {
  id?: string;
  quizTitle: string;
  score: number;
  total: number;
  percentage?: number;
  createdAt: number;
  user?: string;
  displayId?: string;
  detailedResults?: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  type?: string;
  subject?: string;
  difficulty?: string;
  timeSpent?: string;
};

const Results = () => {
  const { id } = useParams();
  const [result, setResult] = useState<Result | null>(null);
  const [pastResults, setPastResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const percentage = result?.percentage || (result ? (result.score / result.total) * 100 : 0);

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
    const headers = ["Quiz Title", "Score", "Total", "Percentage", "Date", "Type", "Subject"];
    const row = [
      r.quizTitle,
      r.score.toString(),
      r.total.toString(),
      `${(r.percentage || (r.score / r.total) * 100).toFixed(1)}%`,
      new Date(r.createdAt).toLocaleString(),
      r.type || "Generated",
      r.subject || "General"
    ];

    let csvData = [headers, row].map(row => row.join(",")).join("\n");

    // Add detailed results if available
    if (r.detailedResults && r.detailedResults.length > 0) {
      csvData += "\n\nDetailed Results:\n";
      csvData += "Question,Your Answer,Correct Answer,Status\n";
      r.detailedResults.forEach(detail => {
        csvData += `"${detail.question.replace(/"/g, '""')}","${detail.userAnswer.replace(/"/g, '""')}","${detail.correctAnswer.replace(/"/g, '""')}",${detail.isCorrect ? "Correct" : "Incorrect"}\n`;
      });
    }

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${r.quizTitle.replace(/[^a-z0-9]/gi, '_')}-detailed-result.csv`);
  };

  const exportDOCX = async (r: Result) => {
    const sections = [];

    // Title section
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({ 
              text: "QUIZ RESULT REPORT", 
              bold: true, 
              size: 36,
              color: "2E86AB"
            }),
          ],
          alignment: "center",
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: "Professional Assessment Summary", 
              bold: true,
              size: 24,
              color: "555555"
            }),
          ],
          alignment: "center",
          spacing: { after: 600 }
        }),
      ],
    });

    // Summary section
    const summaryRows = [
      ["Quiz Title", r.quizTitle],
      ["Date Completed", new Date(r.createdAt).toLocaleString()],
      ["Final Score", `${r.score} / ${r.total}`],
      ["Percentage", `${(r.percentage || (r.score / r.total) * 100).toFixed(1)}%`],
      ["Performance", getPerformanceText(r.percentage || (r.score / r.total) * 100)],
      ["Quiz Type", r.type || "AI Generated Quiz"],
      ["Subject", r.subject || "General Knowledge"],
      ["Difficulty", r.difficulty || "Custom"],
      ["Time Spent", r.timeSpent || "Not recorded"],
      ["Result ID", r.displayId || r.id || "N/A"]
    ];

    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      rows: summaryRows.map(([label, value], index) => 
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: label, bold: true, color: "333333" })],
                shading: { fill: index % 2 === 0 ? "F8F9FA" : "FFFFFF" }
              })],
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: String(value), color: "555555" })],
                shading: { fill: index % 2 === 0 ? "F8F9FA" : "FFFFFF" }
              })],
            }),
          ],
        })
      ),
    });

    sections.push({
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({ 
              text: "Assessment Summary", 
              bold: true, 
              size: 28,
              color: "2E86AB"
            }),
          ],
          spacing: { after: 300 }
        }),
        summaryTable,
        new Paragraph({ text: "", spacing: { after: 400 } }),
      ],
    });

    // Detailed results section if available
    if (r.detailedResults && r.detailedResults.length > 0) {
      sections.push({
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ 
                text: "Detailed Question Analysis", 
                bold: true, 
                size: 28,
                color: "2E86AB"
              }),
            ],
            spacing: { after: 300 }
          }),
          ...r.detailedResults.flatMap((detail, index) => [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `Question ${index + 1}: ${detail.question}`, 
                  bold: true,
                  size: 22,
                  color: "333333"
                }),
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Options: ", 
                  bold: true 
                }),
                new TextRun({ 
                  text: detail.options.join(", "),
                  color: "555555"
                }),
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Your Answer: ", 
                  bold: true 
                }),
                new TextRun({ 
                  text: detail.userAnswer,
                  color: detail.isCorrect ? "27AE60" : "E74C3C"
                }),
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Correct Answer: ", 
                  bold: true 
                }),
                new TextRun({ 
                  text: detail.correctAnswer,
                  color: "27AE60"
                }),
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: "Status: ", 
                  bold: true 
                }),
                new TextRun({ 
                  text: detail.isCorrect ? "✓ CORRECT" : "✗ INCORRECT",
                  color: detail.isCorrect ? "27AE60" : "E74C3C",
                  bold: true
                }),
              ],
              spacing: { after: 300 }
            }),
            new Paragraph({
              text: "―".repeat(50),
              alignment: "center",
              spacing: { after: 300 }
            }),
          ])
        ],
      });
    }

    // Footer section
    sections.push({
      properties: {},
      children: [
        new Paragraph({
          text: "―".repeat(80),
          alignment: "center",
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: "Generated by AI Quiz System", 
              italics: true,
              color: "888888",
              size: 18
            }),
          ],
          alignment: "center",
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ 
              text: new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              color: "888888",
              size: 16
            }),
          ],
          alignment: "center",
        }),
      ],
    });

    const doc = new Document({
      sections,
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${r.quizTitle.replace(/[^a-z0-9]/gi, '_')}-professional-report.docx`);
  };

  const getPerformanceText = (percentage: number) => {
    if (percentage >= 90) return "Outstanding - Excellent Performance";
    if (percentage >= 80) return "Very Good - Strong Understanding";
    if (percentage >= 70) return "Good - Solid Knowledge";
    if (percentage >= 60) return "Satisfactory - Adequate Understanding";
    if (percentage >= 50) return "Needs Improvement - Basic Understanding";
    return "Requires Attention - Fundamental Review Needed";
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-amber-600";
    return "text-rose-600";
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
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Current Result */}
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-emerald-700 mb-6 text-center border-b pb-3">
            Quiz Result Analysis
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Score Visualization */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl">
              <div className="relative flex items-center justify-center mb-4">
                <svg className="w-40 h-40 -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="transparent" />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={
                      percentage >= 80
                        ? "#16a34a"
                        : percentage >= 60
                        ? "#f59e0b"
                        : "#dc2626"
                    }
                    strokeWidth="12"
                    strokeDasharray={2 * Math.PI * 70}
                    strokeDashoffset={2 * Math.PI * 70 * (1 - percentage / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-3xl font-bold text-gray-800">
                  {percentage.toFixed(0)}%
                </span>
              </div>
              <p className={`text-xl font-semibold ${getPerformanceColor(percentage)} text-center`}>
                {getPerformanceText(percentage)}
              </p>
            </div>

            {/* Result Details */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">{result.quizTitle}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Completed on {new Date(result.createdAt).toLocaleString()}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{result.score}</div>
                    <div className="text-sm text-emerald-800 font-medium">Correct</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{result.total - result.score}</div>
                    <div className="text-sm text-blue-800 font-medium">Incorrect</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{result.total}</div>
                    <div className="text-sm text-purple-800 font-medium">Total</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {((result.score / result.total) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-amber-800 font-medium">Score</div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">Quiz Type:</span>
                    <span className="text-gray-600">{result.type || "AI Generated"}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium text-gray-700">Subject:</span>
                    <span className="text-gray-600">{result.subject || "General"}</span>
                  </div>
                  {result.difficulty && (
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">Difficulty:</span>
                      <span className="text-gray-600">{result.difficulty}</span>
                    </div>
                  )}
                  {result.timeSpent && (
                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">Time Spent:</span>
                      <span className="text-gray-600">{result.timeSpent}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results Toggle */}
          {result.detailedResults && result.detailedResults.length > 0 && (
            <div className="border-t pt-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <span>{showDetails ? "Hide" : "Show"} Detailed Results</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDetails && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-xl font-semibold text-gray-800">Question Analysis</h4>
                  {result.detailedResults.map((detail, index) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${
                      detail.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                          detail.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}>
                          {detail.isCorrect ? '✓' : '✗'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 mb-2">
                            Q{index + 1}: {detail.question}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Your Answer: </span>
                              <span className={detail.isCorrect ? 'text-emerald-600' : 'text-rose-600'}>
                                {detail.userAnswer}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Correct Answer: </span>
                              <span className="text-emerald-600">{detail.correctAnswer}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-8 pt-6 border-t">
            <button
              onClick={() => exportCSV(result)}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => exportDOCX(result)}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Professional Report</span>
            </button>
          </div>
        </div>

        {/* Past Results */}
        {pastResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 animate-fade-in">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 text-center border-b pb-2">
              Previous Assessments
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 border font-semibold text-gray-700">Quiz Title</th>
                    <th className="p-3 border font-semibold text-gray-700">Score</th>
                    <th className="p-3 border font-semibold text-gray-700">Percentage</th>
                    <th className="p-3 border font-semibold text-gray-700">Date</th>
                    <th className="p-3 border font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastResults.map((r) => {
                    const pct = r.percentage || (r.score / r.total) * 100;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition border-b">
                        <td className="p-3 border text-gray-800 font-medium">{r.quizTitle}</td>
                        <td className="p-3 border">
                          <span className="font-semibold">{r.score}</span>
                          <span className="text-gray-600"> / {r.total}</span>
                        </td>
                        <td className="p-3 border">
                          <span className={`font-bold ${getPerformanceColor(pct)}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 border text-gray-600">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 border">
                          <div className="flex gap-2">
                            <button
                              onClick={() => exportCSV(r)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition"
                            >
                              CSV
                            </button>
                            <button
                              onClick={() => exportDOCX(r)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                            >
                              DOCX
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Results;