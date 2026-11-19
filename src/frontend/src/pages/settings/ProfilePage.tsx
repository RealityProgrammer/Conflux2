import { Label, Select, Separator, Avatar as RadixAvatar } from "radix-ui";
import {
  Controller,
  FormProvider,
  type SubmitHandler,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { z } from "zod";
import { PresenceStatus } from "../../graphql/types.ts";
import { BsChevronDown, BsPerson } from "react-icons/bs";
import SelectItem from "../../components/SelectItem.tsx";
import PresenceStatusIcon from "../../components/PresenceStatusIcon.tsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaRepeat, FaXmark } from "react-icons/fa6";
import { useAuth } from "../../contexts/AuthContext.tsx";
import Spinner from "../../components/Spinner.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";
import { sessionUserService } from "../../api/sessionUserService.ts";
import { toast } from "react-toastify";
import { usePresence } from "../../contexts/PresenceContext.tsx";
import SelectableImageInput from "../../components/SelectableImageInput.tsx";
import {
  type GetSessionUserProfileSettingInfoQuery,
  useGetSessionUserProfileSettingInfoQuery,
} from "../../graphql/queries.ts";
import { userService } from "../../api/userService.ts";
import IconButton from "../../components/IconButton.tsx";
import { useQueryClient } from "@tanstack/react-query";
import { usePreviewUrl } from "../../hooks/usePreviewUrl.ts";
import { hash } from "../../utils/hashing.ts";
import { AvatarAndBanner } from "../../components/AvatarAndBanner.tsx";
import { UserProfile } from "../../components/UserProfile.tsx";
import type { ServiceResponse, UpdateProfileResult } from "../../api/types.ts";

export default function ProfilePage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-sm text-gray-400">
        This is where you configure your profile, I have nothing else to say.
      </p>

      <Separator.Root className="horizontal-separator my-2" />

      <ProfileForm />
    </>
  );
}

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, { error: "Display name is required." })
    .max(48, "Display name can only have maximum length of 48 characters."),

  pronouns: z.string().max(32, "Pronouns can only have maximum length of 32 characters.").optional(),

  bio: z.string().max(255, "Biography can only have maximum length of 255 characters.").optional(),

  presence: z.enum(PresenceStatus),

  avatar: z
    .file()
    .max(4194304, "Avatar can only have maximum size of 4MB (4194304 bytes).")
    .optional()
    .nullable(),

  banner: z
    .file()
    .max(5242880, "Banner can only have maximum size of 5MB (5242880 bytes).")
    .optional()
    .nullable(),
});

type UpdateProfileFormValues = z.infer<typeof profileSchema>;

function ProfileForm() {
  const auth = useAuth();
  const presence = usePresence();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useGetSessionUserProfileSettingInfoQuery(
    {},
    {
      enabled: !!auth.userProfile,
      staleTime: 30 * 60 * 1000,
    },
  );

  const formMethods = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      displayName: "",
      bio: "",
      pronouns: "",
      presence: PresenceStatus.Online,
      avatar: undefined,
      banner: undefined,
    },
    values: {
      displayName: data?.sessionUser?.displayName ?? "",
      bio: data?.sessionUser?.biography ?? "",
      pronouns: data?.sessionUser?.pronouns ?? "",
      presence: data?.sessionUser?.manualPresenceStatus ?? PresenceStatus.Online,
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { dirtyFields, isDirty },
  } = formMethods;

  const onSubmit: SubmitHandler<UpdateProfileFormValues> = async (data: UpdateProfileFormValues) => {
    if (!isDirty) return;

    const response: ServiceResponse<UpdateProfileResult> = await sessionUserService.updateProfile(
      dirtyFields.displayName ? data.displayName : undefined,
      dirtyFields.pronouns ? data.pronouns : undefined,
      dirtyFields.bio ? data.bio : undefined,
      dirtyFields.presence ? data.presence : undefined,
      data.avatar,
      data.banner,
    );

    if (response.success) {
      reset({
        ...data,
        avatar: undefined,
        banner: undefined,
      });

      auth.updateUserProfile({
        displayName: data.displayName,
        avatarVersion: response.data?.avatarVersion,
        // bannerVersion: response.data?.bannerVersion,
      });

      if (dirtyFields.presence) {
        presence.updateManualStatus(data.presence, "client");
      }

      await queryClient.invalidateQueries({
        queryKey: useGetSessionUserProfileSettingInfoQuery.getKey({}),
      });

      toast.success("Profile updated successfully.");
    } else {
      toast.error("Failed to update profile.");
    }
  };

  return (
    <FormProvider {...formMethods}>
      <form className="relative overflow-y-hidden" onSubmit={handleSubmit(onSubmit)}>
        {(!auth.userProfile?.id || isLoading || isError) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-xs">
            <Spinner className="mb-2 size-10 fill-white" />
            <span>Please wait...</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 overflow-y-hidden px-2">
          <section className="col-span-2 overflow-y-auto">
            <p className="group-label">Fields</p>

            <FormFields userData={data?.sessionUser} />
            <FormButtons />
          </section>

          <section className="overflow-y-auto">
            <p className="group-label">Display</p>

            <div className="flex flex-row justify-center rounded-xl">
              <Displayer userData={data?.sessionUser} />
            </div>
          </section>
        </div>
      </form>
    </FormProvider>
  );
}

