import {Separator} from "radix-ui";
import {NavLink, Outlet} from "react-router";
import type {ReactNode} from "react";
import {useAuth} from "../../contexts/AuthContext.tsx";

export default function SettingsLayout() {
  const auth = useAuth();

  return (
    <div className="w-dvw h-dvh grid grid-cols-5 text-white">
      <aside className="col-span-1 bg-gray-725 border-r-2 border-r-gray-600 p-2 overflow-y-auto scrollbar-none">
        <p className="group-label">Account</p>

        <div className="flex flex-col gap-1">
          <NavigateLink to="profile">Profile</NavigateLink>
        </div>

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>

        <p className="group-label text-red-500!">Danger</p>

        <div className="border-2 border-red-800 bg-red-500/20 rounded-lg">
          <button
            className="w-full px-3 py-1 text-left cursor-pointer transition-colors text-red font-bold hover-highlight text-red-100"
            onClick={() => {
              auth.logout();
            }}
          >
            Logout
          </button>
        </div>
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
        `px-3 py-1 rounded-lg text-left cursor-pointer transition-colors ${
          isActive ? "text-white bg-white/10" : "hover-highlight text-gray-300"
        }`
      }
    >
      {children}
    </NavLink>
  );
}