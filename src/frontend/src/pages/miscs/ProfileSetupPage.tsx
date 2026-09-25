import {BsArrowLeft, BsArrowRight, BsCheck, BsPerson, BsX} from "react-icons/bs";
import {useEffect, useRef, useState} from "react";
import {animate, utils} from "animejs";
import SelectableImageInput from "../../components/SelectableImageInput.tsx";
import {HttpStatusCode} from "axios";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {Label} from "radix-ui";
import {
  type ServiceResponse,
} from "../../api/types.ts";
import {sessionUserService} from "../../api/sessionUserService.ts";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import ErrorText from "../../components/ErrorText.tsx";
import Spinner from "../../components/Spinner.tsx";
import {useMutation} from "@tanstack/react-query";
import {useNavigate} from "react-router";
import IconButton from "../../components/IconButton.tsx";
import {FaXmark} from "react-icons/fa6";

enum DisplayingPanel {
  Intro = 0,
  Avatar = 1,
  Name = 2,
  Complete = 3,
}

interface PanelProps {
  setDisplayingPanel: (panel: DisplayingPanel) => void;
}

function IntroPanel({setDisplayingPanel}: PanelProps) {
  return (
    <section
      className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-2">
      <header className="flex-none">
        <h1 className="text-center font-bold text-3xl text-white">Hold up</h1>
        <p className="mt-2 text-center">Before going further, you need to setup your profile first!</p>
      </header>

      <p className="text-sm text-gray-400 text-center mt-2">You don't want to be an unknown, don't you?</p>

      <footer className="flex flex-none flex-row justify-center mt-2">
        <button
          type="button" className="button-primary inline-flex flex-row items-center py-2 px-3"
          onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}
        >
          Show me the way

          <BsArrowRight className="ml-2 size-6 fill-white"/>
        </button>
      </footer>
    </section>
  );
}

interface AvatarPanelProps extends PanelProps {}

const uploadAvatarSchema = z.object({
  file: z.file().nullable(),
});

type UploadAvatarFormValues = z.infer<typeof uploadAvatarSchema>;

function AvatarPanel({
  setDisplayingPanel,
}: AvatarPanelProps) {
  const {
    control,
    handleSubmit,
    formState: { isDirty, errors, isSubmitting },
    setError,
    reset,
  } = useForm<UploadAvatarFormValues>({
    resolver: zodResolver(uploadAvatarSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      file: null,
    },
  });

  const onSubmit = async (data: UploadAvatarFormValues) => {
    if (isDirty) {
      if (data.file) {
        const response: ServiceResponse = await sessionUserService.uploadAvatar(data.file);

        if (response.success) {
          setDisplayingPanel(DisplayingPanel.Name);
          reset(data);
        } else {
          if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
            const details = response.error.details as Record<"file", string[]>;

            if (details.file && details.file.length > 0) {
              setError("file", {
                message: details.file[0],
              });
            }
          } else {
            setError("root", {
              message: response.error?.message ?? "An unexpected error occurred.",
            });
          }
        }
      } else {
        await sessionUserService.deleteAvatar();
        setDisplayingPanel(DisplayingPanel.Name);
        reset(data);
      }
    } else {
      setDisplayingPanel(DisplayingPanel.Name);
    }
  };

  return (
    <section
      className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-3">
      <header className="flex-none">
        <h1 className="text-center font-bold text-3xl text-white">Setup Avatar</h1>
        <p className="text-center text-gray-400 text-sm mt-2">Make yourself look special</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col" id="avatar-form">
        <div className="flex flex-row flex-nowrap justify-center items-start gap-2">
          <Controller
            control={control}
            name="file"
            render={({ field }) => (
              <div className="flex flex-row gap-3">
                <SelectableImageInput
                  value={field.value}
                  onChange={field.onChange}
                  className="size-64 rounded-full flex-none"
                  fallback={() => (<BsPerson className="fill-black size-5/6"/>)}
                />

                <div className="p-2 rounded-md bg-black/10 shadow-md self-start border-2 border-gray-600 flex flex-col gap-2">
                  <IconButton type="button" theme="danger" onClick={() => { field.onChange(null) }} disabled={!field.value}>
                    <FaXmark className="size-5"/>
                  </IconButton>
                </div>
              </div>
            )}
          />
        </div>

        {errors.file && (
          <ErrorText className="block text-center mt-1">{errors.file.message}</ErrorText>
        )}
      </form>

      {errors.root && (
        <ErrorText className="block text-center mt-1">{errors.root.message}</ErrorText>
      )}

      <footer className="flex flex-none flex-row justify-center mt-2">
        <button
          type="submit"
          className="button-primary flex flex-row justify-center items-center py-2 w-32"
          form="avatar-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Spinner className="size-6 fill-white"/>
          ) : (
            <>
              Next
              <BsArrowRight className="ml-2 size-6 fill-white"/>
            </>
          )}
        </button>
      </footer>
    </section>
  );
}

const setNamesSchema = z.object({
  userName: z.string()
    .min(8, { error: "User name must be between 8 and 32 characters." })
    .max(32, { error: "User name must be between 8 and 32 characters." }),

  displayName: z.string()
    .min(8, { error: "Display name must be between 8 and 32 characters." })
    .max(32, { error: "Display name must be between 8 and 32 characters." }),
});

type SetNamesFormValues = z.infer<typeof setNamesSchema>;

interface NamesPanelProps extends PanelProps {}

