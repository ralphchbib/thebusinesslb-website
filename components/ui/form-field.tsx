import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  optional,
  error,
  helper,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <Label htmlFor={htmlFor} optional={optional}>
        {label}
      </Label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="mt-1.5 flex items-start gap-1.5 text-[13px] text-error"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          {error}
        </p>
      ) : helper ? (
        <p className="mt-1.5 text-[13px] text-n500">{helper}</p>
      ) : null}
    </div>
  );
}
