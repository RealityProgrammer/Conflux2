export default function SuspenseFallback() {
  return (
    <div className="fixed inset-0 flex flex-row items-center justify-center bg-gray-800">
      <p className="text-white">Loading...</p>
    </div>
  );
}
