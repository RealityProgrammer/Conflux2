import {BsChatText, BsChevronDown, BsFolder, BsVolumeUp} from "react-icons/bs";
import Spinner from "../Spinner.tsx";
import {Label, Select} from "radix-ui";
import ErrorText from "../ErrorText.tsx";
import {Controller, useForm} from "react-hook-form";
import SelectItem from "../SelectItem.tsx";
import ModalForm from "../ModalForm.tsx";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {communityServerService} from "../../api/communityServerService.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import type {ChannelCategoryIdentityDto, ServerChannelIdentityDto, ServiceResponse} from "../../api/types.ts";
import {toast} from "react-toastify";
import {useEffect} from "react";

const createSchema = z.object({
  type: z.enum(["category", "text", "voice"]),
  name: z.string()
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
  initialType = undefined
}: CreateCategoryOrChannelModalProps) {
  const { detailsQueryResult: { data: serverDetails }, appendChannelCategory, appendChannel } = useCommunityServerContext();
  
  const formMethods = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      type: initialType,
    }
  });
  
  const { reset, register, control, formState: { isSubmitting, errors } } = formMethods;

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
          await communityServerService.createChannelCategory(idempotencyKey, serverDetails!.id, data.name);
      
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
        const response: ServiceResponse<ServerChannelIdentityDto> =
          await communityServerService.createChannel(idempotencyKey, serverDetails!.id, data.name, data.type, categoryId);
        
        if (response.success && response.data) {
          onOpenChange(false);
          appendChannel(response.data);
        } else {
          toast.error("Failed to create channel.");
        }
        break;
      }
    }
  }
  
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
      contentClassName="centered-dialog w-lg rounded-md text-white"
      headerIcon={(<BsChatText className="size-10 fill-white"/>)}
      title={"Create new Channel or Category"}
      subtitle={"Claim the unclaimed territory!"}
      onSubmit={handleSubmit}
      submitButton={(
        <button
          type="submit"
          className="button-theme-primary px-3 h-10 cursor-pointer rounded-md basis-32 flex flex-row justify-center items-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Spinner className="size-5 fill-white"/>
          ) : (
            <>Create</>
          )}
        </button>
      )}
    >
      <div className="w-full mb-2">
        <Label.Root className="label block mb-1" htmlFor="name">Name</Label.Root>

        <input
          type="text"
          className="input-field h-10 w-full"
          placeholder={`Enter name`}
          {...register("name")}
        />

        {errors.name && (
          <ErrorText>{errors.name.message}</ErrorText>
        )}
      </div>

      <div className="w-full">
        <Label.Root className="label block mb-1">Type</Label.Root>

        <Controller
          control={control}
          name="type"
          render={({field}) => (
            <Select.Root
              value={field.value}
              onValueChange={field.onChange}
            >
              <Select.Trigger className="w-full input-field h-10 inline-flex flex-row items-center gap-2 ">
                <Select.Value placeholder="Select type to create..."/>
                <Select.Icon className="fill-white flex-none ml-auto">
                  <BsChevronDown className="size-4"/>
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="overflow-hidden bg-gray-700 text-white rounded-md p-1 w-(--radix-select-trigger-width)"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                >
                  <Select.Viewport>
                    {!categoryId && (
                      <SelectItem
                        text="Category"
                        value="category"
                        icon={<BsFolder className="fill-white size-4 flex-none" />}
                      />
                    )}

                    <SelectItem
                      text="Text Channel"
                      value="text"
                      icon={<BsChatText className="fill-white size-4 flex-none"/>}
                    />

                    <SelectItem
                      text="Voice Channel"
                      value="voice"
                      icon={<BsVolumeUp className="fill-white size-4 flex-none"/>}
                    />
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          )}
        />
      </div>
    </ModalForm>
  )
}