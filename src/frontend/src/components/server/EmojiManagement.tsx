import { useEffect, useRef, useState } from "react";
import {
  BsEmojiSmileFill,
  BsEmojiWink,
  BsExclamationTriangle,
  BsPlusLg,
  BsSearch,
  BsTrashFill,
} from "react-icons/bs";
import { Virtuoso } from "react-virtuoso";
import useQueryEmojisForManagement from "../../hooks/useQueryEmojisForManagement.ts";
import { useCommunityServerContext } from "../../contexts/CommunityServerContext.tsx";
import type {
  EmojiDto,
  EmojiManagementDto,
  ServiceResponse,
} from "../../api/types.ts";
import ModalForm from "../ModalForm.tsx";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "radix-ui";
import SelectableImageInput from "../SelectableImageInput.tsx";
import ErrorPopover from "../ErrorPopover.tsx";
import { Avatar } from "../Avatar.tsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { serverService } from "../../api/serverService.ts";
import { toast } from "react-toastify";
import { ServerPermission } from "../../api/schema.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import { queryClient } from "../../main.tsx";
import type { EmojiCreatedEvent, EmojiDeletedEvent } from "../../api/events.ts";
import { Emoji } from "../Emoji.tsx";

export default function EmojiManagement() {
  return (
    <>
      <header className="mb-0 flex-none">
        <h3 className="text-xl font-bold text-white">Emoji</h3>
        <p className="text-sm text-gray-400">
          Sprinkle some extra spice to your conversation with meme and
          animatable.
        </p>
      </header>

      <div className="container mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-gray-600 bg-black/10 px-2 pt-3">
        <ContainerContent />
      </div>
    </>
  );
}

