import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-n200 bg-white">
      <ol className="mx-auto flex max-w-content flex-wrap items-center gap-1.5 px-6 py-3 text-[13px] text-n500 lg:px-10">
        <li>
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.name} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 flex-none" />
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.name}
              </Link>
            ) : (
              <span className="text-ink">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
