import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native <details>/<summary> — fully functional with JavaScript disabled,
 * keyboard-operable by default, no extra ARIA wiring required.
 */
export function AccordionItem({
  question,
  children,
  defaultOpen,
  className,
}: {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group border-b border-n200 py-5 first:pt-0 last:border-b-0", className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[17px] font-semibold text-ink marker:content-none">
        {question}
        <Plus className="h-4 w-4 flex-none text-petrol transition-transform duration-200 group-open:rotate-45" />
      </summary>
      <div className="measure mt-3 text-[15px] leading-relaxed text-n700">{children}</div>
    </details>
  );
}

export function Accordion({
  items,
  firstOpen = true,
}: {
  items: { question: string; answer: string }[];
  firstOpen?: boolean;
}) {
  return (
    <div>
      {items.map((item, i) => (
        <AccordionItem key={item.question} question={item.question} defaultOpen={firstOpen && i === 0}>
          <p>{item.answer}</p>
        </AccordionItem>
      ))}
    </div>
  );
}
