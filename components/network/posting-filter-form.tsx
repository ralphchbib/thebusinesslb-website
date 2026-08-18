import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export interface PostingFilterValues {
  q?: string;
  postingType?: string;
  category?: string;
  location?: string;
}

/**
 * Phase 13 — a plain GET <form>, matching DirectoryFilterForm's exact
 * zero-client-JS shape (PHASE13-TECHNICAL-DESIGN.md §H: "public browse/
 * filter page follows the Phase 9C directory pattern").
 */
export function PostingFilterForm({ basePath, values }: { basePath: string; values: PostingFilterValues }) {
  return (
    <form action={basePath} method="GET" className="rounded-lg border border-n200 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Keyword" htmlFor="q" optional className="lg:col-span-2">
          <Input id="q" name="q" placeholder="Search…" defaultValue={values.q} />
        </FormField>

        <FormField label="Type" htmlFor="postingType" optional>
          <Select id="postingType" name="postingType" defaultValue={values.postingType ?? ""}>
            <option value="">Any</option>
            <option value="offer">Offer</option>
            <option value="need">Need</option>
          </Select>
        </FormField>

        <FormField label="Category" htmlFor="category" optional>
          <Input id="category" name="category" defaultValue={values.category} />
        </FormField>

        <FormField label="Location" htmlFor="location" optional>
          <Input id="location" name="location" defaultValue={values.location} />
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
