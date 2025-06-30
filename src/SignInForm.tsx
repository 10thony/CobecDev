"use client";
import { SignIn } from "@clerk/clerk-react";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./lib/ThemeContext";

export function SignInForm() {
  const { theme } = useTheme();

  return (
    <div className="w-full relative">
      <ThemeToggle />
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "auth-button",
            formFieldInput: "auth-input-field",
            card: "bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700",
            headerTitle: "text-gray-900 dark:text-white text-2xl font-bold",
            headerSubtitle: "text-gray-600 dark:text-gray-300 text-sm",
            socialButtonsBlockButton: "auth-button bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600",
            socialButtonsBlockButtonText: "text-gray-900 dark:text-white",
            formFieldLabel: "text-gray-700 dark:text-gray-300 text-sm font-medium",
            formFieldLabelRow: "mb-2",
            formFieldInputShowPasswordButton: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            formFieldInputShowPasswordButtonIcon: "w-4 h-4",
            formResendCodeLink: "text-primary hover:text-primary-hover dark:text-blue-400 dark:hover:text-blue-300",
            footerActionLink: "text-primary hover:text-primary-hover dark:text-blue-400 dark:hover:text-blue-300",
            footerActionText: "text-gray-600 dark:text-gray-300",
            dividerLine: "bg-gray-200 dark:bg-gray-700",
            dividerText: "text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800",
            identityPreviewText: "text-gray-900 dark:text-white",
            identityPreviewEditButton: "text-primary hover:text-primary-hover dark:text-blue-400 dark:hover:text-blue-300",
            formFieldRow: "mb-4",
            formFieldRowWithError: "mb-4",
            formFieldErrorText: "text-red-600 dark:text-red-400 text-sm mt-1",
            formFieldErrorTextIcon: "w-4 h-4",
            alert: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
            alertText: "text-red-800 dark:text-red-200",
            alertIcon: "text-red-600 dark:text-red-400",
            verificationCodeFieldInputs: "grid grid-cols-6 gap-2",
            verificationCodeFieldInput: "auth-input-field text-center text-lg font-mono",
            formFieldAction: "text-primary hover:text-primary-hover dark:text-blue-400 dark:hover:text-blue-300 text-sm",
            formFieldHintText: "text-gray-500 dark:text-gray-400 text-sm",
            badge: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium px-2 py-1 rounded",
            modalBackdrop: "bg-black/50",
            modalContent: "bg-white dark:bg-gray-800 shadow-xl rounded-lg",
            modalCloseButton: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
            userPreviewMainIdentifier: "text-gray-900 dark:text-white font-medium",
            userPreviewSecondaryIdentifier: "text-gray-500 dark:text-gray-400 text-sm",
            userPreviewTextContainer: "text-left",
            userPreviewAvatarContainer: "w-10 h-10",
            userPreviewAvatarImage: "rounded-full",
            userPreviewAvatarBox: "bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center",
            userPreviewAvatarBoxText: "text-gray-600 dark:text-gray-300 font-medium",
            userButtonPopoverCard: "bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg",
            userButtonPopoverActionButton: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
            userButtonPopoverActionButtonText: "text-gray-700 dark:text-gray-300",
            userButtonPopoverActionButtonIcon: "text-gray-500 dark:text-gray-400",
            userButtonPopoverFooter: "border-t border-gray-200 dark:border-gray-700",
            userButtonTrigger: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow",
            userButtonTriggerUserPreview: "text-gray-900 dark:text-white",
            userButtonTriggerUserPreviewTextContainer: "text-left",
            userButtonTriggerUserPreviewMainIdentifier: "text-gray-900 dark:text-white font-medium",
            userButtonTriggerUserPreviewSecondaryIdentifier: "text-gray-500 dark:text-gray-400 text-sm",
            userButtonTriggerUserPreviewAvatarContainer: "w-8 h-8",
            userButtonTriggerUserPreviewAvatarImage: "rounded-full",
            userButtonTriggerUserPreviewAvatarBox: "bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center",
            userButtonTriggerUserPreviewAvatarBoxText: "text-gray-600 dark:text-gray-300 text-sm font-medium",
            userButtonTriggerUserPreviewChevron: "text-gray-400 dark:text-gray-500",
            userButtonPopoverActionButtonIconContainer: "w-4 h-4",
            userButtonPopoverActionButtonTextContainer: "text-left",
            userButtonPopoverActionButtonHover: "hover:bg-gray-100 dark:hover:bg-gray-700",
            userButtonPopoverActionButtonActive: "active:bg-gray-200 dark:active:bg-gray-600",
            userButtonPopoverActionButtonFocus: "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800",
            userButtonPopoverActionButtonDisabled: "opacity-50 cursor-not-allowed",
            userButtonPopoverActionButtonLoading: "opacity-75 cursor-wait",
            userButtonPopoverActionButtonSuccess: "text-green-600 dark:text-green-400",
            userButtonPopoverActionButtonDanger: "text-red-600 dark:text-red-400",
            userButtonPopoverActionButtonDestructive: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
            userButtonPopoverActionButtonDestructiveHover: "hover:bg-red-50 dark:hover:bg-red-900/20",
            userButtonPopoverActionButtonDestructiveActive: "active:bg-red-100 dark:active:bg-red-900/30",
            userButtonPopoverActionButtonDestructiveFocus: "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
            userButtonPopoverActionButtonDestructiveDisabled: "opacity-50 cursor-not-allowed",
            userButtonPopoverActionButtonDestructiveLoading: "opacity-75 cursor-wait",
            userButtonPopoverActionButtonDestructiveSuccess: "text-green-600 dark:text-green-400",
            userButtonPopoverActionButtonDestructiveDanger: "text-red-600 dark:text-red-400",
          },
        }}
      />
    </div>
  );
}
