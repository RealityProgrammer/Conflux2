import Logo from "../components/Logo.tsx";
import NavLink from "../components/NavLink.tsx";
import PageTitle from "../components/PageTitle.tsx";

export default function HomePage(){
    return (
        <>
            <PageTitle title="Homepage"/>

            <div className="fixed inset-0 z-[-1] bg-gray-900"></div>

            <header className="bg-[#071318] w-full border-b-2 border-b-[#353535] px-6 py-2 flex flex-row items-center">
                <section className="flex-none inline-flex flex-row justify-start items-center gap-4">
                    <Logo className="size-14"/>

                    <button
                        className="border-2 border-indigo-500/30 size-12 py-2 rounded-full flex flex-col justify-around items-center cursor-pointer lg:hidden">

                        <span className="w-3/5 h-0.75 bg-[#4e4e4e]"></span>
                        <span className="w-3/5 h-0.75 bg-[#4e4e4e]"></span>
                        <span className="w-3/5 h-0.75 bg-[#4e4e4e]"></span>
                    </button>
                </section>

                <nav className="flex-3 overflow-y-auto flex flex-row gap-2 px-6 justify-center">
                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#">
                        Home
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#">
                        Safety
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#">
                        Blog
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
                        Download
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#">
                        About
                    </NavLink>
                </nav>

                <section className="flex-1">
                    <div className="button-group justify-end">
                        <NavLink to={{ pathname: "/auth", hash: "login" }} className="text-white py-2 font-bold border-indigo-500/30 grow-0 shrink basis-24 text-center shimmer">Login</NavLink>
                        <NavLink to={{ pathname: "/auth", hash: "register" }} className="text-white py-2 font-bold border-indigo-500/30 grow-0 shrink basis-24 text-center shimmer">Register</NavLink>
                    </div>
                </section>
            </header>

            <section>
                <h1 className="font-bold text-2xl leading-tight text-white pl-8 pt-8">
                    insert cool homepage here
                </h1>
            </section>
        </>
    );
}