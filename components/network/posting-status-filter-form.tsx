import Link from "next/link";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

/**
 * "Filter By Status" on `/dashboard/opportunities`'s "My Postings" list —
 * the one place multiple statuses genuinely coexist for one account.
 * (Public browse only ever shows `active` postings by design, so a status
 * filter there wouldn't have anything to filter among — see
 * PHASE13-RELEASE-REVIEW.md §B.) Same plain-GET-form, zero-client-JS
 * pattern as `PostingFilterForm`/`DirectoryFilterForm`.
 */
export function PostingStatusFilterForm({ value }: { value?: string }) {
  return (
    <form action="/dashboard/opportunities" method="GET" className="flex items-end gap-3">
      <FormField label="Status" htmlFor="status" optional>
        <Select id="status" name="status" defaultValue={value ?? ""}>
          <option value="">Any</option>
          <option value="active">Active</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="closed">Closed</option>
          <option value="expired">Expired</option>
        </Select>
      </FormField>
      <Button type="submit" size="sm">
        Apply
      </Button>
      {value && (
        <Link href="/dashboard/opportunities" className="text-[13px] font-semibold text-n500 hover:text-ink">
          Clear
        </Link>
      )}
    </form>
  );
}
