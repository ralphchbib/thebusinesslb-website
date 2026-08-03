import { Check, X } from "lucide-react";
import { Section } from "./section";
import { Tabs } from "@/components/ui/tabs";

function IncludedList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[15px] text-n700">
          <Check className="mt-0.5 h-4 w-4 flex-none text-petrol" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ExcludedList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-[15px] text-n700">
          <X className="mt-0.5 h-4 w-4 flex-none text-n400" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function IncludedExcluded({
  inclusions,
  exclusions,
}: {
  inclusions: string[];
  exclusions: string[];
}) {
  return (
    <Section surface="mist">
      <p className="eyebrow mb-6">
        <span className="tb-rule tb-rule--petrol" />
        What&rsquo;s included
      </p>

      <div className="hidden grid-cols-2 gap-12 md:grid">
        <div>
          <p className="mb-4 text-sm font-semibold text-ink">Included</p>
          <IncludedList items={inclusions} />
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-ink">Not included</p>
          <ExcludedList items={exclusions} />
        </div>
      </div>

      <div className="md:hidden">
        <Tabs
          tabs={[
            { label: "Included", content: <IncludedList items={inclusions} /> },
            { label: "Not included", content: <ExcludedList items={exclusions} /> },
          ]}
        />
      </div>
    </Section>
  );
}
