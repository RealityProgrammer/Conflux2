import {Label, Select, Separator} from "radix-ui";
import {Controller, type SubmitHandler, useForm, useWatch} from "react-hook-form";
import {z} from "zod";
import {PresenceStatus} from "../../graphql/types.ts";
import {BsChatText, BsChevronDown, BsCircleFill, BsFolder, BsVolumeUp} from "react-icons/bs";
import SelectItem from "../../components/SelectItem.tsx";
import PresenceStatusIcon from "../../components/PresenceStatusIcon.tsx";
import {zodResolver} from "@hookform/resolvers/zod";
import UserProfileContent from "../../components/UserProfileContent.tsx";
import UserAvatarAndBanner from "../../components/UserAvatarAndBanner.tsx";
import {FaBirthdayCake} from "react-icons/fa";
import {FaHandshake, FaMarsAndVenus} from "react-icons/fa6";
import {useGetUserSettingProfileInfoQuery} from "../../graphql/queries.ts";
import {useAuthorization} from "../../contexts/AuthContext.tsx";
import {TruncatedText} from "../../components/TruncatedText.tsx";

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
    .optional()
    .nullable(),

  bio: z.string()
    .max(255, "Biography can only have maximum length of 255 characters.")
    .optional()
    .nullable(),

  presence: z.enum(PresenceStatus),
});

type UpdateProfileFormValues = z.infer<typeof profileSchema>;

function ProfileForm() {
  const auth = useAuthorization();
  const { data, isLoading, isError } = useGetUserSettingProfileInfoQuery(
    { id: auth.userProfile?.id ?? "" },
    {
      enabled: !!auth.userProfile,
    }
  );

  const formMethods = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    values: {
      displayName: data?.user?.displayName ?? "",
      bio: data?.user?.biography ?? "",
      pronouns: data?.user?.pronouns ?? "",
      presence: PresenceStatus.Online,
    }
  });
  const { control, register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = formMethods;

  const watchedValues = useWatch<UpdateProfileFormValues>({ control, });

  const onSubmit: SubmitHandler<UpdateProfileFormValues> = (data: UpdateProfileFormValues) => {

  };

  const joinDate = new Date();

  return (
    <form className="grid grid-cols-2 gap-3" onSubmit={handleSubmit(onSubmit)}>
      <section>
        <p className="group-label">Fields</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label.Root htmlFor="displayName" className="label mb-1 block">Display Name</Label.Root>

            <input
              type="text"
              className="input-field h-10 px-3 w-full"
              {...register("displayName")}
            />
          </div>

          <div>
            <Label.Root className="label mb-1 block">Username</Label.Root>

            <input
              type="text"
              className="input-field h-10 px-3 w-full"
              disabled
              readOnly aria-readonly="true"
            />
          </div>

          <div>
            <Label.Root className="label mb-1 block">Pronouns</Label.Root>

            <input
              type="text"
              className="input-field h-10 px-3 w-full"
              {...register("pronouns")}
            />
          </div>

          <div className="col-span-2">
            <Label.Root className="label mb-1 block">Biography</Label.Root>

            <textarea
              className="input-field h-40 px-3 py-2 w-full resize-none"
              {...register("bio")}
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
              <p className="text-sm ml-1 truncate text-stone-300">@{data?.user?.userName}</p>

              <div className="grid grid-cols-2 gap-x-2 text-sm mt-2">
                {joinDate && (
                  <p className="mt-1 flex min-w-0 items-center text-sm text-gray-50">
                    <FaBirthdayCake className="flex-none size-4 fill-gray-50 mr-2"/>

                    {joinDate?.toLocaleDateString() || ""}
                  </p>
                )}

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
    </form>
  )
}