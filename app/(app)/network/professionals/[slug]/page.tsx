import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { Section } from "@/components/blocks/section";

async function getProfile(slug: string) {
  const payload = await getCms();
  const result = await payload.find({
    collection: "professional-profiles",
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ?? null;
}

async function canView(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>) {
  if (profile._status === "published") return true;
  const user = await getNetworkUser();
  if (!user) return false;
  const ownerId = typeof profile.owner === "object" ? (profile.owner as { id?: unknown })?.id : profile.owner;
  return String(ownerId) === String(user.id);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile || !(await canView(profile))) return {};
  return { title: `${profile.name as string} — ${profile.title as string}`, description: profile.bio as string };
}

export default async function ProfessionalProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile || !(await canView(profile))) notFound();

  const photo = typeof profile.photo === "object" ? (profile.photo as { url?: string; alt?: string }) : undefined;
  const skills = (profile.skills as { skill: string }[]) ?? [];
  const experience = (profile.experience as { role: string; company?: string; description?: string }[]) ?? [];
  const services = (profile.services as { name: string; description?: string }[]) ?? [];

  const ownerId = typeof profile.owner === "object" ? (profile.owner as { id?: unknown })?.id : profile.owner;
  const portfolio = await (async () => {
    const payload = await getCms();
    // Queried by owner, not the polymorphic `profile` field — see the
    // matching comment in the businesses/[slug] page for why.
    const result = await payload.find({
      collection: "portfolio-projects",
      where: { owner: { equals: ownerId } },
      overrideAccess: true,
    });
    return result.docs;
  })();

  return (
    <Section>
      {profile._status === "draft" && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          This profile is unpublished — only you can see this preview.
        </div>
      )}

      <div className="flex items-center gap-4">
        {photo?.url && <Image src={photo.url} alt={photo.alt ?? profile.name as string} width={64} height={64} className="rounded-full" />}
        <div>
          <h1 className="font-display text-3xl font-medium text-ink">{profile.name as string}</h1>
          <p className="text-n500">{profile.title as string}</p>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-n700">{profile.bio as string}</p>

      {(Boolean(profile.contactEmail) || Boolean(profile.contactPhone)) && (
        <div className="mt-4 flex flex-col gap-1 text-[15px] text-n600">
          {Boolean(profile.contactEmail) && <p>{profile.contactEmail as string}</p>}
          {Boolean(profile.contactPhone) && <p>{profile.contactPhone as string}</p>}
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {skills.map((s) => (
            <span key={s.skill} className="rounded-full bg-petrol-tint px-3 py-1 text-[13px] text-petrol">
              {s.skill}
            </span>
          ))}
        </div>
      )}

      {experience.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-medium text-ink">Experience</h2>
          <div className="mt-4 flex flex-col gap-4">
            {experience.map((e, i) => (
              <div key={i} className="rounded-lg border border-n200 bg-white p-5">
                <h3 className="text-[15px] font-semibold text-ink">
                  {e.role}
                  {e.company ? ` at ${e.company}` : ""}
                </h3>
                {Boolean(e.description) && <p className="mt-1 text-[14px] text-n600">{e.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-medium text-ink">Services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <div key={service.name} className="rounded-lg border border-n200 bg-white p-5">
                <h3 className="text-[15px] font-semibold text-ink">{service.name}</h3>
                {Boolean(service.description) && <p className="mt-1 text-[14px] text-n600">{service.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {portfolio.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-medium text-ink">Portfolio</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {portfolio.map((item) => (
              <div key={item.id} className="rounded-lg border border-n200 bg-white p-5">
                <h3 className="text-[15px] font-semibold text-ink">{item.title as string}</h3>
                {Boolean(item.description) && <p className="mt-1 text-[14px] text-n600">{item.description as string}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
