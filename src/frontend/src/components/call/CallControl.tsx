import {
  BsCameraVideoFill,
  BsCameraVideoOffFill,
  BsChevronDown,
  BsGearFill,
  BsMicFill,
  BsMicMuteFill,
  BsTelephoneXFill,
} from "react-icons/bs";
import IconButton from "../IconButton.tsx";
import { Label, Popover, Select, Separator } from "radix-ui";
import { FaXmark } from "react-icons/fa6";
import type { MediaDeviceOption } from "../../hooks/useUserMedia.ts";
import SelectItem from "../SelectItem.tsx";

interface CallControlProps {
  isEndingCall: boolean;
  handleCallEnd: () => void;

  isAudioMuted: boolean;
  toggleAudio: () => void;
  isVideoDisabled: boolean;
  toggleVideo: () => void;

  selectedVideoDeviceId?: string;
  videoDevices: MediaDeviceOption[];
  handleVideoDeviceChange: (deviceId: string) => void;

  selectedAudioInputDeviceId?: string;
  audioInputDevices: MediaDeviceOption[];
  handleAudioInputDeviceChange: (deviceId: string) => void;

  selectedAudioOutputDeviceId?: string;
  audioOutputDevices: MediaDeviceOption[];
  handleAudioOutputDeviceChange: (deviceId: string) => void;
}

export default function CallControl({
  isEndingCall,
  handleCallEnd,
  isAudioMuted,
  toggleAudio,
  isVideoDisabled,
  toggleVideo,
  selectedVideoDeviceId,
  videoDevices,
  handleVideoDeviceChange,
  selectedAudioInputDeviceId,
  audioInputDevices,
  handleAudioInputDeviceChange,
  selectedAudioOutputDeviceId,
  audioOutputDevices,
  handleAudioOutputDeviceChange,
}: CallControlProps) {
  return (
    <div className="absolute bottom-2 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      <Popover.Root>
        <Popover.Anchor>
          <div className="bg-gray-675 flex flex-row items-center gap-3 rounded-lg border-2 border-gray-600 p-2">
            <IconButton isLoading={false} theme="default" onClick={toggleAudio}>
              {isAudioMuted ? (
                <BsMicMuteFill className="size-6" />
              ) : (
                <BsMicFill className="size-6" />
              )}
            </IconButton>

            <IconButton isLoading={false} theme="default" onClick={toggleVideo}>
              {isVideoDisabled ? (
                <BsCameraVideoOffFill className="size-6" />
              ) : (
                <BsCameraVideoFill className="size-6" />
              )}
            </IconButton>

            <Popover.Trigger asChild>
              <IconButton theme="default">
                <BsGearFill className="size-6" />
              </IconButton>
            </Popover.Trigger>

            <IconButton
              isLoading={false}
              theme="danger"
              disabled={isEndingCall}
              onClick={handleCallEnd}
            >
              <BsTelephoneXFill className="size-6" />
            </IconButton>

            {/*<Dialog*/}
            {/*  title="End call"*/}
            {/*  subtitle="Every fun have to end"*/}
            {/*  headerIcon={(<BsTelephoneXFill className="size-10 fill-white"/>)}*/}
            {/*  trigger={(*/}
            {/*    <IconButton isLoading={false} theme="danger" disabled={isEndingCall}>*/}
            {/*      <BsTelephoneXFill className="size-5"/>*/}
            {/*    </IconButton>*/}
            {/*  )}*/}
            {/*  footerContent={(*/}
            {/*    <div className="w-full flex flex-row justify-end p-3 gap-3">*/}
            {/*      <RadixDialog.Close*/}
            {/*        type="button"*/}
            {/*        className="cursor-pointer basis-20 outline-none"*/}
            {/*      >*/}
            {/*        Cancel*/}
            {/*      </RadixDialog.Close>*/}

            {/*      <button*/}
            {/*        className="button-theme-danger cursor-pointer px-3 py-2 rounded-md"*/}
            {/*        onClick={handleCallEnd}*/}
            {/*      >*/}
            {/*        Delete message*/}
            {/*      </button>*/}
            {/*    </div>*/}
            {/*  )}*/}
            {/*>*/}
            {/*  Are you sure you want to end this call?*/}
            {/*</Dialog>*/}
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            side="top"
            align="center"
            sideOffset={6}
            className="bg-gray-725 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 z-2001 w-80 rounded-lg border-2 border-gray-600 p-2 text-sm text-white"
          >
            <header className="flex items-center justify-between">
              <h3 className="font-medium text-white">Device Settings</h3>

              <Popover.Close asChild>
                <IconButton theme="default">
                  <FaXmark className="size-4" />
                </IconButton>
              </Popover.Close>
            </header>

            <Separator.Root
              orientation="horizontal"
              decorative
              className="horizontal-separator my-2"
            />

            <p className="group-label">Video</p>

            <Label.Root className="label mb-1 block">Input Device</Label.Root>

            <Select.Root
              value={selectedVideoDeviceId}
              onValueChange={handleVideoDeviceChange}
            >
              <Select.Trigger className="input-field inline-flex h-8 w-full flex-row items-center gap-2">
                <Select.Value placeholder="Select device..." />
                <Select.Icon className="ml-auto flex-none fill-white">
                  <BsChevronDown className="size-4" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="bg-gray-650 z-2001 w-(--radix-select-trigger-width) overflow-hidden rounded-md p-1 text-white"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                >
                  <Select.Viewport>
                    {videoDevices.map((videoDevice) => (
                      <SelectItem
                        key={videoDevice.deviceId}
                        text={videoDevice.label}
                        value={videoDevice.deviceId}
                      />
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>

            <Separator.Root
              orientation="horizontal"
              decorative
              className="horizontal-separator my-2"
            />

            <p className="group-label">Audio</p>

            <Label.Root className="label mb-1 block">Input Device</Label.Root>

            <Select.Root
              value={selectedAudioInputDeviceId}
              onValueChange={handleAudioInputDeviceChange}
            >
              <Select.Trigger className="input-field inline-flex h-8 w-full flex-row items-center gap-2">
                <Select.Value placeholder="Select device..." />
                <Select.Icon className="ml-auto flex-none fill-white">
                  <BsChevronDown className="size-4" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="bg-gray-650 z-2001 w-(--radix-select-trigger-width) overflow-hidden rounded-md p-1 text-white"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                >
                  <Select.Viewport>
                    {audioInputDevices.map((audioDevice) => (
                      <SelectItem
                        key={audioDevice.deviceId}
                        text={audioDevice.label}
                        value={audioDevice.deviceId}
                      />
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>

            <Label.Root className="label mb-1 block">Output Device</Label.Root>

            <Select.Root
              value={selectedAudioOutputDeviceId}
              onValueChange={handleAudioOutputDeviceChange}
            >
              <Select.Trigger className="input-field inline-flex h-8 w-full flex-row items-center gap-2">
                <Select.Value placeholder="Select device..." />
                <Select.Icon className="ml-auto flex-none fill-white">
                  <BsChevronDown className="size-4" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="bg-gray-650 z-2001 w-(--radix-select-trigger-width) overflow-hidden rounded-md p-1 text-white"
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                >
                  <Select.Viewport>
                    {audioOutputDevices.map((audioDevice) => (
                      <SelectItem
                        key={audioDevice.deviceId}
                        text={audioDevice.label}
                        value={audioDevice.deviceId}
                      />
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
