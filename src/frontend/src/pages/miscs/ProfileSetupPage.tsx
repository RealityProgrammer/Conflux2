import { BsArrowLeft, BsArrowRepeat, BsArrowRight, BsCheck, BsX } from "react-icons/bs";
import { useState, useRef, useEffect, useActionState } from "react";
import { animate, utils } from "animejs";
import SelectableAvatar from "../../components/SelectableAvatar.tsx";
import Spinner from "../../components/Spinner.tsx";
import { userService } from "../../api/userService.ts";
import { HttpStatusCode } from "axios";
import { useAuthorization } from "../../contexts/AuthContext.tsx";
import { Label } from "radix-ui";
import { type AvatarOperation, SetAvatar, DeleteAvatar, NoAvatarModification } from "../../api/requests.ts";
import type {FieldErrors} from "../../api/responses.ts";
import {useNavigate} from "react-router";

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
                <button type="button" className="button-primary inline-flex flex-row items-center py-2 px-3" onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}>
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
    fieldErrors?: FieldErrors<'avatarFile'> | null;
    clearError: (name: 'avatarFile') => void;
}

function AvatarPanel({
        setDisplayingPanel, avatarOperation, setAvatarOperation, fieldErrors, clearError
    }: AvatarPanelProps) {
    const auth = useAuthorization();
    const hasAvatar = auth.userProfile?.hasAvatar ?? false;

    const userOriginalAvatarUrl = auth.userAuthorization?.id == null || !hasAvatar ?
        null :
        userService.getAvatarUrl(auth.userAuthorization.id, false)

    const onAvatarChanged = (file: File, previewUrl: string) => {
        setAvatarOperation(new SetAvatar(file, previewUrl));
        clearError('avatarFile');
    };

    const onAvatarDelete = () => {
        setAvatarOperation(new DeleteAvatar());
        clearError('avatarFile');
    };

    const onAvatarRevert = () => {
        setAvatarOperation(new NoAvatarModification());
        clearError('avatarFile');
    };

    const hasError = !!fieldErrors?.avatarFile;

    return (
        <section className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-3">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Setup Avatar</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Make yourself look special</p>
            </header>

            <div className="flex-1 flex flex-col">
                <div className="flex flex-row flex-nowrap justify-center items-start gap-2">
                    <SelectableAvatar
                        src={avatarOperation.type == "set" ? avatarOperation.previewUrl : avatarOperation.type == "delete" ? undefined : userOriginalAvatarUrl ?? undefined}
                        onAvatarChange={onAvatarChanged}
                        className={`size-64 rounded-full flex-none ${hasError && 'ring-4 ring-red-500'}`}
                    />

                    <div className="shadow-xl rounded-lg p-2 flex-none bg-gray-625 flex flex-col gap-1 flex-nowrap">
                        <button type="button" className="button-danger p-1.5! flex flex-row justify-center items-center" onClick={onAvatarDelete} disabled={avatarOperation.type === "delete" || (!hasAvatar && avatarOperation.type == "noMod")}>
                            <BsX className="fill-white size-6"/>
                        </button>

                        <button type="button" className="button-primary p-1.5 flex flex-row justify-center items-center" onClick={onAvatarRevert} disabled={avatarOperation.type === "noMod"}>
                            <BsArrowRepeat className="fill-white size-6"/>
                        </button>
                    </div>
                </div>

                {
                    hasError && (
                        <p className="text-center text-red-500 text-sm mt-1">{fieldErrors?.avatarFile[0]}</p>
                    )
                }
            </div>

            <footer className="flex flex-none flex-row justify-center mt-2">
                <button type="button" className="button-primary inline-flex flex-row items-center px-3 py-2" onClick={() => setDisplayingPanel(DisplayingPanel.Name)}>
                    Next

                    <BsArrowRight className="ml-2 size-6 fill-white"/>
                </button>
            </footer>
        </section>
    );
}

interface NamesPanelProps extends PanelProps {
    fieldErrors?: FieldErrors<'userName' | 'displayName'> | null;
    clearError: (name: 'userName' | 'displayName') => void;
}

