import Container from "../Container.tsx";
import {useEffect, useRef, useState} from "react";
import {BsEmojiSmileFill, BsEmojiWink, BsExclamationTriangle, BsPlusLg, BsSearch, BsTrashFill} from "react-icons/bs";
import {Virtuoso} from "react-virtuoso";
import useEmojisForManagementQuery from "../../hooks/useEmojisForManagementQuery.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import type {EmojiDto, EmojiManagementDto, ServiceResponse} from "../../api/types.ts";
import ModalForm from "../ModalForm.tsx";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Label} from "radix-ui";
import SelectableImageInput from "../SelectableImageInput.tsx";
import ErrorPopover from "../ErrorPopover.tsx";
import {Avatar} from "../Avatar.tsx";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {communityServerService} from "../../api/communityServerService.ts";
import {toast} from "react-toastify";
import {ServerPermission} from "../../api/schema.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import {queryClient} from "../../main.tsx";
import type {EmojiCreatedEvent, EmojiDeletedEvent} from "../../api/events.ts";
import {Emoji} from "../Emoji.tsx";

export default function EmojiManagement() {
  return (
    <>
      <header className="flex-none mb-0">
        <h3 className="text-xl font-bold text-white">Emoji</h3>
        <p className="text-sm text-gray-400">
          Sprinkle some extra spice to your conversation with meme and animatable.
        </p>
      </header>

      <Container
        maxBreakpoint="3xl"
        containerClassName="min-h-0 flex-1"
        className="overflow-hidden h-full bg-black/10 border-2 border-gray-600 rounded-xl px-2 pt-3 flex flex-col"
      >
        <ContainerContent/>
      </Container>
    </>
  );
}

