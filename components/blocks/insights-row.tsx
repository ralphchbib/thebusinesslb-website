import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section } from "./section";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { insights } from "@/content/home";
import { articles } from "@/content/insights";

export function InsightsRow() {
  const featured = articles.slice(0, 3);
  if (featured.length === 0) return null;

  return (
    <Section surface="mist">
      <Reveal>
        <Eyebrow>{insights.eyebrow}</Eyebrow>
        <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {insights.h2}
        </h2>
        <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{insights.body}</p>
      </Reveal>

      <div className="mt-10 flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
        {featured.map((article) => (
          <Reveal key={article.slug} className="min-w-[280px] md:min-w-0">
            <Card className="h-full bg-white">
              <Link href={`/insights/${article.slug}/`} className="flex h-full flex-col">
                <p className="font-mono text-xs uppercase tracking-wide text-petrol">{article.topic.replace("-", " ")}</p>
                <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">{article.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">{article.excerpt}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                  {article.readingMinutes} min read <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
