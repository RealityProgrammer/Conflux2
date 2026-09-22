import {Separator} from "radix-ui";
import {NavLink, Outlet} from "react-router";
import type {ReactNode} from "react";

export default function SettingsLayout() {
  return (
    <div className="w-dvw h-dvh grid grid-cols-5 text-white">
      <aside className="col-span-1 bg-gray-725 border-r-2 border-r-gray-600 p-2 overflow-y-auto scrollbar-none">
        <p className="group-label">Group 1</p>

        <div className="flex flex-col gap-1">
          <NavigateLink to="profile">Profile</NavigateLink>
        </div>

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>
      </aside>

      <section className="col-span-4 bg-gray-675 overflow-y-auto scrollbar-none p-2">
        <Outlet/>
      </section>
    </div>
  );
}

function NavigateLink({to, children}: {to: string, children: ReactNode}) {
  return (
    <NavLink
      to={`/settings/${encodeURIComponent(to)}`}
      className={({ isActive }) =>
        `px-3 py-1 rounded-full text-left cursor-pointer transition-colors ${
          isActive ? "bg-gray-600 text-white" : "hover-highlight text-gray-300"
        }`
      }
    >
      {children}
    </NavLink>
  );
}