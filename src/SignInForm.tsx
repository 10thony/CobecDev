"use client";
import { SignIn } from "@clerk/clerk-react";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./lib/ThemeContext";

export function SignInForm() {
  const { theme } = useTheme();

  return (
    <div className="w-full relative">
      <ThemeToggle />
      <div className="relative">
        {/* Neon top line effect matching TronPanel */}
        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)'
          }}
        />
        <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "tron-btn tron-btn-primary",
            formFieldInput: "tron-input",
            card: "bg-tron-bg-panel shadow-tron-glow rounded-lg p-6 border border-tron-cyan/20 relative overflow-hidden",
            headerTitle: "text-tron-white text-2xl font-bold tron-glow-text",
            headerSubtitle: "text-tron-gray text-sm",
            socialButtonsBlockButton: "tron-btn border-tron-cyan text-tron-cyan hover:bg-tron-cyan/10 hover:shadow-tron-glow",
            socialButtonsBlockButtonText: "text-tron-cyan",
            formFieldLabel: "text-tron-gray text-sm font-medium",
            formFieldLabelRow: "mb-2",
            formFieldInputShowPasswordButton: "text-tron-gray hover:text-tron-cyan",
            formFieldInputShowPasswordButtonIcon: "w-4 h-4",
            formResendCodeLink: "text-tron-cyan hover:text-tron-cyan-dim",
            footerActionLink: "text-tron-cyan hover:text-tron-cyan-dim",
            footerActionText: "text-tron-gray",
            dividerLine: "bg-tron-cyan/20",
            dividerText: "text-tron-gray bg-tron-bg-panel",
            identityPreviewText: "text-tron-white",
            identityPreviewEditButton: "text-tron-cyan hover:text-tron-cyan-dim",
            formFieldRow: "mb-4",
            formFieldRowWithError: "mb-4",
            formFieldErrorText: "text-neon-error text-sm mt-1",
            formFieldErrorTextIcon: "w-4 h-4",
            alert: "bg-neon-error/10 border border-neon-error/30 text-neon-error",
            alertText: "text-neon-error",
            alertIcon: "text-neon-error",
            verificationCodeFieldInputs: "grid grid-cols-6 gap-2",
            verificationCodeFieldInput: "tron-input text-center text-lg font-mono",
            formFieldAction: "text-tron-cyan hover:text-tron-cyan-dim text-sm",
            formFieldHintText: "text-tron-gray text-sm",
            badge: "bg-tron-bg-elevated text-tron-cyan border border-tron-cyan/30 text-xs font-medium px-2 py-1 rounded",
            modalBackdrop: "bg-black/70 backdrop-blur-sm",
            modalContent: "bg-tron-bg-panel border border-tron-cyan/20 shadow-tron-glow rounded-lg",
            modalCloseButton: "text-tron-gray hover:text-tron-white",
            userPreviewMainIdentifier: "text-tron-white font-medium",
            userPreviewSecondaryIdentifier: "text-tron-gray text-sm",
            userPreviewTextContainer: "text-left",
            userPreviewAvatarContainer: "w-10 h-10",
            userPreviewAvatarImage: "rounded-full",
            userPreviewAvatarBox: "bg-tron-bg-elevated rounded-full flex items-center justify-center border border-tron-cyan/20",
            userPreviewAvatarBoxText: "text-tron-cyan font-medium",
            userButtonPopoverCard: "bg-tron-bg-panel border border-tron-cyan/20 shadow-tron-glow rounded-lg",
            userButtonPopoverActionButton: "text-tron-gray hover:bg-tron-cyan/10 hover:text-tron-white",
            userButtonPopoverActionButtonText: "text-tron-gray",
            userButtonPopoverActionButtonIcon: "text-tron-gray",
            userButtonPopoverFooter: "border-t border-tron-cyan/20",
            userButtonTrigger: "bg-tron-bg-panel border border-tron-cyan/20 rounded-lg shadow-sm hover:shadow-tron-glow",
            userButtonTriggerUserPreview: "text-tron-white",
            userButtonTriggerUserPreviewTextContainer: "text-left",
            userButtonTriggerUserPreviewMainIdentifier: "text-tron-white font-medium",
            userButtonTriggerUserPreviewSecondaryIdentifier: "text-tron-gray text-sm",
            userButtonTriggerUserPreviewAvatarContainer: "w-8 h-8",
            userButtonTriggerUserPreviewAvatarImage: "rounded-full",
            userButtonTriggerUserPreviewAvatarBox: "bg-tron-bg-elevated rounded-full flex items-center justify-center border border-tron-cyan/20",
            userButtonTriggerUserPreviewAvatarBoxText: "text-tron-cyan text-sm font-medium",
            userButtonTriggerUserPreviewChevron: "text-tron-gray",
            userButtonPopoverActionButtonIconContainer: "w-4 h-4",
            userButtonPopoverActionButtonTextContainer: "text-left",
            userButtonPopoverActionButtonHover: "hover:bg-tron-cyan/10",
            userButtonPopoverActionButtonActive: "active:bg-tron-cyan/20",
            userButtonPopoverActionButtonFocus: "focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:ring-offset-2 focus:ring-offset-tron-bg-panel",
            userButtonPopoverActionButtonDisabled: "opacity-50 cursor-not-allowed",
            userButtonPopoverActionButtonLoading: "opacity-75 cursor-wait",
            userButtonPopoverActionButtonSuccess: "text-neon-success",
            userButtonPopoverActionButtonDanger: "text-neon-error",
            userButtonPopoverActionButtonDestructive: "text-neon-error hover:bg-neon-error/10",
            userButtonPopoverActionButtonDestructiveHover: "hover:bg-neon-error/10",
            userButtonPopoverActionButtonDestructiveActive: "active:bg-neon-error/20",
            userButtonPopoverActionButtonDestructiveFocus: "focus:outline-none focus:ring-2 focus:ring-neon-error focus:ring-offset-2 focus:ring-offset-tron-bg-panel",
            userButtonPopoverActionButtonDestructiveDisabled: "opacity-50 cursor-not-allowed",
            userButtonPopoverActionButtonDestructiveLoading: "opacity-75 cursor-wait",
            userButtonPopoverActionButtonDestructiveSuccess: "text-neon-success",
            userButtonPopoverActionButtonDestructiveDanger: "text-neon-error",
          },
        }}
        />
      </div>
    </div>
  );
}
