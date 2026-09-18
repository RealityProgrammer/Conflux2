export default function SuspenseFallback() {
  return (
    <div className="fixed inset-0 flex flex-row justify-center items-center bg-gray-800">
      <p className="text-white">Loading...</p>
    </div>
  )
}