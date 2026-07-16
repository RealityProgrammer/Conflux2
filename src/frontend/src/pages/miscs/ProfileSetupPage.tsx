import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { useState, useRef, useEffect } from "react";
import { animate, utils } from "animejs";

enum DisplayingPanel {
    Intro = 0,
    Avatar = 1,
    Profile = 2,
    Complete = 3,
}

interface PanelProps {
    setDisplayingPanel: (panel: DisplayingPanel) => void;
}

function IntroPanel({ setDisplayingPanel }: PanelProps) {
    return (
        <section className="w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-2">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Hold up</h1>
                <p className="mt-2 text-center">Before going further, you need to setup your profile first!</p>
            </header>

            <p className="text-sm text-gray-400 text-center mt-2">You don't want to be an unknown, don't you?</p>

            <footer className="flex flex-none flex-row justify-center mt-2">
                <button className="button-primary inline-flex flex-row items-center py-2!" onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}>
                    Show me the way

                    <BsArrowRight className="ml-2 size-6 fill-white"/>
                </button>
            </footer>
        </section>
    );
}

function AvatarPanel({ setDisplayingPanel }: PanelProps) {
    return (
        <section className="w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-2">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Setup Avatar</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Make yourself look special</p>
            </header>

            <div className="flex-1">
                { /* Body goes here */ }
            </div>

            <footer className="flex flex-none flex-row justify-center mt-2">
                <button className="button-primary inline-flex flex-row items-center py-2!" onClick={() => setDisplayingPanel(DisplayingPanel.Profile)}>
                    Next

                    <BsArrowRight className="ml-2 size-6 fill-white"/>
                </button>
            </footer>
        </section>
    );
}

function ProfilePanel({ setDisplayingPanel }: PanelProps) {
    return (
        <section className="w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-2">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Setup Profile</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Make a name of yourself, literally</p>
            </header>

            <div className="flex-1">
                { /* Body goes here */ }
            </div>

            <footer className="flex flex-none flex-row justify-around mt-2">
                <button className="button-primary inline-flex flex-row items-center py-2!" onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}>
                    <BsArrowLeft className="mr-2 size-6 fill-white"/>

                    Previous
                </button>

                <button className="button-primary inline-flex flex-row items-center py-2!" onClick={() => setDisplayingPanel(DisplayingPanel.Complete)}>
                    Next

                    <BsArrowRight className="ml-2 size-6 fill-white"/>
                </button>
            </footer>
        </section>
    );
}

function CompletePanel() {
    return (
        <section className="w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative p-6">
            <h1 className="text-center font-bold text-3xl text-white">Setup Complete</h1>
            <p className="text-center text-gray-400 text-sm mt-2">One of us, one of us...</p>
        </section>
    );
}

export default function ProfileSetupPage() {
    const [displayingPanel, setDisplayingPanel] = useState<DisplayingPanel>(DisplayingPanel.Intro);
    const previousPanel = useRef<DisplayingPanel>(displayingPanel);

    const zoomRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<HTMLDivElement | null>(null);

    const teleportToPanel = (panel: DisplayingPanel) => {
        if (!mapRef.current) return;

        const targetPanel = document.getElementById(`panel-${panel}`);
        if (!targetPanel) return;

        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const targetX = screenCenterX - targetPanel.offsetLeft;
        const targetY = screenCenterY - targetPanel.offsetTop;

        utils.set(mapRef.current, {
            translateX: targetX,
            translateY: targetY,
        });
    };

    // teleport the viewport to the intro panel.
    useEffect(() => teleportToPanel(DisplayingPanel.Intro), []);

    const animateCameraMovement = () => {
        if (!mapRef.current || !zoomRef.current) return;

        const targetPanel = document.getElementById(`panel-${displayingPanel}`);
        if (!targetPanel) return;

        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const targetX = screenCenterX - targetPanel.offsetLeft;
        const targetY = screenCenterY - targetPanel.offsetTop;

        animate(mapRef.current, {
            translateX: targetX,
            translateY: targetY,
            delay: 600,
            duration: 800,
            ease: 'inOutCubic',
        });

        animate(zoomRef.current, {
            scale: [
                { to: 0.6, duration: 500, ease: 'inOut', delay: 0 },
                { to: 1.0, duration: 500, ease: 'inOut', delay: 1200 }
            ],
        });
    };

    useEffect(() => {
        if (previousPanel.current == displayingPanel) {
            return;
        }

        previousPanel.current = displayingPanel;

        animateCameraMovement();
    }, [displayingPanel]);

    useEffect(() => {
        const handleResize = () => teleportToPanel(displayingPanel);

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [displayingPanel]);

    return (
        <div className="fixed bg-fixed inset-0 overflow-hidden mesh-bg-1">
            <div
                ref={zoomRef}
                className="absolute inset-0 origin-center"
            >

                <div ref={mapRef} className="absolute top-0 left-0 w-[3000px] h-[2000px] origin-top-left">
                    <div
                        id={`panel-${DisplayingPanel.Intro}`}
                        className={`absolute left-[15%] top-[20%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Intro ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
                    >
                        <IntroPanel setDisplayingPanel={setDisplayingPanel}/>
                    </div>

                    <div
                        id={`panel-${DisplayingPanel.Avatar}`}
                        className={`absolute left-[40%] top-[60%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Avatar ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
                    >
                        <AvatarPanel setDisplayingPanel={setDisplayingPanel}/>
                    </div>

                    <div
                        id={`panel-${DisplayingPanel.Profile}`}
                        className={`absolute left-[70%] top-[30%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Profile ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
                    >
                        <ProfilePanel setDisplayingPanel={setDisplayingPanel}/>
                    </div>

                    <div
                        id={`panel-${DisplayingPanel.Complete}`}
                        className={`absolute left-[85%] top-[75%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Complete ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
                    >
                        <CompletePanel/>
                    </div>
                </div>
            </div>
        </div>
    );
}