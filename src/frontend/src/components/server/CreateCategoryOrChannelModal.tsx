import { BsChatText, BsChevronDown, BsFolder, BsVolumeUp } from "react-icons/bs";
import Spinner from "../Spinner.tsx";
import { Label, Select } from "radix-ui";
import ErrorText from "../ErrorText.tsx";
import { Controller, useForm } from "react-hook-form";
import SelectItem from "../SelectItem.tsx";
import ModalForm from "../ModalForm.tsx";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { serverService } from "../../api/serverService.ts";
import { useCommunityServerContext } from "../../contexts/CommunityServerContext.tsx";
import type {
  ChannelCategoryIdentityDto,
  ServerChannelIdentityDto,
  ServiceResponse,
} from "../../api/types.ts";
import { toast } from "react-toastify";
import { useEffect } from "react";

const createSchema = z.object({
  type: z.enum(["category", "text", "voice"]),
  name: z
    .string()
    .min(1, "Name is required.")
    .max(32, "Name can only have maximum length of 32 characters."),
});

type CreateFormValues = z.infer<typeof createSchema>;
export type CreateType = CreateFormValues["type"];

interface CreateCategoryOrChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  initialType?: CreateType;
}

export default function CreateCategoryOrChannelModal({
  open,
  onOpenChange,
  categoryId,
  initialType = undefined,
}: CreateCategoryOrChannelModalProps) {
  const {
    detailsQueryResult: { data: serverDetails },
    appendChannelCategory,
    appendChannel,
  } = useCommunityServerContext();

  const formMethods = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      type: initialType,
    },
  });

  const {
    reset,
    register,
    control,
    formState: { isSubmitting, errors },
  } = formMethods;

  useEffect(() => {
    if (open) {
      reset({
        type: initialType,
      });
    }
  }, [open, initialType, reset]);

  const handleSubmit = async (data: CreateFormValues) => {
    const idempotencyKey = crypto.randomUUID();

    switch (data.type) {
      case "category": {
        const response: ServiceResponse<ChannelCategoryIdentityDto> =
          await serverService.createChannelCategory(idempotencyKey, serverDetails!.id, data.name);

        if (response.success && response.data) {
          onOpenChange(false);
          appendChannelCategory(response.data);
        } else {
          toast.error("Failed to create channel category.");
        }
        break;
      }

      case "text":
      case "voice": {
        const response: ServiceResponse<ServerChannelIdentityDto> = await serverService.createChannel(
          idempotencyKey,
          serverDetails!.id,
          data.name,
          data.type,
          categoryId,
        );

        if (response.success && response.data) {
          onOpenChange(false);
          appendChannel(response.data);
        } else {
          toast.error("Failed to create channel.");
        }
        break;
      }
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          reset();
        }

        onOpenChange(open);
      }}
      formMethods={formMethods}
      contentClassName="centered-dialog w-xl rounded-md text-white"
      headerIcon={<BsChatText className="size-10 fill-white" />}
      title={"Create new Channel or Category"}
      subtitle={"Claim the unclaimed territory!"}
      onSubmit={handleSubmit}
      submitButton={
        <button
          type="submit"
          className="button-theme-primary flex h-10 basis-32 cursor-pointer flex-row items-center justify-center rounded-md px-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner className="size-5 fill-white" /> : <>Create</>}
        </button>
      }
    >
      <div className="mb-2 w-full">
        <Label.Root className="label mb-1 block" htmlFor="name">
          Name
        </Label.Root>

        <input
          type="text"
          className="input-field h-10 w-full"
          placeholder={`Enter name`}
          {...register("name")}
        />

        {errors.name && <ErrorText>{errors.name.message}</ErrorText>}
      </div>

      <div className="w-full">
        <Label.Root className="label mb-1 block">Type</Label.Root>

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select.Root value={field.value} onValueChange={field.onChange}>
              <Select.Trigger className="input-field inline-flex h-10 w-full flex-row items-center gap-2">
                <Select.Value placeholder="Select type to create..." />
                <Select.Icon className="ml-auto flex-none fill-white">
                  <BsChevronDown className="size-4" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="w-(--radix-select-trigger-width) overflow-hidden rounded-md bg-gray-700 p-1 text-white"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                >
                  <Select.Viewport>
                    {!categoryId && (
                      <SelectItem
                        text="Category"
                        value="category"
                        icon={<BsFolder className="size-4 flex-none fill-white" />}
                      />
                    )}

                    <SelectItem
                      text="Text Channel"
                      value="text"
                      icon={<BsChatText className="size-4 flex-none fill-white" />}
                    />

                    <SelectItem
                      text="Voice Channel"
                      value="voice"
                      icon={<BsVolumeUp className="size-4 flex-none fill-white" />}
                    />
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          )}
        />
      </div>
    </ModalForm>
  );
}