function NamesPanel({
  setDisplayingPanel,
}: NamesPanelProps) {
  const { userProfile, updateUserProfile } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { isDirty, errors, isSubmitting },
  } = useForm<SetNamesFormValues>({
    resolver: zodResolver(setNamesSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      userName: userProfile?.userName ?? "",
      displayName: userProfile?.displayName ?? "",
    }
  });

  const onSubmit = async (data: SetNamesFormValues) => {
    if (isDirty) {
      const response: ServiceResponse = await sessionUserService.setNames(data.userName, data.displayName);

      if (response.success) {
        setDisplayingPanel(DisplayingPanel.Complete);
        updateUserProfile({
          userName: data.userName,
          displayName: data.displayName,
        });
      } else {
        if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
          const details = response.error.details as Record<"userName" | "displayName", string[]>;

          if (details.userName && details.userName.length > 0) {
            setError("userName", {
              message: details.userName[0],
            });
          }

          if (details.displayName && details.displayName.length > 0) {
            setError("displayName", {
              message: details.displayName[0],
            });
          }
        } else {
          setError("root", {
            message: response.error?.message ?? "An unexpected error occurred.",
          });
        }
      }
    } else {
      setDisplayingPanel(DisplayingPanel.Complete);
    }
  };

  return (
    <section
      className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible p-6 flex flex-col gap-3">
      <header className="flex-none">
        <h1 className="text-center font-bold text-3xl text-white">Name yourself</h1>
        <p className="text-center text-gray-400 text-sm mt-2">Make a name of yourself, literally</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-row gap-2" id="name-form">
        <div className="flex-1">
          <Label.Root className="label mb-1 block" htmlFor="username">Username</Label.Root>

          <input
            type="text"
            placeholder="Enter username"
            className="w-full h-11 px-3 input-field"
            {...register("userName")}
          />

          {errors.userName && (
            <ErrorText className="mt-1">{errors.userName.message}</ErrorText>
          )}
        </div>

        <div className="flex-1">
          <Label.Root className="label mb-1 block" htmlFor="displayName">Display Name</Label.Root>

          <input
            type="text"
            placeholder="Enter display name"
            className="w-full h-11 px-3 input-field"
            {...register("displayName")}
          />

          {errors.displayName && (
            <ErrorText className="mt-1">{errors.displayName?.message}</ErrorText>
          )}
        </div>
      </form>

      {errors.root && (
        <ErrorText className="block text-center mt-1">{errors.root.message}</ErrorText>
      )}

      <footer className="flex flex-none flex-row justify-around mt-2">
        <button
          type="button"
          className="button-primary flex flex-row justify-center items-center w-32 py-2"
          onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}
        >
          <BsArrowLeft className="mr-2 size-6 fill-white"/>

          Previous
        </button>

        <button
          type="submit"
          className="button-primary flex flex-row justify-center items-center w-32 py-2"
          form="name-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Spinner className="size-6 fill-white"/>
          ) : (
            <>
              Next
              <BsArrowRight className="ml-2 size-6 fill-white"/>
            </>
          )}
        </button>
      </footer>
    </section>
  );
}

interface CompletePanelProps extends PanelProps {}

function CompletePanel({setDisplayingPanel}: CompletePanelProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);

  const lockMutation = useMutation({
    mutationFn: async () => {
      return sessionUserService.lockName();
    },
    mutationKey: ["sessionUserLockName"],
    onSuccess: async (data: ServiceResponse) => {
      if (data.success) {
        setError(undefined);
        navigate("/lobby");
      } else {
        setError(data.error?.message ?? "Failed to save profile.");
      }
    }
  });

  return (
    <section
      className="sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw] bg-gray-700 rounded-3xl shadow-xl text-white overflow-visible relative p-6">
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
        <button
          type="button"
          className="button-primary flex flex-row justify-center items-center w-32 py-2"
          onClick={() => setDisplayingPanel(DisplayingPanel.Name)}
        >
          <BsArrowLeft className="mr-2 size-6 fill-white"/>

          Previous
        </button>

        <button
          type="button"
          className="button-success flex flex-row justify-center items-center py-2! w-32"
          disabled={lockMutation.isPending}
          onClick={() => {
            lockMutation.mutate();
          }}
        >
          {lockMutation.isPending ? (
            <Spinner className="size-6 fill-white"/>
          ) : (
            <span className="inline-flex flex-row items-center">
              Complete
              <BsCheck className="ml-2 size-6 fill-white"/>
            </span>
          )}
        </button>
      </footer>

      {error ?? (
        <ErrorText className="mt-1 block text-center">{error}</ErrorText>
      )}
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
        {to: 0.6, duration: 500, ease: 'inOut', delay: 0},
        {to: 1.0, duration: 500, ease: 'inOut', delay: 1200}
      ],
    });
  };

  useEffect(() => {
    if (previousPanel.current == displayingPanel) {
      return;
    }

    previousPanel.current = displayingPanel;

    animateCameraMovement();
  }, [displayingPanel, animateCameraMovement]);

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
            <AvatarPanel
              setDisplayingPanel={setDisplayingPanel}
            />
          </div>

          <div
            id={`panel-${DisplayingPanel.Name}`}
            className={`absolute left-[70%] top-[30%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Name ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
          >
            <NamesPanel
              setDisplayingPanel={setDisplayingPanel}
            />
          </div>

          <div
            id={`panel-${DisplayingPanel.Complete}`}
            className={`absolute left-[85%] top-[75%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Complete ? 'opacity-100 z-10' : 'opacity-40 z-0 pointer-events-none'}`}
          >
            <CompletePanel setDisplayingPanel={setDisplayingPanel}/>
          </div>
        </div>
      </div>
    </div>
  );
}