import {useEffect, useRef} from "react";
import interact from "interactjs";
import type {ResizeEvent} from "@interactjs/actions/resize/plugin";
import type {InteractEvent} from "@interactjs/core/InteractEvent";
import CallWindowContent from "./CallWindowContent.tsx";

let highestZIndex = 1;

export default function CallWindow({
  callSessionId
}: {callSessionId: string}) {
  const windowRef = useRef<HTMLDivElement>(null);

  const bringToFront = () => {
    if (windowRef.current) {
      highestZIndex += 1;
      windowRef.current.style.zIndex = String(highestZIndex);
    }
  };

  useEffect(() => {
    const element = windowRef.current;
    if (!element) return;

    bringToFront();

    const interactable = interact(element)
      .resizable({
        edges: { left: true, right: true, bottom: true, top: false },

        listeners: {
          move: (event: ResizeEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            let x: number = (parseFloat(target.getAttribute('data-x') || "0") || 0);
            let y: number = (parseFloat(target.getAttribute('data-y') || "0") || 0);

            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';

            x += event.deltaRect?.left ?? 0;
            y += event.deltaRect?.top ?? 0;

            target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

            target.setAttribute('data-x', String(x));
            target.setAttribute('data-y', String(y));
          },
        },
      })
      .draggable({
        allowFrom: '.drag-handle',
        inertia: true,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: "parent",
            endOnly: true,
          }),
        ],
        autoScroll: true,
        listeners: {
          move: (event: InteractEvent) => {
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

    return () => {
      interactable.unset();
    };
  }, []);

  return (
    <div
      ref={windowRef}
      onPointerDown={bringToFront}
      className="pointer-events-auto absolute bg-gray-750 shadow-md border-2 border-gray-600 rounded-lg overflow-hidden flex flex-col"
      style={{
        width: "400px",
        height: "225px",
      }}
    >
      <CallWindowContent callSessionId={callSessionId}/>
    </div>
  )
}