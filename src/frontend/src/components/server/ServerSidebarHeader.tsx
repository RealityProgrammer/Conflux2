import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {useEffect, useState} from "react";
import {DropdownMenu, Label, Select} from "radix-ui";
import IconButton from "../IconButton.tsx";
import {BsChevronDown, BsCopy, BsGearFill, BsPersonPlus, BsPersonPlusFill} from "react-icons/bs";
import {FaFolderPlus, FaHashtag, FaVolumeHigh} from "react-icons/fa6";
import DialogForm from "../DialogForm.tsx";
import SelectItem from "../SelectItem.tsx";
import {useFormStatus} from "react-dom";
import {useInterval} from "usehooks-ts";
import Spinner from "../Spinner.tsx";
import {z} from "zod";
import {Controller, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import ErrorText from "../ErrorText.tsx";
import {invitationService} from "../../api/invitationService.ts";
import {HttpStatusCode} from "axios";
import {InvitationExpireAfter} from "../../api/schema.ts";
import type {FieldErrors} from "../../api/types.ts";
import {ServerSettingsDialog} from "./ServerSettingsDialog.tsx";
import {toast} from "react-toastify";

interface ServerSidebarHeaderProps {
  onRequestCreate: (type: "category" | "text_channel" | "voice_channel", idempotencyKey: string) => void;
}

export default function ServerSidebarHeader({
  onRequestCreate
}: ServerSidebarHeaderProps) {
  const { memberPermissions } = useCommunityServerContext();

  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [isOpenInvitationDialog, setIsOpenInvitationDialog] = useState(false);
  const [isOpenSettingDialog, setIsOpenSettingDialog] = useState(false);

  const { serverSummary: { name: serverName } } = useCommunityServerContext();

  const allowAccessToServerManagement = (memberPermissions.effectivePermissions.CreateRole ||
    memberPermissions.effectivePermissions.UpdateRole ||
    memberPermissions.effectivePermissions.DeleteRole) ?? false;

  useEffect(() => {
    if (!allowAccessToServerManagement) {
      if (isOpenSettingDialog) {
        setIsOpenSettingDialog(false);
        toast.info("Your access to the server management has been revoked.");
      }
    }
  }, [memberPermissions]);

  return (
    <header className="w-full aspect-video relative group">
      <section
        className={`absolute font-bold top-0 inset-x-0 bg-linear-to-b from-black/60 via-black/60 via-60% to-transparent pb-4 pt-1 px-1 ${isOpenDropdown ? '' : '-translate-y-full group-hover:translate-y-0 transition-transform duration-350 ease-in-out'} flex flex-row justify-center items-center`}
      >
        <span className="flex-1 select-none truncate">{serverName}</span>

        <DropdownMenu.Root open={isOpenDropdown} onOpenChange={setIsOpenDropdown} modal={false}>
          <DropdownMenu.Trigger asChild>
            <IconButton isLoading={false} className="flex-none">
              <BsGearFill className="size-4 fill-white"/>
            </IconButton>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              sideOffset={5}
              className="w-64 rounded-md bg-gray-650 p-1.5 shadow-lg"
              onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}
            >
              {memberPermissions.effectivePermissions.CreateChannel && (
                <>
                  <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                    onRequestCreate("category", crypto.randomUUID());
                  }}>
                    Create channel category

                    <FaFolderPlus className="fill-white size-4 ml-auto"/>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item className="dropdown-item-default mb-1" onSelect={() => {
                    onRequestCreate("text_channel", crypto.randomUUID());
                  }}>
                    Create text channel

                    <FaHashtag className="fill-white size-4 ml-auto"/>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item className="dropdown-item-default" onSelect={() => {
                    onRequestCreate("voice_channel", crypto.randomUUID());
                  }}>
                    Create voice channel

                    <FaVolumeHigh className="fill-white size-4 ml-auto"/>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="horizontal-separator my-1.5"/>
                </>
              )}

              <DropdownMenu.Item className="dropdown-item-default" onSelect={() => setIsOpenInvitationDialog(true)}>
                Invitation

                <BsPersonPlusFill className="fill-white size-4 ml-auto"/>
              </DropdownMenu.Item>

              {allowAccessToServerManagement && (
                <>
                  <DropdownMenu.Separator className="horizontal-separator my-1.5"/>

                  <DropdownMenu.Item className="dropdown-item-default" onSelect={() => setIsOpenSettingDialog(true)}>
                    Manage Server

                    <BsGearFill className="fill-white size-4 ml-auto"/>
                  </DropdownMenu.Item>
                </>
              )}

              <DropdownMenu.Arrow className="fill-gray-650"/>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </section>

      <div
        className="size-full bg-purple-600"
      />

      <InvitationDialogForm
        open={isOpenInvitationDialog}
        onOpenChange={setIsOpenInvitationDialog}
      />

      {allowAccessToServerManagement && (
        <ServerSettingsDialog
          open={isOpenSettingDialog}
          onOpenChanged={setIsOpenSettingDialog}
        />
      )}
    </header>
  );
}

const createInvitationSchema = z.object({
  expireAfter: z.enum(InvitationExpireAfter),
  maxUses: z.number().int({ error: "A valid positive integer is required." })
    .min(1, { error: "Max uses must be at least 1." })
    .max(500000, { error: "Max uses must be less than or equal to 500000." })
    .nullable()
    .optional(),
});

type CreateInvitationFormValues = z.infer<typeof createInvitationSchema>;

