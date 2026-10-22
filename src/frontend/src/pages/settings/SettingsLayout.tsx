import {Separator} from "radix-ui";
import {NavLink, Outlet, useNavigate} from "react-router";
import type {ReactNode} from "react";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {BsArrowLeft} from "react-icons/bs";

export default function SettingsLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-dvw h-dvh flex flex-row text-white">
      <aside className="w-80 flex-none bg-gray-725 border-r-2 border-r-gray-600 p-2 overflow-y-auto scrollbar-none space-y-2">
        <button
          onClick={() => navigate(-1)} // Or replace with a specific path like navigate('/chat')
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-gray-300 hover:text-white hover-highlight transition-colors text-sm font-medium cursor-pointer group"
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

        <Separator.Root decorative className="flex-1 horizontal-separator my-3"/>

        <section>
          <p className="group-label text-red-500!">Danger</p>
          
          <div className="space-y-1 p-1 bg-red-400/10 border-2 border-red-500/40 rounded-md">
            <NavigateLink to="delete-account" className="text-red-400! font-semibold">Delete account</NavigateLink>

            <button
              className="w-full px-3 py-1.5 text-left cursor-pointer text-red font-semibold hover-highlight text-red-400 rounded-lg"
              onClick={() => {
                auth.logout();
              }}
            >
              Logout
            </button>
          </div>
        </section>
      </aside>

      <section className="w-full @container col-span-4 bg-gray-675 overflow-y-auto scrollbar-none p-2">
        <Outlet/>
      </section>
    </div>
  );
}

function NavigateLink({to, children, className = ""}: {to: string, children: ReactNode, className?: string}) {
  return (
    <NavLink
      to={`/settings/${encodeURIComponent(to)}`}
      className={({ isActive }) =>
        `block px-3 py-1.5 rounded-lg text-left cursor-pointer ${
          isActive ? "text-white bg-white/10" : "hover-highlight text-gray-300"
        } ${className}`
      }
    >
      {children}
    </NavLink>
  );
}