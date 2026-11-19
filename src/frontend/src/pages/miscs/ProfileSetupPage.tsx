import { BsArrowLeft, BsArrowRight, BsCheck, BsPerson } from "react-icons/bs";
import { useEffect, useRef, useState } from "react";
import { animate, utils } from "animejs";
import SelectableImageInput from "../../components/SelectableImageInput.tsx";
import { HttpStatusCode } from "axios";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { Label } from "radix-ui";
import { type ServiceResponse } from "../../api/types.ts";
import { sessionUserService } from "../../api/sessionUserService.ts";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ErrorText from "../../components/ErrorText.tsx";
import Spinner from "../../components/Spinner.tsx";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import IconButton from "../../components/IconButton.tsx";
import { FaXmark } from "react-icons/fa6";

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
    <section className="flex flex-col gap-2 overflow-visible rounded-3xl bg-gray-700 p-6 text-white shadow-xl sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw]">
      <header className="flex-none">
        <h1 className="text-center text-3xl font-bold text-white">Hold up</h1>
        <p className="mt-2 text-center">Before going further, you need to setup your profile first!</p>
      </header>

      <p className="mt-2 text-center text-sm text-gray-400">You don't want to be an unknown, don't you?</p>

      <footer className="mt-2 flex flex-none flex-row justify-center">
        <button
          type="button"
          className="button-primary inline-flex flex-row items-center px-3 py-2"
          onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}
        >
          Show me the way
          <BsArrowRight className="ml-2 size-6 fill-white" />
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

function AvatarPanel({ setDisplayingPanel }: AvatarPanelProps) {
  const auth = useAuth();

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
        const response: ServiceResponse<number> = await sessionUserService.uploadAvatar(data.file);

        if (response.success) {
          setDisplayingPanel(DisplayingPanel.Name);
          reset(data);

          auth.updateUserProfile({
            avatarVersion: response.data,
          });
        } else {
          if (
            response.statusCode === HttpStatusCode.BadRequest &&
            response.error?.code === "ValidationErrorsOccurred"
          ) {
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
    <section className="flex flex-col gap-3 overflow-visible rounded-3xl bg-gray-700 p-6 text-white shadow-xl sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw]">
      <header className="flex-none">
        <h1 className="text-center text-3xl font-bold text-white">Setup Avatar</h1>
        <p className="mt-2 text-center text-sm text-gray-400">Make yourself look special</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col" id="avatar-form">
        <div className="flex flex-row flex-nowrap items-start justify-center gap-2">
          <Controller
            control={control}
            name="file"
            render={({ field }) => (
              <div className="flex flex-row gap-3">
                <SelectableImageInput
                  value={field.value}
                  onChange={field.onChange}
                  className="size-64 flex-none rounded-full"
                  fallback={() => <BsPerson className="size-5/6 fill-black" />}
                />

                <div className="flex flex-col gap-2 self-start rounded-md border-2 border-gray-600 bg-black/10 p-2 shadow-md">
                  <IconButton
                    type="button"
                    theme="danger"
                    onClick={() => {
                      field.onChange(null);
                    }}
                    disabled={!field.value}
                  >
                    <FaXmark className="size-5" />
                  </IconButton>
                </div>
              </div>
            )}
          />
        </div>

        {errors.file && <ErrorText className="mt-1 block text-center">{errors.file.message}</ErrorText>}
      </form>

      {errors.root && <ErrorText className="mt-1 block text-center">{errors.root.message}</ErrorText>}

      <footer className="mt-2 flex flex-none flex-row justify-center">
        <button
          type="submit"
          className="button-primary flex w-32 flex-row items-center justify-center py-2"
          form="avatar-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Spinner className="size-6 fill-white" />
          ) : (
            <>
              Next
              <BsArrowRight className="ml-2 size-6 fill-white" />
            </>
          )}
        </button>
      </footer>
    </section>
  );
}

const setNamesSchema = z.object({
  userName: z
    .string()
    .min(8, { error: "User name must be between 8 and 32 characters." })
    .max(32, { error: "User name must be between 8 and 32 characters." }),

  displayName: z
    .string()
    .min(8, { error: "Display name must be between 8 and 48 characters." })
    .max(48, { error: "Display name must be between 8 and 48 characters." }),
});

type SetNamesFormValues = z.infer<typeof setNamesSchema>;

interface NamesPanelProps extends PanelProps {}

