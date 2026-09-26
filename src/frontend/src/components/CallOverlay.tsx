import {useCallStore} from "../store/useCallStore.ts";

export default function CallOverlay() {
  const calls = useCallStore((state) => state.calls);

  return (
    <section className="fixed inset-0 z-100000 pointer-events-none">
      {calls.map((call, index) => (
        <div className="absolute bg-gray-750 shadow-md w-80 aspect-video border-2 border-gray-600 rounded-md" style={{
        }}>
        </div>
      ))}
    </section>
  )
}