function ContainerContent() {
  const {
    detailsQueryResult: { data: serverDetails },
    hasPermission,
  } = useCommunityServerContext();
  const hasDeletePermission = hasPermission(ServerPermission.DeleteEmoji);

  const { data, isError, isLoading } = useQueryEmojisForManagement(
    serverDetails!.id,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEmojis = !data
    ? []
    : !searchQuery.trim()
      ? data
      : data.filter((emoji) =>
          emoji.shortCode
            .toLowerCase()
            .includes(searchQuery.toLowerCase().trim()),
        );
  const allFilteredIds = filteredEmojis.map((e) => e.id);
  const isAllSelected =
    filteredEmojis.length > 0 &&
    allFilteredIds.every((id) => selectedIds.has(id));
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
      queryKey: useQueryEmojisForManagement.getKey(serverDetails!.id),
    });
  });

  useSignalREvent("EmojiDeleted", (event: EmojiDeletedEvent) => {
    if (event.serverId !== serverDetails!.id) return;

    queryClient.setQueryData<EmojiManagementDto[]>(
      useQueryEmojisForManagement.getKey(serverDetails!.id),
      (oldData) => {
        if (!oldData) return oldData;

        return oldData.filter((e) => !event.emojiIds.includes(e.id));
      },
    );
  });

  return (
    <>
      <div className="flex flex-none flex-row items-center justify-between gap-2 border-b border-gray-700/50 pb-3">
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

        <div className="relative w-full flex-1">
          <BsSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            placeholder="Search by shortcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field h-10 w-full pl-9"
          />
        </div>

        <p className="w-18 flex-none rounded-md border border-gray-700 bg-black/20 py-1 text-center text-xs font-medium text-gray-300">
          {isLoading || isError ? (
            "???"
          ) : data!.length <= 50 ? (
            data!.length
          ) : (
            <span className="text-red-500">{data!.length}</span>
          )}{" "}
          / 50
        </p>

        {hasDeletePermission && selectedIds.size > 0 && (
          <BulkDeleteButton
            selectedIds={selectedIds}
            serverId={serverDetails!.id}
            onSuccess={() => setSelectedIds(new Set())}
          />
        )}

        {hasPermission(ServerPermission.CreateEmoji) && (
          <CreateEmojiButton disabled={isLoading || isError || !data} />
        )}
      </div>

      <div className="min-h-0 flex-1 py-2">
        {isLoading ? (
          <>
            {Array.from({ length: 20 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : isError || !data ? (
          <div className="flex size-full flex-col items-center justify-center gap-1">
            <BsExclamationTriangle className="size-8 fill-white" />
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
  onSuccess,
}: {
  selectedIds: Set<string>;
  serverId: string;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();

  const bulkDeleteMutation = useMutation({
    mutationKey: ["BulkDeleteEmojis"],
    mutationFn: async () => {
      const response = await serverService.deleteEmojis(
        serverId,
        Array.from(selectedIds),
      );

      if (response.success) return;

      throw new Error(response.error!.message!);
    },
    onSuccess: () => {
      toast.success(`Successfully deleted emoji(s).`);

      queryClient.invalidateQueries({
        queryKey: useQueryEmojisForManagement.getKey(serverId),
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
      className="button-theme-danger button-cursor flex flex-none flex-row items-center gap-1 rounded-lg p-2 text-xs font-semibold transition-colors"
    >
      <BsTrashFill className="size-5" />

      <span>{selectedIds.size}</span>
    </button>
  );
}

const createEmojiSchema = z.object({
  shortCode: z
    .string()
    .nonempty("Short code is required.")
    .max(48, "Short code cannot exceed 48 characters.")
    .regex(
      /^[\w\-]+$/,
      "Short code can only contains lowercase, uppercase, numbers, dash and underscore characters.",
    ),

  file: z
    .file("File is required.")
    .max(256 * 1024, "Emoji must be smaller or equals to 256KB."),
});

type CreateEmojiFormValues = z.infer<typeof createEmojiSchema>;

function CreateEmojiButton({ disabled = false }: { disabled?: boolean }) {
  const {
    detailsQueryResult: { data: serverDetails },
  } = useCommunityServerContext();

  const [formOpen, setFormOpen] = useState(false);

  const formMethods = useForm<CreateEmojiFormValues>({
    resolver: zodResolver(createEmojiSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const {
    register,
    control,
    watch,
    reset,
    formState: { errors },
  } = formMethods;

  const shortCodeValue = watch("shortCode", "");

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationKey: ["CreateEmoji"],
    mutationFn: async (data: CreateEmojiFormValues) => {
      const response: ServiceResponse<EmojiDto> =
        await serverService.createEmoji(
          serverDetails!.id,
          data.shortCode,
          data.file,
          crypto.randomUUID(),
        );

      if (response.success) {
        return response.data!;
      }

      throw new Error(response.error!.message!);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: useQueryEmojisForManagement.getKey(serverDetails!.id),
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
      headerIcon={<BsEmojiSmileFill className="size-10 fill-white" />}
      trigger={
        <button
          disabled={disabled}
          className="button-theme-primary button-cursor flex flex-none flex-row items-center justify-center rounded-lg p-2"
        >
          <BsPlusLg className="inline size-5" />
        </button>
      }
      submitButton={
        <button
          type="submit"
          className="button-theme-primary button-cursor w-32 rounded-md py-2"
        >
          Create Emoji
        </button>
      }
      contentClassName="centered-dialog w-xl rounded-md text-white"
    >
      <div className="mb-2">
        <Label.Root className="label mb-1 block">Short code</Label.Root>

        <ErrorPopover
          open={!!errors.shortCode}
          content={errors.shortCode?.message}
        >
          <input
            type="text"
            placeholder="Enter short code of emoji..."
            className="input-field h-10 w-full"
            {...register("shortCode")}
          />
        </ErrorPopover>
      </div>

      <div>
        <Label.Root className="label mb-1 block">Emoji File</Label.Root>

        <div className="flex w-full flex-col items-center justify-center">
          <Controller
            control={control}
            name="file"
            render={({ field }) => (
              <ErrorPopover
                open={!!errors.file}
                content={errors.file?.message}
                sideOffset={0}
              >
                <SelectableImageInput
                  value={field.value}
                  onChange={field.onChange}
                  className="size-48 rounded-xl"
                  fallback={() => (
                    <BsEmojiWink className="size-1/2 fill-gray-700/40" />
                  )}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                />
              </ErrorPopover>
            )}
          />
        </div>

        <p className="mt-2 text-center font-mono text-sm">
          :
          {!shortCodeValue || shortCodeValue.length === 0
            ? "???"
            : shortCodeValue}
          :
        </p>
      </div>
    </ModalForm>
  );
}

function SkeletonRow() {
  return (
    <div className="my-1 flex flex-row items-center justify-between rounded-lg px-3 py-2">
      <div className="flex flex-1 flex-row items-center gap-3.5">
        <div className="size-10 flex-none animate-pulse rounded-lg bg-white/10" />

        <div className="flex-1 space-y-1">
          <div className="h-5 w-1/2 animate-pulse rounded-full bg-white/10"></div>
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/10"></div>
        </div>
      </div>

      <div className="h-4 w-1/5 flex-none animate-pulse rounded-full bg-white/10"></div>
    </div>
  );
}

function Row({
  data,
  isSelected,
  onToggleSelection,
}: {
  data: EmojiManagementDto;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
}) {
  const { hasPermission } = useCommunityServerContext();

  return (
    <div className="hover-highlight group my-1 flex flex-row items-center justify-between rounded-lg px-3 py-2">
      <div className="flex flex-1 items-center gap-3.5">
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
          className="size-10 flex-none"
        />

        <div className="flex-1">
          <span className="text-sm font-semibold text-white">
            {data.shortCode}
          </span>

          <div className="font-mono text-xs text-gray-400">ID: {data.id}</div>
        </div>
      </div>

      <div className="flex flex-none flex-row items-center gap-1.5 text-xs text-gray-400">
        <span>Added by</span>

        <Avatar.User
          userId={data.creator.userId}
          version={data.creator.avatarVersion ?? undefined}
          className="size-5 rounded-full"
        />

        <span className="font-medium text-gray-300">
          {data.creator.displayName}
        </span>
      </div>
    </div>
  );
}
