"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
  "aria-labelledby"?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  className,
  "aria-labelledby": ariaLabelledBy,
}: OtpInputProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Split value into individual digits
  const digits = value.split("").slice(0, length);
  while (digits.length < length) {
    digits.push("");
  }

  // Handle input change
  const handleInputChange = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/\D/g, "");

    if (digit.length > 1) {
      // Handle paste - extract digits and fill all inputs
      const pastedDigits = digit.split("").slice(0, length);
      const newValue = pastedDigits.join("").padEnd(length, "");
      onChange(newValue);

      // Focus the next empty input or the last input
      const nextEmptyIndex = pastedDigits.findIndex(d => d === "");
      const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    // Update the value
    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join("");
    onChange(newValue);

    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key down
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        // Clear current input
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0) {
        // Move to previous input
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle focus
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Select all text when focusing
    inputRefs.current[index]?.select();
  };

  // Handle blur
  const handleBlur = () => {
    setFocusedIndex(null);
  };

  // Focus hidden input when clicking on the container
  const handleContainerClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  // Handle hidden input change (for paste)
  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, "");
    const newValue = inputValue.slice(0, length).padEnd(length, "");
    onChange(newValue);

    // Focus the appropriate visible input
    const focusIndex = Math.min(inputValue.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  // Focus first empty input when value changes
  useEffect(() => {
    const firstEmptyIndex = digits.findIndex(d => d === "");
    if (firstEmptyIndex !== -1 && focusedIndex === null) {
      inputRefs.current[firstEmptyIndex]?.focus();
    }
  }, [value, focusedIndex, digits]);

  return (
    <div className="relative">
      {/* Hidden input for paste support */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={value}
        onChange={handleHiddenInputChange}
        className="absolute opacity-0 pointer-events-none"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Visible OTP inputs */}
      <div
        role="group"
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "flex gap-2 justify-center",
          className
        )}
        onClick={handleContainerClick}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              if (el) {
                inputRefs.current[index] = el;
              }
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              "w-12 h-12 text-center text-xl font-semibold border rounded-lg",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
              "transition-all duration-150",
              "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
              focusedIndex === index && "scale-105",
              digit && "border-indigo-500 bg-indigo-50",
              !digit && "border-gray-300 hover:border-gray-400"
            )}
            aria-label={`Digit ${index + 1} of ${length}`}
          />
        ))}
      </div>
    </div>
  );
}
