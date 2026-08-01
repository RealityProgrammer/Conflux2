import {type ButtonHTMLAttributes, type ReactNode, useState, type MouseEvent} from "react";
import Spinner from "./Spinner.tsx";

export enum IconButtonTheme {
    Default = 'default',
    Success = 'success',
    Warning = 'warning',
    Danger = 'danger',
    Info = 'info',
}

const THEME_STYLES: Record<string, string> = {
    [IconButtonTheme.Default]: 'text-slate-200 hover:text-white disabled:text-slate-200/35',
    [IconButtonTheme.Success]: 'text-green-400 hover:text-green-600 disabled:text-green-400/35',
    [IconButtonTheme.Warning]: 'text-yellow-400 hover:text-yellow-500 disabled:text-yellow-400/35',
    [IconButtonTheme.Danger]: 'text-red-400 hover:text-red-600 disabled:text-red-400/35',
    [IconButtonTheme.Info]: 'text-sky-400 hover:text-sky-600 disabled:text-sky-400/35',
};

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
    children?: ReactNode;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    isLoading?: boolean;
    setIsLoadingChanged?: (isLoading: boolean) => void;
    theme?: IconButtonTheme | (string & {});    // & {} so that IconButtonTheme got auto-complete
}

export default function IconButton({
    children,
    isLoading,
    setIsLoadingChanged,
    onClick,
    disabled,
    theme = IconButtonTheme.Default,
    className = '',
    ...props
}: IconButtonProps) {
    const [isLoadingInternal, setIsLoadingInternal] = useState(false);
    const isCurrentlyLoading = isLoading ?? isLoadingInternal;

    const themeClass = THEME_STYLES[theme] ?? theme;

    const changeLoadingState = (loading: boolean) => {
        if (setIsLoadingChanged) {
            setIsLoadingChanged(loading);
        } else {
            setIsLoadingInternal(loading);
        }
    };

    const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
        if (!onClick || isCurrentlyLoading) return;

        changeLoadingState(true);

        try {
            await onClick(e);
        } finally {
            changeLoadingState(false);
        }
    };

    return (
        <button
            {...props}
            onClick={handleClick}
            disabled={isCurrentlyLoading || disabled}
            className={`inline-flex items-center justify-center button-cursor pointer-events-auto ${themeClass} ${className}`}
        >
            {isCurrentlyLoading ? (
                <Spinner className="size-full fill-white"/>
            ) : (
                children
            )}
        </button>
    );
}