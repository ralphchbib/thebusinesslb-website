import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { LANGUAGE_OPTIONS } from "@/payload/language-options";

export interface DirectoryFilterValues {
  q?: string;
  industry?: string;
  category?: string;
  location?: string;
  service?: string;
  skill?: string;
  language?: string;
}

/**
 * Phase 9C — a plain GET <form> so filtering/pagination work with zero
 * client JS: submitting re-navigates to the same listing path with the
 * chosen values as query params (PHASE9C-TECHNICAL-DESIGN.md §C). `type`
 * swaps in the one field each collection actually has — "Industry" for
 * businesses, "Skill" for professionals — everything else is shared.
 */
export function DirectoryFilterForm({
  basePath,
  type,
  values,
}: {
  basePath: string;
  type: "business" | "professional";
  values: DirectoryFilterValues;
}) {
  return (
    <form action={basePath} method="GET" className="rounded-lg border border-n200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Keyword" htmlFor="q" optional className="lg:col-span-3">
          <Input id="q" name="q" placeholder="Search…" defaultValue={values.q} />
        </FormField>

        {type === "business" ? (
          <FormField label="Industry" htmlFor="industry" optional>
            <Input id="industry" name="industry" defaultValue={values.industry} />
          </FormField>
        ) : (
          <FormField label="Skill" htmlFor="skill" optional>
            <Input id="skill" name="skill" defaultValue={values.skill} />
          </FormField>
        )}

        <FormField label="Category" htmlFor="category" optional>
          <Input id="category" name="category" defaultValue={values.category} />
        </FormField>

        <FormField label="Location" htmlFor="location" optional>
          <Input id="location" name="location" defaultValue={values.location} />
        </FormField>

        <FormField label="Service" htmlFor="service" optional>
          <Input id="service" name="service" defaultValue={values.service} />
        </FormField>

        <FormField label="Language" htmlFor="language" optional>
          <Select id="language" name="language" defaultValue={values.language ?? ""}>
            <option value="">Any</option>
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
