import {useCallStore} from "../store/useCallStore.ts";
import interact from "interactjs";

export default function CallOverlay() {
  const calls = useCallStore((state) => state.calls);

  interact(".call-window")
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },

      listeners: {
        move: (event: Event) => {
          const target = event.target as HTMLElement | null;
          if (!target) return;

          let x: number = (parseFloat(target.getAttribute('data-x') || "0") || 0);
          let y: number = (parseFloat(target.getAttribute('data-y') || "0") || 0);

          target.style.width = event.rect.width + 'px'
          target.style.height = event.rect.height + 'px'

          x += event.deltaRect.left;
          y += event.deltaRect.top;

          target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

          target.setAttribute('data-x', String(x));
          target.setAttribute('data-y', String(y));
        },
      },
    })
    .draggable({
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: "parent",
          endOnly: true,
        }),
      ],
      autoScroll: true,
      listeners: {
        move: (event: Event) => {
          const target = event.target as HTMLElement | null;
          if (!target) return;

          const x: number = (parseFloat(target.getAttribute("data-x") || "0") || 0) + event.dx;
          const y: number = (parseFloat(target.getAttribute('data-y') || "0") || 0) + event.dy;

          target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

          target.setAttribute('data-x', String(x));
          target.setAttribute('data-y', String(y));
        },
      }
    });

  return (
    <section className="fixed inset-0 z-100000 pointer-events-none">
      {calls.map((call, index) => (
        <div
          key={index}
          className="call-window pointer-events-auto absolute bg-gray-750 shadow-md w-96 aspect-video border-2 border-gray-600 rounded-md"
        >
        </div>
      ))}
    </section>
  )
}