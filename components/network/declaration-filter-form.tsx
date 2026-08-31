import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { allDeclarations } from "@/lib/validation/diaspora-schemas";
import { DECLARATION_LABELS } from "@/lib/network/diaspora-labels";

export interface DeclarationFilterValues {
  side?: string;
  declaration?: string;
}

/** A plain GET <form>, matching PostingFilterForm's exact zero-client-JS shape (PHASE18B-TECHNICAL-DESIGN.md §C: mirrors /network/opportunities' pattern). */
export function DeclarationFilterForm({ basePath, values }: { basePath: string; values: DeclarationFilterValues }) {
  return (
    <form action={basePath} method="GET" className="rounded-lg border border-n200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Side" htmlFor="side" optional>
          <Select id="side" name="side" defaultValue={values.side ?? ""}>
            <option value="">Everyone</option>
            <option value="supply">Businesses &amp; professionals</option>
            <option value="diaspora">Diaspora members</option>
          </Select>
        </FormField>

        <FormField label="Declaration" htmlFor="declaration" optional>
          <Select id="declaration" name="declaration" defaultValue={values.declaration ?? ""}>
            <option value="">Any</option>
            {allDeclarations.map((value) => (
              <option key={value} value={value}>
                {DECLARATION_LABELS[value]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        <a href={basePath} className="text-[13px] font-semibold text-n500 hover:text-ink">
          Clear
        </a>
      </div>
    </form>
  );
}