function NamesPanel({ setDisplayingPanel }: NamesPanelProps) {
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
    },
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
        if (
          response.statusCode === HttpStatusCode.BadRequest &&
          response.error?.code === "ValidationErrorsOccurred"
        ) {
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
    <section className="flex flex-col gap-3 overflow-visible rounded-3xl bg-gray-700 p-6 text-white shadow-xl sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw]">
      <header className="flex-none">
        <h1 className="text-center text-3xl font-bold text-white">Name yourself</h1>
        <p className="mt-2 text-center text-sm text-gray-400">Make a name of yourself, literally</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-row gap-2" id="name-form">
        <div className="flex-1">
          <Label.Root className="label mb-1 block" htmlFor="username">
            Username
          </Label.Root>

          <input
            type="text"
            placeholder="Enter username"
            className="input-field h-11 w-full px-3"
            {...register("userName")}
          />

          {errors.userName && <ErrorText className="mt-1">{errors.userName.message}</ErrorText>}
        </div>

        <div className="flex-1">
          <Label.Root className="label mb-1 block" htmlFor="displayName">
            Display Name
          </Label.Root>

          <input
            type="text"
            placeholder="Enter display name"
            className="input-field h-11 w-full px-3"
            {...register("displayName")}
          />

          {errors.displayName && <ErrorText className="mt-1">{errors.displayName?.message}</ErrorText>}
        </div>
      </form>

      {errors.root && <ErrorText className="mt-1 block text-center">{errors.root.message}</ErrorText>}

      <footer className="mt-2 flex flex-none flex-row justify-around">
        <button
          type="button"
          className="button-primary flex w-32 flex-row items-center justify-center py-2"
          onClick={() => setDisplayingPanel(DisplayingPanel.Avatar)}
        >
          <BsArrowLeft className="mr-2 size-6 fill-white" />
          Previous
        </button>

        <button
          type="submit"
          className="button-primary flex w-32 flex-row items-center justify-center py-2"
          form="name-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Spinner className="size-6 fill-white" />
          ) : (
            <>
              Next
              <BsArrowRight className="ml-2 size-6 fill-white" />
            </>
          )}
        </button>
      </footer>
    </section>
  );
}

interface CompletePanelProps extends PanelProps {}

function CompletePanel({ setDisplayingPanel }: CompletePanelProps) {
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
    },
  });

  return (
    <section className="relative overflow-visible rounded-3xl bg-gray-700 p-6 text-white shadow-xl sm:w-[95vw] md:w-[83vw] lg:w-[66vw] xl:w-[50vw]">
      <header>
        <h1 className="text-center text-3xl font-bold text-white">Almost complete</h1>
      </header>

      <div className="mt-4">
        <p className="text-center text-sm text-white">
          Well that wasn't too hard, you can now revise everything, press the Complete button if you want to
          complete profile setup.
        </p>
      </div>

      <footer className="mt-2 flex flex-none flex-row justify-around">
        <button
          type="button"
          className="button-primary flex w-32 flex-row items-center justify-center py-2"
          onClick={() => setDisplayingPanel(DisplayingPanel.Name)}
        >
          <BsArrowLeft className="mr-2 size-6 fill-white" />
          Previous
        </button>

        <button
          type="button"
          className="button-success flex w-32 flex-row items-center justify-center py-2!"
          disabled={lockMutation.isPending}
          onClick={() => {
            lockMutation.mutate();
          }}
        >
          {lockMutation.isPending ? (
            <Spinner className="size-6 fill-white" />
          ) : (
            <span className="inline-flex flex-row items-center">
              Complete
              <BsCheck className="ml-2 size-6 fill-white" />
            </span>
          )}
        </button>
      </footer>

      {error ?? <ErrorText className="mt-1 block text-center">{error}</ErrorText>}
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
      ease: "inOutCubic",
    });

    animate(zoomRef.current, {
      scale: [
        { to: 0.6, duration: 500, ease: "inOut", delay: 0 },
        { to: 1.0, duration: 500, ease: "inOut", delay: 1200 },
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
    <div className="mesh-bg-1 fixed inset-0 overflow-hidden bg-fixed">
      <div ref={zoomRef} className="absolute inset-0 origin-center">
        <div ref={mapRef} className="absolute top-0 left-0 h-[2000px] w-[3000px] origin-top-left">
          <div
            id={`panel-${DisplayingPanel.Intro}`}
            className={`absolute top-[20%] left-[15%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Intro ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-40"}`}
          >
            <IntroPanel setDisplayingPanel={setDisplayingPanel} />
          </div>

          <div
            id={`panel-${DisplayingPanel.Avatar}`}
            className={`absolute top-[60%] left-[40%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Avatar ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-40"}`}
          >
            <AvatarPanel setDisplayingPanel={setDisplayingPanel} />
          </div>

          <div
            id={`panel-${DisplayingPanel.Name}`}
            className={`absolute top-[30%] left-[70%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Name ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-40"}`}
          >
            <NamesPanel setDisplayingPanel={setDisplayingPanel} />
          </div>

          <div
            id={`panel-${DisplayingPanel.Complete}`}
            className={`absolute top-[75%] left-[85%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${displayingPanel === DisplayingPanel.Complete ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-40"}`}
          >
            <CompletePanel setDisplayingPanel={setDisplayingPanel} />
          </div>
        </div>
      </div>
    </div>
  );
}
