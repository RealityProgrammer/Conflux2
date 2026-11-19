import { Separator } from "radix-ui";
import { NavLink, Outlet, useNavigate } from "react-router";
import type { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { BsArrowLeft } from "react-icons/bs";

export default function SettingsLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-dvh w-dvw flex-row text-white">
      <aside className="bg-gray-725 w-80 flex-none scrollbar-none space-y-2 overflow-y-auto border-r-2 border-r-gray-600 p-2">
        <button
          onClick={() => navigate(-1)} // Or replace with a specific path like navigate('/conversation')
          className="hover-highlight group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
        >
          <BsArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>

        <section>
          <p className="group-label">Account</p>

          <div className="space-y-1">
            <NavigateLink to="profile">Profile</NavigateLink>
            <NavigateLink to="account">Account</NavigateLink>
          </div>
        </section>

        <Separator.Root decorative className="horizontal-separator my-3 flex-1" />

        <section>
          <p className="group-label text-red-500!">Danger</p>

          <div className="space-y-1 rounded-md border-2 border-red-500/40 bg-red-400/10 p-1">
            <NavigateLink to="delete-account" className="font-semibold text-red-400!">
              Delete account
            </NavigateLink>

            <button
              className="text-red hover-highlight w-full cursor-pointer rounded-lg px-3 py-1.5 text-left font-semibold text-red-400"
              onClick={() => {
                auth.logout();
              }}
            >
              Logout
            </button>
          </div>
        </section>
      </aside>

      <section className="bg-gray-675 @container col-span-4 w-full scrollbar-none overflow-y-auto p-2">
        <Outlet />
      </section>
    </div>
  );
}

function NavigateLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <NavLink
      to={`/settings/${encodeURIComponent(to)}`}
      className={({ isActive }) =>
        `block cursor-pointer rounded-lg px-3 py-1.5 text-left ${
          isActive ? "bg-white/10 text-white" : "hover-highlight text-gray-300"
        } ${className}`
      }
    >
      {children}
    </NavLink>
  );
}
