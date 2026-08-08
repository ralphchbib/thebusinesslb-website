import { Check } from "lucide-react";
import { Section } from "@/components/blocks/section";
import type { PayloadComparisonTableBlockDoc } from "@/lib/cms/types";

/**
 * Phase 6B — deliberately a real <table> with 2 fixed columns, not a
 * generic N-column grid — see payload/blocks/ComparisonTable.ts for why
 * the fixed-column design was chosen (prevents row/column misalignment
 * by construction). A real <table> element (not a div-grid) so screen
 * readers get correct header association for free.
 */
export function PageComparisonTableBlock({
  eyebrow,
  h2,
  leftColumnLabel,
  rightColumnLabel,
  rows,
}: Omit<PayloadComparisonTableBlockDoc, "id" | "blockType" | "isVisible">) {
  return (
    <Section surface="mist">
      {eyebrow && (
        <p className="eyebrow mb-3.5">
          <span className="tb-rule tb-rule--petrol" />
          {eyebrow}
        </p>
      )}
      {h2 && (
        <h2 className="font-display mb-8 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {h2}
        </h2>
      )}
      <div className="overflow-x-auto rounded-lg border border-n200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-n200">
              <th scope="col" className="p-4 font-medium text-n600" />
              <th scope="col" className="p-4 font-semibold text-ink">
                {leftColumnLabel || "Us"}
              </th>
              <th scope="col" className="p-4 font-semibold text-n600">
                {rightColumnLabel || "Everyone else"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i} className={i > 0 ? "border-t border-n200" : undefined}>
                <th scope="row" className="p-4 font-medium text-n700">
                  {row.label}
                </th>
                <td className="p-4 text-ink">
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 flex-none text-petrol" />
                    {row.leftValue}
                  </span>
                </td>
                <td className="p-4 text-n600">{row.rightValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