function NamesPanel({ setDisplayingPanel, fieldErrors, clearError }: NamesPanelProps) {
    const auth = useAuthorization();

    const [userName, setUserName] = useState(auth.userProfile?.userName ?? "???");
    const [displayName, setDisplayName] = useState(auth.userProfile?.displayName ?? "???");

    return (
        <section className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-3">
            <header className="flex-none">
                <h1 className="text-center font-bold text-3xl text-white">Name yourself</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Make a name of yourself, literally</p>
            </header>

            <div className="flex-1 flex flex-row gap-2">
                <div className="flex-1">
                    <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="username">Name</Label.Root>

                    <input id="userName" type="text" placeholder="Enter username" name="userName"
                           className="w-full h-11 px-3 input-field"
                           value={userName}
                           onChange={(e) => {
                               setUserName(e.target.value);
                               clearError('userName');
                           }}/>

                    {
                        fieldErrors?.userName && (
                            <p className="text-center text-red-500 text-sm mt-1">{fieldErrors?.userName[0]}</p>
                        )
                    }
                </div>

                <div className="flex-1">
                    <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="displayName">Display Name</Label.Root>

                    <input id="displayName" type="text" placeholder="Enter display name" name="displayName"
                           className="w-full h-11 px-3 input-field"
                           value={displayName}
                           onChange={(e) => {
                               setDisplayName(e.target.value);
                               clearError('displayName');
                           }}/>

                    {
                        fieldErrors?.displayName && (
                            <p className="text-center text-red-500 text-sm mt-1">{fieldErrors?.displayName[0]}</p>
                        )
                    }
                </div>
            </div>

            <footer className="flex flex-none flex-row justify-around mt-2">
                <button type="button" className="button-primary inline-flex flex-row items-center px-3 py-2" onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}>
                    <BsArrowLeft className="mr-2 size-6 fill-white"/>

                    Previous
                </button>

                <button type="button" className="button-primary inline-flex flex-row items-center px-3 py-2" onClick={() => setDisplayingPanel(DisplayingPanel.Complete)}>
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
                        className="button-primary inline-flex flex-row items-center px-3 py-2"
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
    type State = {
        success: boolean,
        fieldErrors?: FieldErrors<'userName' | 'displayName' | 'avatarFile'> | null,
        message?: string | null
    };

    const auth = useAuthorization();
    const navigator = useNavigate();

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

    const setupProfile = async (_prevState: State, formData: FormData): Promise<State> => {
        const userName = formData.get("userName") as string;
        const displayName = formData.get("displayName") as string;

        const response = await userService.setupProfile(userName, displayName, avatarOperation);

        switch (response.statusCode) {
            case HttpStatusCode.Ok:
                auth.updateUserProfile({
                    userName,
                    displayName,
                    hasAvatar: avatarOperation.type === "delete" ? false : avatarOperation.type === "set" ? true : auth.userProfile?.hasAvatar
                });

                navigator("/lobby");

                return {
                    success: true,
                };

            case HttpStatusCode.BadRequest:
                return response.error?.code === "ValidationErrorsOccured" ? {
                    success: false,
                    message: response.error?.message,
                    fieldErrors: response.error?.details as FieldErrors<'userName' | 'displayName' | 'avatarFile'>,
                } : {
                    success: false,
                    message: response.error?.message,
                };

            default:
                return {
                    success: false,
                    message: response.error?.message,
                };
        }
    };

    const [state, formAction, isPending] = useActionState<State, FormData>(setupProfile, {
        success: false,
    });

    // jump to the panel when there is field error
    useEffect(() => {
        if (!state.fieldErrors) return;

        // this is dogshit but it works for now
        if (state.fieldErrors.avatarFile) {
            setDisplayingPanel(DisplayingPanel.Avatar);
            return;
        }
        if (state.fieldErrors.userName || state.fieldErrors.displayName) {
            setDisplayingPanel(DisplayingPanel.Name);
            return;
        }
    }, [state]);

    // error displaying for each field, copy into a separate field to make the field no longer display error
    // when the value is changed.
    const [visibleErrors, setVisibleErrors] = useState<State['fieldErrors']>(null);

    useEffect(() => {
        setVisibleErrors(state.fieldErrors);
    }, [state.fieldErrors]);

    const clearError = (field: 'userName' | 'displayName' | 'avatarFile') => {
        setVisibleErrors(prev => {
            if (!prev) return prev;
            const updatedErrors = { ...prev };
            delete updatedErrors[field];    // remove the specific error
            return updatedErrors;
        });
    };

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
                        <AvatarPanel setDisplayingPanel={setDisplayingPanel}
                                     avatarOperation={avatarOperation}
                                     setAvatarOperation={setAvatarOperation}
                                     fieldErrors={visibleErrors}
                                     clearError={clearError}
                                     />
                    </div>

                    <div
                        id={`panel-${DisplayingPanel.Name}`}
                        className={`absolute left-[70%] top-[30%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Name ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
                    >
                        <NamesPanel setDisplayingPanel={setDisplayingPanel}
                                    fieldErrors={visibleErrors}
                                    clearError={clearError}/>
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