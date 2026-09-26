import {useCallStore} from "../store/useCallStore.ts";
import interact from "interactjs";
import type {ResizeEvent} from "@interactjs/actions/resize/plugin";
import type {InteractEvent} from "@interactjs/core/InteractEvent";
import {useEffect, useRef} from "react";
import IconButton from "./IconButton.tsx";
import {FaExpand, FaMinus, FaXmark} from "react-icons/fa6";

export default function CallOverlay() {
  const calls = useCallStore((state) => state.calls);

  return (
    <section className="fixed inset-0 z-100000 pointer-events-none overflow-hidden">
      {calls.map((call, index) => (
        <CallWindow key={index}/>
      ))}
    </section>
  )
}

let highestZIndex = 1;

function CallWindow() {
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
        margin: 4,

        listeners: {
          move: (event: ResizeEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            let x: number = (parseFloat(target.getAttribute('data-x') || "0") || 0);
            let y: number = (parseFloat(target.getAttribute('data-y') || "0") || 0);

            target.style.width = event.rect.width + 'px'
            target.style.height = event.rect.height + 'px'

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
      className="pointer-events-auto absolute bg-gray-750 shadow-md border-2 border-gray-600 rounded-md overflow-hidden flex flex-col"
      style={{
        width: "400px",
        height: "225px",
      }}
    >
      <header
        className="drag-handle bg-gray-775 px-3 py-2 flex flex-row justify-between items-center select-none border-b-2 border-gray-600"
      >
        <span className="text-gray-200 text-sm font-semibold truncate pointer-events-none">
          Insert title here
        </span>

        <div className="flex gap-3 pointer-events-auto cursor-default">
          <IconButton theme="default">
            <FaMinus className="size-4"/>
          </IconButton>

          <IconButton theme="default">
            <FaExpand className="size-4"/>
          </IconButton>

          <IconButton theme="danger">
            <FaXmark className="size-5"/>
          </IconButton>
        </div>
      </header>

      <section className="flex-1 bg-black relative">
      </section>
    </div>
  )
}