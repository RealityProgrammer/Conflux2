import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {Controller, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {InvitationExpireAfter} from "../../api/schema.ts";
import {z} from "zod";
import {invitationService} from "../../api/invitationService.ts";
import {toast} from "react-toastify";
import {BsChevronDown, BsCopy, BsPersonPlus} from "react-icons/bs";
import {Label, Select} from "radix-ui";
import ErrorText from "../ErrorText.tsx";
import {HttpStatusCode} from "axios";
import ModalForm from "../ModalForm.tsx";
import SelectItem from "../SelectItem.tsx";
import {useState} from "react";
import {useInterval} from "usehooks-ts";


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

interface CreateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateInvitationDialog({
  open,
  onOpenChange
}: CreateInvitationDialogProps) {
  const { detailsQueryResult: { data: serverDetails } } = useCommunityServerContext();

  const formMethods = useForm<CreateInvitationFormValues>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      expireAfter: InvitationExpireAfter.FiveMinutes,
      maxUses: null,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const handleGetInvitation = async (value: CreateInvitationFormValues) => {
    if (!serverDetails?.id) return;
    
    const response = await invitationService.createInvitation(serverDetails.id, value.expireAfter, value.maxUses ?? null);

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
        const details = response.error.details as Record<"expireAfter" | "maxUses", string[]>;

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
    <ModalForm
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
    </ModalForm>
  );
}

function GetInvitationLinkButton({...props}) {
  const CHARACTERS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const generateRandomInvitationId = (length: number): string => {
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomInd = Math.floor(Math.random() * CHARACTERS.length);
      result += CHARACTERS.charAt(randomInd);
    }

    return result;
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const [fakeInvitationId, setFakeInvitationId] = useState(() => generateRandomInvitationId(12));

  useInterval(() => {
    setFakeInvitationId(generateRandomInvitationId(12));
  }, 100);

  return (
    <div className="flex-1 min-w-0 input-field h-11 px-3 flex items-center gap-2">
      <span className="truncate flex-1 text-gray-500 select-none">{baseUrl}/invite/{fakeInvitationId}</span>

      <button
        type="submit"
        className="flex-none cursor-pointer rounded-md button-theme-primary p-2"
        {...props}
      >
        <BsCopy className="size-4 fill-white"/>
      </button>
    </div>
  );
}