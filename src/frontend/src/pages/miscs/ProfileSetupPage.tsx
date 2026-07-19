import {BsArrowLeft, BsArrowRepeat, BsArrowRight, BsCheck, BsX} from "react-icons/bs";
import { useState, useRef, useEffect, useActionState } from "react";
import { animate, utils } from "animejs";
import SelectableAvatar from "../../components/SelectableAvatar.tsx";
import Spinner from "../../components/Spinner.tsx";
import { userService } from "../../api/userService.ts";
import type { ApiResponse } from "../../api/apiResponse.ts";
import { HttpStatusCode } from "axios";
import { useAuthorization } from "../../contexts/AuthContext.tsx";
import { Label } from "radix-ui";
import { type AvatarOperation, SetAvatar, DeleteAvatar, NoAvatarModification } from "../../api/requests.ts";

enum DisplayingPanel {
    Intro = 0,
    Avatar = 1,
    Name = 2,
    Complete = 3,
}

interface PanelProps {
    setDisplayingPanel: (panel: DisplayingPanel) => void;
}

function IntroPanel({ setDisplayingPanel }: PanelProps) {
    return (
        <section className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-2">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Hold up</h1>
                <p className="mt-2 text-center">Before going further, you need to setup your profile first!</p>
            </header>

            <p className="text-sm text-gray-400 text-center mt-2">You don't want to be an unknown, don't you?</p>

            <footer className="flex flex-none flex-row justify-center mt-2">
                <button type="button" className="button-primary inline-flex flex-row items-center py-2!" onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}>
                    Show me the way

                    <BsArrowRight className="ml-2 size-6 fill-white"/>
                </button>
            </footer>
        </section>
    );
}

interface AvatarPanelProps extends PanelProps {
    avatarOperation: AvatarOperation;
    setAvatarOperation: (operation: AvatarOperation) => void;
}

function AvatarPanel({ setDisplayingPanel, avatarOperation, setAvatarOperation }: AvatarPanelProps) {
    const [isApplying, setIsApplying] = useState(false);

    const auth = useAuthorization();
    const hasAvatar = auth.userProfile?.hasAvatar ?? false;

    const userOriginalAvatarUrl = auth.userAuthorization?.id == null || !hasAvatar ?
        null :
        userService.getAvatarUrl(auth.userAuthorization.id, false)

    const applyAvatar = async () => {
        switch (avatarOperation.type) {
            case "noMod":
                setDisplayingPanel(DisplayingPanel.Name);
                break;

            case "delete": {
                setIsApplying(true);

                const response: ApiResponse = await userService.deleteAvatar();

                if (response.statusCode === HttpStatusCode.Ok || response.statusCode === HttpStatusCode.NoContent) {
                    auth.updateUserProfile({
                        hasAvatar: false,
                    });

                    setDisplayingPanel(DisplayingPanel.Name);
                } else {
                    // TODO: Report something goes wrong.
                }

                setDisplayingPanel(DisplayingPanel.Name);

                setAvatarOperation(new NoAvatarModification());
                setIsApplying(false);
                break;
            }

            case "set": {
                setIsApplying(true);

                const response: ApiResponse = await userService.uploadAvatar(avatarOperation.file);

                if (response.statusCode === HttpStatusCode.Ok) {
                    auth.updateUserProfile({
                        hasAvatar: true,
                    });

                    setDisplayingPanel(DisplayingPanel.Name);
                } else {
                    // TODO: Report something goes wrong.
                }

                setAvatarOperation(new NoAvatarModification());
                setIsApplying(false);
                break;
            }
        }
    }

    const onAvatarChanged = (file: File, previewUrl: string) => {
        setAvatarOperation(new SetAvatar(file, previewUrl));
    };

    const onAvatarDelete = () => {
        setAvatarOperation(new DeleteAvatar());
    };

    const onAvatarRevert = () => {
        setAvatarOperation(new NoAvatarModification());
    };

    return (
        <section className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-3">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Setup Avatar</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Make yourself look special</p>
            </header>

            <div className="flex-1 flex flex-row flex-nowrap justify-center items-start gap-2">
                <SelectableAvatar
                    src={avatarOperation.type == "set" ? avatarOperation.previewUrl : avatarOperation.type == "delete" ? undefined : userOriginalAvatarUrl ?? undefined}
                    onAvatarChange={onAvatarChanged}
                    className="size-64 rounded-full flex-none"
                />

                <div className="shadow-xl rounded-lg p-2 flex-none bg-gray-625 flex flex-col gap-1 flex-nowrap">
                    <button type="button" className="button-danger p-1.5! flex flex-row justify-center items-center" onClick={onAvatarDelete} disabled={avatarOperation.type === "delete" || (!hasAvatar && avatarOperation.type == "noMod")}>
                        <BsX className="fill-white size-6"/>
                    </button>

                    <button type="button" className="button-primary p-1.5! flex flex-row justify-center items-center" onClick={onAvatarRevert} disabled={avatarOperation.type === "noMod"}>
                        <BsArrowRepeat className="fill-white size-6"/>
                    </button>
                </div>
            </div>

            <footer className="flex flex-none flex-row justify-center mt-2">
                <button type="button" className="button-primary inline-flex flex-row items-center py-2!" onClick={applyAvatar}>
                    {
                        isApplying ?
                            <Spinner className="size-6 fill-white"/> :
                            <>
                                Next

                                <BsArrowRight className="ml-2 size-6 fill-white"/>
                            </>
                    }
                </button>
            </footer>
        </section>
    );
}

