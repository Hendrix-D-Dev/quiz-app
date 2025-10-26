import UploadForm from "../components/UploadForm";

const AdminDashboard = () => {
  return (
    <main className="p-6 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Admin Dashboard
      </h1>

      <UploadForm onUploadComplete={() => window.location.reload()} />

      <div className="mt-6 text-center text-gray-600 text-sm">
        After uploading a document, quizzes will appear in the quiz list.
      </div>
    </main>
  );
};

export default AdminDashboard;
