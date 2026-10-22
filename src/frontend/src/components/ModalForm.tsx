import {cloneElement, isValidElement, type ReactElement, type ReactNode, useId} from "react";
import {type FieldValues, FormProvider, type SubmitHandler, type UseFormReturn} from "react-hook-form";
import Dialog from "./Dialog.tsx";
import {Dialog as RadixDialog} from "radix-ui"

export interface ModalFormProps<TFieldValues extends FieldValues> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  subtitle?: string;
  formMethods: UseFormReturn<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: ReactNode;
  submitButton: ReactNode;
  contentClassName?: string;
  headerIcon?: ReactNode;
  onClear?: () => void;
}

export default function ModalForm<TFieldValues extends FieldValues>({
  open,
  onOpenChange,
  trigger,
  title,
  subtitle,
  formMethods,
  onSubmit,
  children,
  submitButton,
  contentClassName,
  headerIcon,
  onClear,
}: ModalFormProps<TFieldValues>) {
  const formId = useId();

  const footerContent = (
    <div className="w-full flex flex-row justify-end p-3 gap-3">
      {onClear && (
        <button
          type="button"
          className="flex-none button-theme-danger cursor-pointer rounded-md px-6 mr-auto outline-none"
          onClick={onClear}
        >
          Clear
        </button>
      )}

      <RadixDialog.Close
        type="button"
        className="cursor-pointer basis-20 outline-none"
      >
        Cancel
      </RadixDialog.Close>

      {isValidElement(submitButton)
        ? cloneElement(submitButton as ReactElement<{ form?: string; type?: string }>, {
          form: formId,
          type: (submitButton.props as any).type ?? "submit",
        }) : submitButton
      }
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange?.(open);
        
        if (!open) {
          formMethods.reset();
        }
      }}
      trigger={trigger}
      contentClassName={`bg-gray-650 ${contentClassName ?? ""}`}
      headerIcon={headerIcon}
      title={title}
      subtitle={subtitle}
      footerContent={footerContent}
    >
      <FormProvider {...formMethods}>
        <form
          id={formId}
          className="px-4 py-2"
          onSubmit={formMethods.handleSubmit(onSubmit)}
        >
          {children}
        </form>
      </FormProvider>
    </Dialog>
  );
}