function FormFields({
  userData,
}: {
  userData: GetSessionUserProfileSettingInfoQuery["sessionUser"] | undefined;
}) {
  const {
    control,
    resetField,
    formState: { errors },
  } = useFormContext<UpdateProfileFormValues>();

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label.Root className="label mb-1 block">Avatar</Label.Root>

        <div className="flex w-full flex-row items-center justify-center">
          <Controller
            control={control}
            name="avatar"
            render={({ field }) => (
              <div className="flex w-full flex-row justify-center gap-2">
                <SelectableImageInput
                  value={
                    userData
                      ? field.value === undefined
                        ? userData.avatarVersion
                          ? userService.getAvatarUrl(userData.id, userData.avatarVersion)
                          : null
                        : field.value
                      : undefined
                  }
                  onChange={field.onChange}
                  className="aspect-square max-h-48 max-w-48 flex-1 overflow-hidden rounded-full"
                  fallback={() => <BsPerson className="size-5/6 fill-black" />}
                />

                <div className="flex flex-col gap-2 self-start rounded-md border-2 border-gray-600 bg-black/10 p-2 shadow-md">
                  <IconButton
                    type="button"
                    theme="default"
                    onClick={() => resetField("avatar")}
                    disabled={field.value === undefined}
                  >
                    <FaRepeat className="size-5" />
                  </IconButton>

                  <IconButton
                    type="button"
                    theme="danger"
                    onClick={() => {
                      field.onChange(null);
                    }}
                    disabled={field.value === null}
                  >
                    <FaXmark className="size-5" />
                  </IconButton>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      <div>
        <Label.Root className="label mb-1 block">Banner</Label.Root>

        <div className="flex w-full flex-row items-center justify-center">
          <Controller
            control={control}
            name="banner"
            render={({ field }) => (
              <div className="flex w-full flex-row gap-2">
                <SelectableImageInput
                  value={
                    userData
                      ? field.value === undefined
                        ? userData.bannerVersion
                          ? userService.getBannerUrl(userData.id, userData.bannerVersion)
                          : null
                        : field.value
                      : undefined
                  }
                  onChange={field.onChange}
                  className="aspect-video flex-1"
                  fallback={() => {
                    return (
                      <span
                        className="size-full"
                        style={{
                          backgroundColor: `hsl(${Math.abs(hash(userData?.id ?? "")) % 360}, 60%, 40%)`,
                        }}
                      ></span>
                    );
                  }}
                />

                <div className="flex flex-col gap-2 self-start rounded-md border-2 border-gray-600 bg-black/10 p-2 shadow-md">
                  <IconButton
                    type="button"
                    theme="default"
                    onClick={() => resetField("banner")}
                    disabled={field.value === undefined}
                  >
                    <FaRepeat className="size-5" />
                  </IconButton>

                  <IconButton
                    type="button"
                    theme="danger"
                    onClick={() => {
                      field.onChange(null);
                    }}
                    disabled={field.value === null}
                  >
                    <FaXmark className="size-5" />
                  </IconButton>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      <div>
        <Label.Root className="label mb-1 block">Display Name</Label.Root>

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <ErrorPopover open={!!errors.displayName} content={errors.displayName?.message}>
              <input {...field} type="text" className="input-field h-10 w-full px-3" />
            </ErrorPopover>
          )}
        />
      </div>

      <div>
        <Label.Root className="label mb-1 block">Username</Label.Root>

        <input
          type="text"
          className="input-field h-10 w-full px-3"
          disabled
          readOnly
          aria-readonly="true"
          value={userData?.userName ?? ""}
        />
      </div>

      <div>
        <Label.Root className="label mb-1 block">Pronouns</Label.Root>

        <Controller
          control={control}
          name="pronouns"
          render={({ field }) => (
            <ErrorPopover open={!!errors.pronouns} content={errors.pronouns?.message}>
              <input {...field} type="text" className="input-field h-10 w-full px-3" />
            </ErrorPopover>
          )}
        />
      </div>

      <div className="col-span-2">
        <Label.Root className="label mb-1 block">Biography</Label.Root>

        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <ErrorPopover open={!!errors.bio} content={errors.bio?.message}>
              <textarea {...field} className="input-field h-40 w-full resize-none px-3 py-2" />
            </ErrorPopover>
          )}
        />
      </div>

      <div>
        <Label.Root className="label mb-1 block">Presence</Label.Root>

        <Controller
          control={control}
          name="presence"
          render={({ field }) => (
            <Select.Root value={field.value} onValueChange={field.onChange}>
              <Select.Trigger className="input-field inline-flex h-10 w-full flex-row items-center gap-2">
                <Select.Value />
                <Select.Icon className="ml-auto flex-none fill-white">
                  <BsChevronDown className="size-4" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="w-(--radix-select-trigger-width) overflow-hidden rounded-md border-2 border-gray-600 bg-gray-700 p-1 text-white"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                >
                  <Select.Viewport>
                    <SelectItem
                      text="Online"
                      value={PresenceStatus.Online}
                      icon={
                        <PresenceStatusIcon status={PresenceStatus.Online} className="size-3 flex-none" />
                      }
                    />

                    <SelectItem
                      text="Idle"
                      value={PresenceStatus.Idle}
                      icon={
                        <PresenceStatusIcon status={PresenceStatus.Idle} className="size-3 flex-none" />
                      }
                    />

                    <SelectItem
                      text="Do not disturb"
                      value={PresenceStatus.DoNotDisturb}
                      icon={
                        <PresenceStatusIcon
                          status={PresenceStatus.DoNotDisturb}
                          className="size-3 flex-none"
                        />
                      }
                    />

                    <SelectItem
                      text="Invisible"
                      value={PresenceStatus.Invisible}
                      icon={
                        <PresenceStatusIcon
                          status={PresenceStatus.Invisible}
                          className="size-3 flex-none"
                        />
                      }
                    />
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          )}
        />
      </div>
    </div>
  );
}