function ProfilePanel({ setDisplayingPanel }: PanelProps) {
    const auth = useAuthorization();

    return (
        <section className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-3">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Name yourself</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Make a name of yourself, literally</p>
            </header>

            <div className="flex-1 flex flex-row gap-2">
                <div className="flex-1">
                    <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="username">Name</Label.Root>

                    <input id="name" type="text" placeholder="Enter username" name="username"
                           className="w-full h-11 px-3 input-field"
                           defaultValue={auth.userProfile?.userName ?? ""}/>
                </div>

                <div className="flex-1">
                    <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="displayName">Display Name</Label.Root>

                    <input id="displayName" type="text" placeholder="Enter display name" name="displayName"
                           className="w-full h-11 px-3 input-field"
                           defaultValue={auth.userProfile?.displayName ?? ""}/>
                </div>
            </div>

            <footer className="flex flex-none flex-row justify-around mt-2">
                <button type="button" className="button-primary inline-flex flex-row items-center py-2!" onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}>
                    <BsArrowLeft className="mr-2 size-6 fill-white"/>

                    Previous
                </button>

                <button type="button" className="button-primary inline-flex flex-row items-center py-2!" onClick={() => setDisplayingPanel(DisplayingPanel.Complete)}>
                    Next

                    <BsArrowRight className="ml-2 size-6 fill-white"/>
                </button>
            </footer>
        </section>
    );
}

interface CompletePanelProps extends PanelProps {
    isSaving: boolean;
}

function CompletePanel({ setDisplayingPanel, isSaving }: CompletePanelProps) {
    return (
        <section className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible relative p-6">
            <header>
                <h1 className="text-center font-bold text-3xl text-white">Almost complete</h1>
            </header>

            <div className="mt-4">
                <p className="text-center text-white text-sm">
                    Well that wasn't too hard, you can now revise everything, press the Complete button if you want to
                    complete profile setup.
                </p>
            </div>

            <footer className="flex flex-none flex-row justify-around mt-2">
                <button type="button"
                        className="button-primary inline-flex flex-row items-center py-2!"
                        onClick={() => setDisplayingPanel(DisplayingPanel.Name)}
                        disabled={isSaving}
                >
                    <BsArrowLeft className="mr-2 size-6 fill-white"/>

                    Previous
                </button>

                <button type="submit"
                        className="button-success relative inline-flex flex-row justify-center items-center py-2!"
                        disabled={isSaving}
                >
                    <span className={`inline-flex flex-row items-center ${isSaving ? 'invisible' : 'visible'}`}>
                        Complete

                        <BsCheck className="ml-2 size-6 fill-white"/>
                    </span>

                    {isSaving && (
                        <span className="absolute inset-0 flex justify-center items-center">
                            <Spinner className="size-6 fill-white"/>
                        </span>
                    )}
                </button>
            </footer>
        </section>
    );
}

export default function ProfileSetupPage() {
    const [displayingPanel, setDisplayingPanel] = useState<DisplayingPanel>(DisplayingPanel.Intro);
    const previousPanel = useRef<DisplayingPanel>(displayingPanel);

    const zoomRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<HTMLFormElement | null>(null);

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

    const [avatarOperation, setAvatarOperation] = useState<AvatarOperation>(new NoAvatarModification());

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

    type State = { success: boolean, error: string | null | undefined };

    const setupProfile = async (_prevState: State, formData: FormData): Promise<State> => {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const userName = formData.get("name") as string;
        const displayName = formData.get("displayName") as string;

        const response = await userService.setupProfile(userName, displayName, avatarOperation);

        return {
            success: response.statusCode === HttpStatusCode.Ok,
            error: response.message ?? null,
        }
    };

    const [_state, formAction, isPending] = useActionState<State, FormData>(setupProfile, {
        success: false,
        error: null,
    });

    return (
        <div className="fixed bg-fixed inset-0 overflow-hidden mesh-bg-1">
            <div
                ref={zoomRef}
                className="absolute inset-0 origin-center"
            >

                <form ref={mapRef} className="absolute top-0 left-0 w-[3000px] h-[2000px] origin-top-left" action={formAction}>
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
                        <AvatarPanel setDisplayingPanel={setDisplayingPanel} avatarOperation={avatarOperation} setAvatarOperation={setAvatarOperation}/>
                    </div>

                    <div
                        id={`panel-${DisplayingPanel.Name}`}
                        className={`absolute left-[70%] top-[30%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Name ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
                    >
                        <ProfilePanel setDisplayingPanel={setDisplayingPanel}/>
                    </div>

                    <div
                        id={`panel-${DisplayingPanel.Complete}`}
                        className={`absolute left-[85%] top-[75%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Complete ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
                    >
                        <CompletePanel setDisplayingPanel={setDisplayingPanel} isSaving={isPending}/>
                    </div>
                </form>
            </div>
        </div>
    );
}