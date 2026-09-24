import {Label, Select, Separator} from "radix-ui";
import {Controller, type SubmitHandler, useForm, useWatch} from "react-hook-form";
import {z} from "zod";
import {PresenceStatus} from "../../graphql/types.ts";
import {BsChevronDown, BsPerson} from "react-icons/bs";
import SelectItem from "../../components/SelectItem.tsx";
import PresenceStatusIcon from "../../components/PresenceStatusIcon.tsx";
import {zodResolver} from "@hookform/resolvers/zod";
import UserAvatarAndBanner from "../../components/UserAvatarAndBanner.tsx";
import {FaBirthdayCake} from "react-icons/fa";
import {FaMarsAndVenus, FaRepeat, FaXmark} from "react-icons/fa6";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {TruncatedText} from "../../components/TruncatedText.tsx";
import Spinner from "../../components/Spinner.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";
import {sessionUserService} from "../../api/sessionUserService.ts";
import {toast} from "react-toastify";
import {usePresence} from "../../contexts/PresenceContext.tsx";
import SelectableAvatar from "../../components/SelectableAvatar.tsx";
import {useGetSessionUserProfileSettingInfoQuery} from "../../graphql/queries.ts";
import {userService} from "../../api/userService.ts";
import IconButton from "../../components/IconButton.tsx";

export default function ProfilePage() {
  return (
    <>
      <h1 className="font-bold text-2xl">Profile</h1>
      <p className="text-gray-400 text-sm">This is where you configure your profile, I have nothing else to say</p>

      <Separator.Root className="horizontal-separator my-2"/>

      <ProfileForm/>
    </>
  )
}

const profileSchema = z.object({
  displayName: z.string()
    .min(1, { error: "Display name is required." })
    .max(32, "Display name can only have maximum length of 32 characters."),

  pronouns: z.string()
    .max(32, "Pronouns can only have maximum length of 32 characters.")
    .optional(),

  bio: z.string()
    .max(255, "Biography can only have maximum length of 255 characters.")
    .optional(),

  presence: z.enum(PresenceStatus),

  avatar: z.file()
    .max(4194304, "Avatar can only have maximum size of 4MB (4194304 bytes).")
    .optional()
    .nullable()
});

type UpdateProfileFormValues = z.infer<typeof profileSchema>;