function FormButtons() {
  const {
    reset,
    formState: { isSubmitting },
  } = useFormContext();

  return (
    <div className="mt-3 flex flex-row items-center justify-start gap-2">
      <button
        type="button"
        className="button-theme-danger w-32 cursor-pointer rounded-md py-2"
        onClick={() => {
          reset();
        }}
      >
        Reset Profile
      </button>

      <button
        type="submit"
        className="button-theme-primary button-cursor flex w-32 flex-row items-center justify-center rounded-md py-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? <Spinner className="size-6 fill-white" /> : "Save Profile"}
      </button>
    </div>
  );
}

function Displayer({
  userData,
}: {
  userData: GetSessionUserProfileSettingInfoQuery["sessionUser"] | undefined;
}) {
  const { userProfile } = useAuth();
  const { control } = useFormContext<UpdateProfileFormValues>();
  const watchedValues = useWatch({ control });

  const avatarDisplayUrl = usePreviewUrl(
    watchedValues.avatar,
    userData?.avatarVersion ? userService.getAvatarUrl(userData.id, userData.avatarVersion) : undefined,
  );
  const bannerDisplayUrl = usePreviewUrl(
    watchedValues.banner,
    userData?.bannerVersion ? userService.getBannerUrl(userData.id, userData.bannerVersion) : undefined,
  );

  return (
    <div className="@container h-128 w-80 scrollbar-none overflow-hidden overflow-y-auto rounded-xl border-2 border-gray-600 pb-2">
      <AvatarAndBanner.Template
        avatar={{
          src: avatarDisplayUrl ?? undefined,
          alt: "Preview Avatar",
          rootClassName: "border-4 border-gray-675 bg-gray-675",
          fallback: (
            <RadixAvatar.Fallback className="flex size-full items-center justify-center bg-gray-100">
              <BsPerson className="size-5/6 fill-black" />
            </RadixAvatar.Fallback>
          ),
        }}
        banner={{
          src: bannerDisplayUrl ?? undefined,
          alt: "Preview Banner",
          rootClassName: "",
          fallback: (
            <RadixAvatar.Fallback
              className="block size-full"
              style={{
                backgroundColor: `hsl(${Math.abs(hash(userProfile?.id ?? "???")) % 360}, 60%, 40%)`,
              }}
            ></RadixAvatar.Fallback>
          ),
        }}
        // presence={{status: watchedValues.presence, className: "size-8 border-4!"}}
      />

      <div className="space-y-2 px-2">
        <UserProfile.Names
          displayName={watchedValues.displayName ?? "???"}
          userName={userProfile?.userName ?? "???"}
        />

        <UserProfile.FieldContainer>
          {[...Array(5).keys()].map((_, index) => (
            <UserProfile.Field key={index} label={`Field ${index}`} value={<span>Value {index}</span>} />
          ))}
        </UserProfile.FieldContainer>

        {watchedValues.bio && (
          <>
            <Separator.Root orientation="horizontal" decorative className="horizontal-separator my-2" />

            <span className="group-label mb-1">About me</span>

            <UserProfile.Bio displayName={watchedValues.displayName ?? "???"}>
              {watchedValues.bio}
            </UserProfile.Bio>
          </>
        )}
      </div>
    </div>
  );
}
