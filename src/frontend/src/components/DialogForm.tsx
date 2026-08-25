import {Dialog} from "radix-ui";
import type {ReactNode} from "react";
import {type FieldValues, FormProvider, type SubmitHandler, type UseFormReturn} from "react-hook-form";

export interface DialogFormProps<TFieldValues extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  methods: UseFormReturn<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: ReactNode;
  submitButton: ReactNode;
  contentClassName?: string;
  headerIcon?: ReactNode;
  onClear?: () => void;
}

export default function DialogForm<TFieldValues extends FieldValues>({
  open,
  onOpenChange,
  title,
  subtitle,
  methods,
  onSubmit,
  children,
  submitButton,
  contentClassName,
  headerIcon,
  onClear,
}: DialogFormProps<TFieldValues>) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="backdrop-overlay"/>

        <Dialog.Content className={`bg-gray-650 ${contentClassName ?? ""}`}>
          <header className="bg-black/10 px-3 py-2 border-b-2 border-b-gray-600 flex flex-row items-center gap-2">
            {headerIcon}

            <div className="flex-1">
              <Dialog.Title className="font-bold text-xl text-white">{title}</Dialog.Title>

              {subtitle && (
                <Dialog.Description className="text-sm text-gray-400">{subtitle}</Dialog.Description>
              )}
            </div>
          </header>

          <FormProvider {...methods}>
            <form className="flex flex-col items-center mt-2 p-2" onSubmit={methods.handleSubmit(onSubmit)}>
              {children}

              <footer className="w-full flex flex-row justify-end mt-2 gap-3">
                {onClear && (
                  <button type="button" className="flex-none button-theme-danger cursor-pointer rounded-md px-6 mr-auto outline-none" onClick={onClear}>
                    Clear
                  </button>
                )}

                <Dialog.Close
                  type="button"
                  className="cursor-pointer basis-20 outline-none"
                >
                  Cancel
                </Dialog.Close>

                {submitButton}
              </footer>
            </form>
          </FormProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}