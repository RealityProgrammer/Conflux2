import {Separator} from "radix-ui";
import {Outlet, useNavigate} from "react-router";
import type {ReactNode} from "react";

export default function SettingsLayout() {
  return (
    <div className="w-dvw h-dvh grid grid-cols-5 text-white">
      <aside className="col-span-1 bg-gray-725 border-r-2 border-r-gray-600 p-2 overflow-y-auto scrollbar-none">
        <p className="group-label">Group 1</p>

        <div className="flex flex-col gap-1">
          <NavigateButton to="1-1">Section 1</NavigateButton>
          <NavigateButton to="1-2">Section 2</NavigateButton>
          <NavigateButton to="1-3">Section 3</NavigateButton>
          <NavigateButton to="1-4">Section 4</NavigateButton>
        </div>

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>

        <p className="group-label">Group 2</p>

        <div className="flex flex-col gap-1">
          <NavigateButton to="2-1">Section 1</NavigateButton>
          <NavigateButton to="2-2">Section 2</NavigateButton>
          <NavigateButton to="2-3">Section 3</NavigateButton>
          <NavigateButton to="2-4">Section 4</NavigateButton>
        </div>

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>

        <p className="group-label">Group 3</p>

        <div className="flex flex-col gap-1">
          <NavigateButton to="3-1">Section 1</NavigateButton>
          <NavigateButton to="3-2">Section 2</NavigateButton>
          <NavigateButton to="3-3">Section 3</NavigateButton>
          <NavigateButton to="3-4">Section 4</NavigateButton>
        </div>

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>

        <p className="group-label">Group 4</p>

        <div className="flex flex-col gap-1">
          <NavigateButton to="4-1">Section 1</NavigateButton>
          <NavigateButton to="4-2">Section 2</NavigateButton>
          <NavigateButton to="4-3">Section 3</NavigateButton>
          <NavigateButton to="4-4">Section 4</NavigateButton>
        </div>

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>

        <p className="group-label">Group 5</p>

        <div className="flex flex-col gap-1">
          <NavigateButton to="5-1">Section 1</NavigateButton>
          <NavigateButton to="5-2">Section 2</NavigateButton>
          <NavigateButton to="5-3">Section 3</NavigateButton>
          <NavigateButton to="5-4">Section 4</NavigateButton>
        </div>
      </aside>

      <section className="col-span-4 bg-gray-675 overflow-y-auto scrollbar-none p-2">
        <Outlet/>
      </section>
    </div>
  );
}

function NavigateButton({to, children}: {to: string, children: ReactNode}) {
  const navigate = useNavigate();

  return (
    <button
      className="hover-highlight px-3 py-1 rounded-full text-left cursor-pointer"
      onClick={() => {
        navigate(`/settings/${encodeURIComponent(to)}`)
      }}
    >
      {children}
    </button>
  );
}