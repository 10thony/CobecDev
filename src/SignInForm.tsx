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
            card: "bg-berkeley-blue-DEFAULT bg-berkeley-blue-DEFAULT shadow-lg rounded-lg p-6 border border-yale-blue-300 ",
            headerTitle: "text-mint-cream-DEFAULT text-mint-cream-DEFAULT text-2xl font-bold",
            headerSubtitle: "text-mint-cream-600  text-sm",
            socialButtonsBlockButton: "auth-button bg-mint-cream-800  text-mint-cream-DEFAULT text-mint-cream-DEFAULT border border-yale-blue-400  hover:bg-mint-cream-700 ",
            socialButtonsBlockButtonText: "text-mint-cream-DEFAULT text-mint-cream-DEFAULT",
            formFieldLabel: "text-mint-cream-500  text-sm font-medium",
            formFieldLabelRow: "mb-2",
            formFieldInputShowPasswordButton: "text-mint-cream-700  hover:text-mint-cream-500 ",
            formFieldInputShowPasswordButtonIcon: "w-4 h-4",
            formResendCodeLink: "text-primary hover:text-primary-hover  ",
            footerActionLink: "text-primary hover:text-primary-hover  ",
            footerActionText: "text-mint-cream-600 ",
            dividerLine: "bg-mint-cream-700 ",
            dividerText: "text-mint-cream-700  bg-berkeley-blue-DEFAULT bg-berkeley-blue-DEFAULT",
            identityPreviewText: "text-mint-cream-DEFAULT text-mint-cream-DEFAULT",
            identityPreviewEditButton: "text-primary hover:text-primary-hover  ",
            formFieldRow: "mb-4",
            formFieldRowWithError: "mb-4",
            formFieldErrorText: "text-mint-cream-600  text-sm mt-1",
            formFieldErrorTextIcon: "w-4 h-4",
            alert: "bg-red-50  border border-red-200  text-red-800 ",
            alertText: "text-red-800 ",
            alertIcon: "text-mint-cream-600 ",
            verificationCodeFieldInputs: "grid grid-cols-6 gap-2",
            verificationCodeFieldInput: "auth-input-field text-center text-lg font-mono",
            formFieldAction: "text-primary hover:text-primary-hover   text-sm",
            formFieldHintText: "text-mint-cream-700  text-sm",
            badge: "bg-mint-cream-800  text-mint-cream-DEFAULT text-mint-cream-DEFAULT text-xs font-medium px-2 py-1 rounded",
            modalBackdrop: "bg-black/50",
            modalContent: "bg-berkeley-blue-DEFAULT bg-berkeley-blue-DEFAULT shadow-xl rounded-lg",
            modalCloseButton: "text-mint-cream-700 hover:text-mint-cream-600 ",
            userPreviewMainIdentifier: "text-mint-cream-DEFAULT text-mint-cream-DEFAULT font-medium",
            userPreviewSecondaryIdentifier: "text-mint-cream-700  text-sm",
            userPreviewTextContainer: "text-left",
            userPreviewAvatarContainer: "w-10 h-10",
            userPreviewAvatarImage: "rounded-full",
            userPreviewAvatarBox: "bg-mint-cream-700  rounded-full flex items-center justify-center",
            userPreviewAvatarBoxText: "text-mint-cream-600  font-medium",
            userButtonPopoverCard: "bg-berkeley-blue-DEFAULT bg-berkeley-blue-DEFAULT shadow-lg border border-yale-blue-300  rounded-lg",
            userButtonPopoverActionButton: "text-mint-cream-500  hover:bg-mint-cream-800 ",
            userButtonPopoverActionButtonText: "text-mint-cream-500 ",
            userButtonPopoverActionButtonIcon: "text-mint-cream-700 ",
            userButtonPopoverFooter: "border-t border-yale-blue-300 ",
            userButtonTrigger: "bg-berkeley-blue-DEFAULT bg-berkeley-blue-DEFAULT border border-yale-blue-300  rounded-lg shadow-sm hover:shadow",
            userButtonTriggerUserPreview: "text-mint-cream-DEFAULT text-mint-cream-DEFAULT",
            userButtonTriggerUserPreviewTextContainer: "text-left",
            userButtonTriggerUserPreviewMainIdentifier: "text-mint-cream-DEFAULT text-mint-cream-DEFAULT font-medium",
            userButtonTriggerUserPreviewSecondaryIdentifier: "text-mint-cream-700  text-sm",
            userButtonTriggerUserPreviewAvatarContainer: "w-8 h-8",
            userButtonTriggerUserPreviewAvatarImage: "rounded-full",
            userButtonTriggerUserPreviewAvatarBox: "bg-mint-cream-700  rounded-full flex items-center justify-center",
            userButtonTriggerUserPreviewAvatarBoxText: "text-mint-cream-600  text-sm font-medium",
            userButtonTriggerUserPreviewChevron: "text-mint-cream-700 ",
            userButtonPopoverActionButtonIconContainer: "w-4 h-4",
            userButtonPopoverActionButtonTextContainer: "text-left",
            userButtonPopoverActionButtonHover: "hover:bg-mint-cream-800 ",
            userButtonPopoverActionButtonActive: "active:bg-mint-cream-700 ",
            userButtonPopoverActionButtonFocus: "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ",
            userButtonPopoverActionButtonDisabled: "opacity-50 cursor-not-allowed",
            userButtonPopoverActionButtonLoading: "opacity-75 cursor-wait",
            userButtonPopoverActionButtonSuccess: "text-mint-cream-600 ",
            userButtonPopoverActionButtonDanger: "text-mint-cream-600 ",
            userButtonPopoverActionButtonDestructive: "text-mint-cream-600  hover:bg-red-50 ",
            userButtonPopoverActionButtonDestructiveHover: "hover:bg-red-50 ",
            userButtonPopoverActionButtonDestructiveActive: "active:bg-red-100 ",
            userButtonPopoverActionButtonDestructiveFocus: "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ",
            userButtonPopoverActionButtonDestructiveDisabled: "opacity-50 cursor-not-allowed",
            userButtonPopoverActionButtonDestructiveLoading: "opacity-75 cursor-wait",
            userButtonPopoverActionButtonDestructiveSuccess: "text-mint-cream-600 ",
            userButtonPopoverActionButtonDestructiveDanger: "text-mint-cream-600 ",
          },
        }}
      />
    </div>
  );
}
