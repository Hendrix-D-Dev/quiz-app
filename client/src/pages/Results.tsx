import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { getAuth } from "firebase/auth";

type Result = {
  id?: string;
  quizTitle: string;
  score: number;
  total: number;
  createdAt: number;
};

const Results = () => {
  const { id } = useParams(); // receive resultId from URL
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : null;

        const url = id ? `/quiz/results/${id}` : "/quiz/results/all";
        const res = await api.get(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        setResult(res.data || null);
      } catch (err) {
        console.error("Failed to load results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  if (loading)
    return <p className="text-gray-600 text-center mt-10">Loading results...</p>;

  if (!result)
    return (
      <div className="text-center text-gray-600 mt-10">
        <p className="text-lg font-medium mb-2">No results found.</p>
        <p className="text-sm">Take a quiz to see your results here!</p>
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-blue-700 mb-8 text-center border-b pb-4">
          Quiz Result
        </h2>

        <div className="flex justify-between items-center bg-blue-50 border border-blue-100 transition-all duration-200 p-5 rounded-xl shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{result.quizTitle}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(result.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`text-xl font-bold ${
                result.score / result.total >= 0.7
                  ? "text-green-600"
                  : result.score / result.total >= 0.4
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {result.score}/{result.total}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {((result.score / result.total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Results;