function ProfileForm() {
  const auth = useAuth();
  const presence = usePresence();

  const { data, isLoading, isError } = useGetSessionUserProfileSettingInfoQuery(
    {},
    {
      enabled: !!auth.userProfile,
    }
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
    },
    values: {
      displayName: data?.sessionUser?.displayName ?? "",
      bio: data?.sessionUser?.biography ?? "",
      pronouns: data?.sessionUser?.pronouns ?? "",
      presence: data?.sessionUser?.manualPresenceStatus ?? PresenceStatus.Online,
    }
  });

  const { control, reset, resetField, handleSubmit, formState: { errors, isSubmitting, dirtyFields } } = formMethods;

  const watchedValues = useWatch<UpdateProfileFormValues>({ control, });

  const onSubmit: SubmitHandler<UpdateProfileFormValues> = async (data: UpdateProfileFormValues) => {
    const response = await sessionUserService.updateProfile(
      dirtyFields.displayName ? data.displayName : undefined,
      dirtyFields.pronouns ? data.pronouns : undefined,
      dirtyFields.bio ? data.bio : undefined,
      dirtyFields.presence ? data.presence : undefined,
      data.avatar
    );

    if (response.success) {
      reset(data);
      auth?.updateUserProfile({
        displayName: data.displayName,
      });

      if (dirtyFields.presence) {
        presence.updateManualStatus(data.presence, "client");
      }
    } else {
      toast.error("Failed to update profile.");
    }
  };

  return (
    <form className="relative" onSubmit={handleSubmit(onSubmit)}>
      {(!auth.userProfile?.id || isLoading || isError) && (
        <div className="absolute z-10 inset-0 backdrop-blur-xs flex flex-col justify-center items-center">
          <Spinner className="size-10 fill-white mb-2"/>
          <span>Please wait...</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-2">
        <section>
          <p className="group-label">Fields</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label.Root htmlFor="displayName" className="label mb-1 block">Avatar</Label.Root>

              <div className="flex flex-row justify-center items-center">
                <Controller
                  control={control}
                  name="avatar"
                  render={({ field }) => (
                    <div className="flex flex-row gap-3">
                      <SelectableAvatar
                        value={field.value === undefined ? data?.sessionUser?.hasAvatar ? userService.getAvatarUrl(data.sessionUser.id) : null : field.value}
                        onChange={field.onChange}
                        className="size-48 rounded-full overflow-hidden flex-none"
                        fallback={() => (<BsPerson className="fill-black size-5/6"/>)}
                      />

                      <div className="p-2 rounded-md bg-black/10 shadow-md self-start border-2 border-gray-600 flex flex-col gap-2">
                        <IconButton type="button" theme="default" onClick={() => resetField("avatar")} disabled={field.value === undefined}>
                          <FaRepeat className="size-5"/>
                        </IconButton>

                        <IconButton type="button" theme="danger" onClick={() => { field.onChange(null) }} disabled={field.value === null}>
                          <FaXmark className="size-5"/>
                        </IconButton>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>

            <div>
              <Label.Root htmlFor="displayName" className="label mb-1 block">Display Name</Label.Root>

              <Controller
                control={control}
                name="displayName"
                render={({ field }) => (
                  <ErrorPopover
                    open={!!errors.displayName}
                    content={errors.displayName?.message}
                  >
                    <input
                      {...field}
                      type="text"
                      className="input-field h-10 px-3 w-full"
                    />
                  </ErrorPopover>
                )}
              />
            </div>

            <div>
              <Label.Root className="label mb-1 block">Username</Label.Root>

              <input
                type="text"
                className="input-field h-10 px-3 w-full"
                disabled
                readOnly aria-readonly="true"
                value={data?.sessionUser?.userName ?? ""}
              />
            </div>

            <div>
              <Label.Root className="label mb-1 block">Pronouns</Label.Root>

              <Controller
                control={control}
                name="pronouns"
                render={({ field }) => (
                  <ErrorPopover
                    open={!!errors.pronouns}
                    content={errors.pronouns?.message}
                  >
                    <input
                      {...field}
                      type="text"
                      className="input-field h-10 px-3 w-full"
                    />
                  </ErrorPopover>
                )}
              />
            </div>

            <div className="col-span-2">
              <Label.Root className="label mb-1 block">Biography</Label.Root>

              <Controller
                control={control}
                name="bio"
                render={({ field}) => (
                  <ErrorPopover
                    open={!!errors.bio}
                    content={errors.bio?.message}
                  >
                    <textarea
                      {...field}
                      className="input-field h-40 px-3 py-2 w-full resize-none"
                    />
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
                    <Select.Trigger className="w-full input-field h-10 inline-flex flex-row items-center gap-2 ">
                      <Select.Value/>
                      <Select.Icon className="fill-white flex-none ml-auto">
                        <BsChevronDown className="size-4"/>
                      </Select.Icon>
                    </Select.Trigger>

                    <Select.Portal>
                      <Select.Content
                        className="overflow-hidden bg-gray-700 text-white rounded-md p-1 w-(--radix-select-trigger-width) border-2 border-gray-600"
                        position="popper"
                        side="bottom"
                        sideOffset={4}
                      >
                        <Select.Viewport>
                          <SelectItem
                            text="Online"
                            value={PresenceStatus.Online}
                            icon={<PresenceStatusIcon status={PresenceStatus.Online} className="size-3 flex-none"/>}
                          />

                          <SelectItem
                            text="Idle"
                            value={PresenceStatus.Idle}
                            icon={<PresenceStatusIcon status={PresenceStatus.Idle} className="size-3 flex-none"/>}
                          />

                          <SelectItem
                            text="Do not disturb"
                            value={PresenceStatus.DoNotDisturb}
                            icon={<PresenceStatusIcon status={PresenceStatus.DoNotDisturb} className="size-3 flex-none"/>}
                          />

                          <SelectItem
                            text="Invisible"
                            value={PresenceStatus.Invisible}
                            icon={<PresenceStatusIcon status={PresenceStatus.Invisible} className="size-3 flex-none"/>}
                          />
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                )}
              />
            </div>
          </div>

          <div className="flex flex-row justify-start items-center gap-2 mt-3">
            <button
              type="button"
              className="button-theme-danger w-32 py-2 cursor-pointer rounded-md"
              onClick={() => {
                reset();
              }}
            >
              Reset Profile
            </button>

            <button
              type="submit"
              className="button-theme-primary w-32 py-2 cursor-pointer rounded-md flex flex-row justify-center items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner className="size-6 fill-white"/>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </section>

        <section>
          <p className="group-label">Display</p>

          <div className="flex flex-row justify-center rounded-xl">
            <div className="w-80 h-128 border-2 border-gray-600 rounded-xl overflow-hidden">
              <UserAvatarAndBanner
                bannerSrc="https://placehold.co/1600x900"
                avatarSrc="https://placehold.co/256x256"
                avatarClassName="border-gray-675"
                presenceStatus={watchedValues.presence}
                presenceStatusClassName="bg-gray-675 border-4 border-gray-675"
              />

              <div className="px-2">
                <p className="text-xl font-bold truncate">{watchedValues.displayName || "\u003CDisplay Name\u003E"}</p>
                <p className="text-sm ml-1 truncate text-stone-300">@{data?.sessionUser?.userName}</p>

                <div className="grid grid-cols-2 gap-x-2 text-sm mt-2">
                  <p className="mt-1 flex min-w-0 items-center text-sm text-gray-50">
                    <FaBirthdayCake className="flex-none size-4 fill-gray-50 mr-2"/>

                    {data?.sessionUser?.createdAt ? new Date(data?.sessionUser?.createdAt).toLocaleDateString() : "-"}
                  </p>

                  {watchedValues.pronouns && (
                    <p className="mt-1 flex min-w-0 items-center text-sm text-gray-50">
                      <FaMarsAndVenus className="flex-none size-4 fill-gray-50 mr-2"/>

                      <TruncatedText>{watchedValues.pronouns}</TruncatedText>
                    </p>
                  )}
                </div>

                <Separator.Root orientation="horizontal" decorative className="horizontal-separator my-2"/>

                <p className="group-label">About me</p>

                <p className="text-[13px] text-gray-50">{watchedValues.bio || "\u003CBiography\u003E"}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  )
}