const INVITATION_OPTIONS = [
  { label: "5 minutes", value: "FiveMinutes" },
  { label: "15 minutes", value: "FifteenMinutes" },
  { label: "30 minutes", value: "ThirtyMinutes" },
  { label: "1 hour", value: "OneHour" },
  { label: "2 hours", value: "TwoHours" },
  { label: "3 hours", value: "ThreeHours" },
  { label: "6 hours", value: "SixHours" },
  { label: "12 hours", value: "TwelveHours" },
  { label: "1 day", value: "OneDay" },
  { label: "1 week", value: "OneWeek" },
  { label: "2 weeks", value: "TwoWeeks" },
  { label: "4 weeks", value: "FourWeeks" },
  { label: "Infinite", value: "Infinite" },
] as const;

function InvitationDialogForm({open, onOpenChange}: {open: boolean, onOpenChange: (open: boolean) => void}) {
  const { serverId } = useCommunityServerContext();

  const formMethods = useForm<CreateInvitationFormValues>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      expireAfter: InvitationExpireAfter.FiveMinutes,
      maxUses: null,
    },
    mode: "onSubmit",
  });

  const handleGetInvitation = async (value: CreateInvitationFormValues) => {
    const response = await invitationService.createInvitation(serverId, value.expireAfter, value.maxUses ?? null);

    if (response.success) {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/invite/${response.data}`);
        formMethods.reset();
        onOpenChange(false);
        toast.success("Invitation link has been copied to clipboard.");
      } catch {
        toast.error("Failed to copy invitation link to clipboard, possible API error?");
      }
    } else {
      if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
        const details = response.error.details as unknown as FieldErrors<"expireAfter" | "maxUses">;

        if (details.expireAfter && details.expireAfter.length > 0) {
          formMethods.setError("expireAfter", {
            message: details.expireAfter[0],
          });
        }

        if (details.maxUses && details.maxUses.length > 0) {
          formMethods.setError("maxUses", {
            message: details.maxUses[0],
          })
        }
      } else {
        formMethods.setError("root", {
          message: response.error?.message ?? "An unexpected error occurred.",
        });
      }
    }
  };

  return (
    <DialogForm
      open={open}
      onOpenChange={onOpenChange}
      formMethods={formMethods}
      contentClassName="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-128 -translate-x-1/2 -translate-y-1/2 rounded-md text-white"
      headerIcon={(<BsPersonPlus className="size-10 fill-white"/>)}
      title="Grab an invitation"
      subtitle="Invite people to the fun gang"
      submitButton={(<GetInvitationLinkButton/>)}
      onSubmit={handleGetInvitation}
    >
      <div className="w-full">
        <Label.Root className="label block mb-1">Expire after</Label.Root>

        <Controller
          control={formMethods.control}
          name="expireAfter"
          render={({field}) => (
            <>
              <Select.Root value={field.value} onValueChange={field.onChange}>
                <Select.Trigger className="w-full input-field h-10 inline-flex flex-row items-center gap-2">
                  <Select.Value placeholder="Select time"/>
                  <Select.Icon className="fill-white flex-none ml-auto">
                    <BsChevronDown className="size-4"/>
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content
                    className="overflow-hidden bg-gray-700 text-white rounded-md w-(--radix-select-trigger-width) max-h-64"
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                  >
                    <Select.Viewport className="p-1 size-full overflow-y-auto">
                      { INVITATION_OPTIONS.map(e => (
                        <SelectItem
                          key={e.value}
                          text={e.label}
                          value={e.value}
                        />
                      ))
                      }
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {formMethods.formState.errors.expireAfter && (
                <ErrorText>{formMethods.formState.errors.expireAfter.message}</ErrorText>
              )}
            </>
          )}
        />

        <Label.Root className="label block mb-1 mt-3" htmlFor="maxUses">Max uses</Label.Root>

        <input
          type="number"
          className="w-full input-field h-11"
          placeholder="Enter max number of uses"
          {...formMethods.register("maxUses", {
            setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
          })}
        />

        {formMethods.formState.errors.maxUses && (
          <ErrorText>{formMethods.formState.errors.maxUses.message}</ErrorText>
        )}

        {formMethods.formState.errors.root && (
          <ErrorText className="mt-2">{formMethods.formState.errors.root.message}</ErrorText>
        )}
      </div>
    </DialogForm>
  );
}

function GetInvitationLinkButton() {
  const CHARACTERS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const { pending } = useFormStatus();

  const generateRandomInvitationId = (length: number): string => {
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomInd = Math.floor(Math.random() * CHARACTERS.length);
      result += CHARACTERS.charAt(randomInd);
    }

    return result;
  };

  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const [fakeInvitationId, setFakeInvitationId] = useState(generateRandomInvitationId(12));
  useInterval(() => {
    if (!pending) { // have to do this so that the next fake id update doesn't override the pending status
      setFakeInvitationId(generateRandomInvitationId(12));
    }
  }, 100);

  return (
    <div className="flex-1 min-w-0 input-field h-11 px-3 flex items-center gap-2">
      <span className="truncate flex-1 text-gray-500 select-none">{baseUrl}/invite/{fakeInvitationId}</span>

      <button
        type="submit"
        className="flex-none cursor-pointer rounded-md button-theme-primary p-2"
      >
        { pending ? (
          <Spinner className="size-4 fill-white"/>
        ) : (
          <BsCopy className="size-4 fill-white"/>
        )}
      </button>
    </div>
  );
}