function ContainerContent() {
  const { detailsQueryResult: { data: serverDetails }, hasPermission } = useCommunityServerContext();
  const hasDeletePermission = hasPermission(ServerPermission.DeleteEmoji);

  const { data, isError, isLoading } = useEmojisForManagementQuery(serverDetails!.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEmojis = !data ? [] : !searchQuery.trim() ? data : data.filter((emoji) => emoji.shortCode.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  const allFilteredIds = filteredEmojis.map((e) => e.id);
  const isAllSelected = filteredEmojis.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const isIndeterminate = selectedIds.size > 0 && !isAllSelected;

  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleToggleSelectAll = () => {
    if (isAllSelected || isIndeterminate) {
      setSelectedIds((prev: Set<string>): Set<string> => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev: Set<string>): Set<string> => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useSignalREvent("EmojiCreated", (event: EmojiCreatedEvent) => {
    if (event.serverId !== serverDetails!.id) return;

    queryClient.invalidateQueries({
      queryKey: useEmojisForManagementQuery.getKey(serverDetails!.id),
    });
  });

  useSignalREvent("EmojiDeleted", (event: EmojiDeletedEvent) => {
    if (event.serverId !== serverDetails!.id) return;

    queryClient.setQueryData<EmojiManagementDto[]>(
      useEmojisForManagementQuery.getKey(serverDetails!.id),
      (oldData) => {
        if (!oldData) return oldData;

        return oldData.filter(e => !event.emojiIds.includes(e.id));
      }
    )
  });

  return (
    <>
      <div className="flex-none flex flex-row items-center justify-between gap-2 pb-3 border-b border-gray-700/50">
        {hasDeletePermission && (
          <input
            type="checkbox"
            ref={headerCheckboxRef}
            checked={isAllSelected}
            onChange={handleToggleSelectAll}
            disabled={isLoading || isError || filteredEmojis.length === 0}
            className="input-checkbox size-4 flex-none"
          />
        )}

        <div className="flex-1 relative w-full">
          <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />

          <input
            type="text"
            placeholder="Search by shortcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 input-field pl-9 w-full"
          />
        </div>

        <p className="flex-none text-xs text-center font-medium text-gray-300 w-18 py-1 bg-black/20 rounded-md border border-gray-700">
          { isLoading || isError ? "???" : data!.length <= 50 ? data!.length : <span className="text-red-500">{data!.length}</span> } / 50
        </p>

        {hasDeletePermission && selectedIds.size > 0 && (
          <BulkDeleteButton
            selectedIds={selectedIds}
            serverId={serverDetails!.id}
            onSuccess={() => setSelectedIds(new Set())}
          />
        )}

        {hasPermission(ServerPermission.CreateEmoji) && (
          <CreateEmojiButton disabled={isLoading || isError || !data}/>
        )}
      </div>

      <div className="flex-1 min-h-0 py-2">
        {isLoading ? (
          <>
            {Array.from({ length: 20 }, (_, i) => (
              <SkeletonRow key={i}/>
            ))}
          </>
        ) : isError || !data ? (
          <div className="size-full flex flex-col justify-center items-center gap-1">
            <BsExclamationTriangle className="size-8 fill-white"/>
            <p className="select-none">Failed to load emojis.</p>
          </div>
        ) : (
          <Virtuoso
            className="size-full"
            data={filteredEmojis}
            itemContent={(_, emoji) => (
              <Row
                data={emoji}
                isSelected={selectedIds.has(emoji.id)}
                onToggleSelection={handleToggleRow}
              />
            )}
          />
        )}
      </div>
    </>
  );
}

function BulkDeleteButton({
  selectedIds,
  serverId,
  onSuccess
}: {selectedIds: Set<string>, serverId: string, onSuccess: () => void}) {
  const queryClient = useQueryClient();

  const bulkDeleteMutation = useMutation({
    mutationKey: ["BulkDeleteEmojis"],
    mutationFn: async () => {
      const response = await communityServerService.deleteEmojis(
        serverId,
        Array.from(selectedIds)
      );

      if (response.success) return;

      throw new Error(response.error!.message!);
    },
    onSuccess: () => {
      toast.success(`Successfully deleted emoji(s).`);

      queryClient.invalidateQueries({
        queryKey: useEmojisForManagementQuery.getKey(serverId),
      });

      onSuccess();
    },
    onError: () => {
      toast.error("Failed to delete selected emojis.");
    },
  });

  return (
    <button
      onClick={() => bulkDeleteMutation.mutate()}
      disabled={bulkDeleteMutation.isPending}
      className="flex-none button-theme-danger p-2 rounded-lg button-cursor flex flex-row items-center gap-1 transition-colors text-xs font-semibold"
    >
      <BsTrashFill className="size-5"/>

      <span>{selectedIds.size}</span>
    </button>
  );
}

const createEmojiSchema = z.object({
  shortCode: z.string()
    .nonempty("Short code is required.")
    .max(48, "Short code cannot exceed 48 characters.")
    .regex(/^[\w\-]+$/, "Short code can only contains lowercase, uppercase, numbers, dash and underscore characters."),

  file: z.file("File is required.")
    .max(256 * 1024, "Emoji must be smaller or equals to 256KB."),
});

type CreateEmojiFormValues = z.infer<typeof createEmojiSchema>;

function CreateEmojiButton({disabled = false}: {disabled?: boolean}) {
  const { detailsQueryResult: { data: serverDetails } } = useCommunityServerContext();

  const [formOpen, setFormOpen] = useState(false);

  const formMethods = useForm<CreateEmojiFormValues>({
    resolver: zodResolver(createEmojiSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const { register, control, watch, reset, formState: { errors } } = formMethods;

  const shortCodeValue = watch("shortCode", "");

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationKey: ["CreateEmoji"],
    mutationFn: async (data: CreateEmojiFormValues) => {
      const response: ServiceResponse<EmojiDto> = await communityServerService.createEmoji(
        serverDetails!.id,
        data.shortCode,
        data.file
      );

      if (response.success) {
        return response.data!;
      }

      throw new Error(response.error!.message!);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: useEmojisForManagementQuery.getKey(serverDetails!.id),
      });

      setFormOpen(false);
      reset();
    },
    onError: async (_error: Error) => {
      toast.error("Failed to create emoji.");
    },
  });

  const onSubmit = (data: CreateEmojiFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <ModalForm
      open={formOpen}
      onOpenChange={setFormOpen}
      formMethods={formMethods}
      onSubmit={onSubmit}
      title="Create new emoji"
      subtitle="Extra flavor chat coming right up!"
      headerIcon={<BsEmojiSmileFill className="size-10 fill-white"/>}
      trigger={(
        <button
          disabled={disabled}
          className="flex-none button-theme-primary p-2 rounded-lg button-cursor flex flex-row justify-center items-center"
        >
          <BsPlusLg className="inline size-5"/>
        </button>
      )}
      submitButton={(
        <button
          type="submit"
          className="button-theme-primary w-32 py-2 rounded-md button-cursor"
        >
          Create Emoji
        </button>
      )}
      contentClassName="w-xl centered-dialog w-lg rounded-md text-white"
    >
      <div className="mb-2">
        <Label.Root className="block mb-1 label">Short code</Label.Root>

        <ErrorPopover open={!!errors.shortCode} content={errors.shortCode?.message}>
          <input
            type="text"
            placeholder="Enter short code of emoji..."
            className="h-10 input-field w-full"
            {...register("shortCode")}
          />
        </ErrorPopover>
      </div>

      <div>
        <Label.Root className="block mb-1 label">Emoji File</Label.Root>

        <div className="w-full flex flex-col justify-center items-center">
          <Controller
            control={control}
            name="file"
            render={({ field }) => (
              <ErrorPopover open={!!errors.file} content={errors.file?.message} sideOffset={0}>
                <SelectableImageInput
                  value={field.value}
                  onChange={field.onChange}
                  className="size-48 rounded-xl"
                  fallback={() => (
                    <BsEmojiWink className="size-1/2 fill-gray-700/40"/>
                  )}
                />
              </ErrorPopover>
            )}
          />
        </div>

        <p className="mt-2 text-sm text-center font-mono">:{!shortCodeValue || shortCodeValue.length === 0 ? "???" : shortCodeValue}:</p>
      </div>
    </ModalForm>
  )
}

function SkeletonRow() {
  return (
    <div className="flex flex-row items-center justify-between py-2 px-3 my-1 rounded-lg">
      <div className="flex-1 flex flex-row items-center gap-3.5">
        <div className="flex-none rounded-lg animate-pulse bg-white/10 size-10"/>

        <div className="flex-1 space-y-1">
          <div className="h-5 w-1/2 animate-pulse bg-white/10 rounded-full"></div>
          <div className="h-4 w-1/2 animate-pulse bg-white/10 rounded-full"></div>
        </div>
      </div>

      <div className="flex-none h-4 w-1/5 animate-pulse bg-white/10 rounded-full"></div>
    </div>
  )
}

function Row({data, isSelected, onToggleSelection}: {data: EmojiManagementDto, isSelected: boolean, onToggleSelection: (id: string) => void;}) {
  const { hasPermission } = useCommunityServerContext();

  return (
    <div className="flex flex-row items-center justify-between py-2 px-3 my-1 rounded-lg hover-highlight group">
      <div className="flex-1 flex items-center gap-3.5">
        {hasPermission(ServerPermission.DeleteEmoji) && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(data.id)}
            onClick={(e) => e.stopPropagation()}
            className="input-checkbox size-4 flex-none"
          />
        )}

        <Emoji.Root
          emojiId={data.id}
          shortCode={data.shortCode}
          className="flex-none size-10"
        />

        <div className="flex-1">
          <span className="text-sm text-white font-semibold">
            {data.shortCode}
          </span>

          <div className="text-xs text-gray-400 font-mono">
            ID: {data.id}
          </div>
        </div>
      </div>

      <div className="flex-none text-xs text-gray-400 flex flex-row items-center gap-1.5">
        <span>Added by</span>

        <Avatar.User
          userId={data.creator.userId}
          version={data.creator.avatarVersion ?? undefined}
          className="size-5 rounded-full"
        />

        <span className="text-gray-300 font-medium">
          {data.creator.displayName}
        </span>
      </div>
    </div>
  );
}