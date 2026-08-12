"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { businessProfileSchema, professionalProfileSchema, portfolioItemSchema } from "@/lib/validation/profile-schemas";

export interface ProfileFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Services/social-links/skills/experience are edited as one line per
 * entry rather than a dynamic add/remove field editor — a deliberate
 * scope decision for this "foundation" pass (PHASE9B-TECHNICAL-DESIGN.md),
 * not an oversight. Each parser is forgiving of blank lines and extra
 * whitespace; a malformed line is just skipped rather than erroring the
 * whole submission.
 */
function parseServices(raw: string): { name: string; description?: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(":");
      return { name: name.trim(), description: rest.join(":").trim() || undefined };
    })
    .filter((s) => s.name.length > 0);
}

function parseSocialLinks(raw: string): { label: string; url: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return { label: label.trim(), url: rest.join(":").trim() };
    })
    .filter((s) => s.label.length > 0 && s.url.length > 0);
}

function parseSkills(raw: string): { skill: string }[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((skill) => ({ skill }));
}

function parseExperience(raw: string): { role: string; company?: string; description?: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [role, ...rest] = line.split("—");
      return { role: role.trim(), description: rest.join("—").trim() || undefined };
    })
    .filter((e) => e.role.length > 0);
}

async function uploadIfPresent(file: FormDataEntryValue | null, altText: string): Promise<string | undefined> {
  if (!(file instanceof File) || file.size === 0) return undefined;
  const payload = await getCms();
  const buffer = Buffer.from(await file.arrayBuffer());
  const media = await payload.create({
    collection: "media",
    data: { alt: altText },
    file: { data: buffer, mimetype: file.type, name: file.name, size: file.size },
  });
  return String(media.id);
}

export async function saveBusinessProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getNetworkUser();
  if (!user || user.accountType !== "business") {
    return { status: "error", message: "You need a business account to do this." };
  }

  const parsed = businessProfileSchema.safeParse({
    companyName: formData.get("companyName"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    industry: formData.get("industry"),
    location: formData.get("location"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    services: parseServices(String(formData.get("servicesText") ?? "")),
    socialLinks: parseSocialLinks(String(formData.get("socialLinksText") ?? "")),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  const existing = await payload.find({
    collection: "business-profiles",
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });

  const logoId = await uploadIfPresent(formData.get("logo"), `${parsed.data.companyName} logo`);

  try {
    if (existing.docs[0]) {
      await payload.update({
        collection: "business-profiles",
        id: existing.docs[0].id,
        data: { ...parsed.data, ...(logoId ? { logo: logoId } : {}) },
        overrideAccess: true,
      });
    } else {
      await payload.create({
        collection: "business-profiles",
        data: { ...parsed.data, owner: user.id, ...(logoId ? { logo: logoId } : {}) },
        overrideAccess: true,
      });
    }
  } catch (err) {
    console.error("[profile:business:save:error]", err);
    const message = err instanceof Error ? err.message : "";
    if (message.toLowerCase().includes("unique")) {
      return { status: "error", message: "That slug is already taken.", fieldErrors: { slug: "Already taken." } };
    }
    return { status: "error", message: "Something went wrong saving your profile. Please try again." };
  }

  revalidatePath(`/network/businesses/${parsed.data.slug}`);
  return { status: "success", message: "Saved." };
}

export async function saveProfessionalProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getNetworkUser();
  if (!user || user.accountType !== "professional") {
    return { status: "error", message: "You need a professional account to do this." };
  }

  const parsed = professionalProfileSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    bio: formData.get("bio"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    skills: parseSkills(String(formData.get("skillsText") ?? "")),
    experience: parseExperience(String(formData.get("experienceText") ?? "")),
    services: parseServices(String(formData.get("servicesText") ?? "")),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  const existing = await payload.find({
    collection: "professional-profiles",
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });

  const photoId = await uploadIfPresent(formData.get("photo"), `${parsed.data.name} photo`);

  try {
    if (existing.docs[0]) {
      await payload.update({
        collection: "professional-profiles",
        id: existing.docs[0].id,
        data: { ...parsed.data, ...(photoId ? { photo: photoId } : {}) },
        overrideAccess: true,
      });
    } else {
      await payload.create({
        collection: "professional-profiles",
        data: { ...parsed.data, owner: user.id, ...(photoId ? { photo: photoId } : {}) },
        overrideAccess: true,
      });
    }
  } catch (err) {
    console.error("[profile:professional:save:error]", err);
    const message = err instanceof Error ? err.message : "";
    if (message.toLowerCase().includes("unique")) {
      return { status: "error", message: "That slug is already taken.", fieldErrors: { slug: "Already taken." } };
    }
    return { status: "error", message: "Something went wrong saving your profile. Please try again." };
  }

  revalidatePath(`/network/professionals/${parsed.data.slug}`);
  return { status: "success", message: "Saved." };
}

export async function publishProfileAction(publish: boolean): Promise<ProfileFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };
  if (user.accountType !== "business" && user.accountType !== "professional") {
    return { status: "error", message: "Only business and professional accounts have a profile to publish." };
  }

  const collection = user.accountType === "business" ? "business-profiles" : "professional-profiles";
  const payload = await getCms();
  const existing = await payload.find({
    collection,
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });
  if (!existing.docs[0]) {
    return { status: "error", message: "Save your profile before publishing it." };
  }

  await payload.update({
    collection,
    id: existing.docs[0].id,
    data: { _status: publish ? "published" : "draft" },
    overrideAccess: true,
  });

  const slug = existing.docs[0].slug as string;
  revalidatePath(collection === "business-profiles" ? `/network/businesses/${slug}` : `/network/professionals/${slug}`);
  return { status: "success", message: publish ? "Published." : "Unpublished." };
}

export async function savePortfolioItemAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getNetworkUser();
  if (!user) return { status: "error", message: "Your session has expired. Please log in again." };
  if (user.accountType !== "business" && user.accountType !== "professional") {
    return { status: "error", message: "Only business and professional accounts have a portfolio." };
  }

  const parsed = portfolioItemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    projectLink: formData.get("projectLink"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const profileCollection = user.accountType === "business" ? "business-profiles" : "professional-profiles";
  const payload = await getCms();
  const profile = await payload.find({
    collection: profileCollection,
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });
  if (!profile.docs[0]) {
    return { status: "error", message: "Save your profile before adding portfolio items." };
  }

  const imageId = await uploadIfPresent(formData.get("image"), parsed.data.title);

  try {
    await payload.create({
      collection: "portfolio-projects",
      data: {
        ...parsed.data,
        owner: user.id,
        profile: { relationTo: profileCollection, value: profile.docs[0].id },
        ...(imageId ? { images: [{ image: imageId }] } : {}),
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.error("[profile:portfolio:save:error]", err);
    return { status: "error", message: "Something went wrong saving this project. Please try again." };
  }

  revalidatePath("/dashboard/profile/portfolio");
  return { status: "success", message: "Added." };
}

export async function deletePortfolioItemAction(id: string): Promise<void> {
  const user = await getNetworkUser();
  if (!user) return;
  const payload = await getCms();
  const item = await payload.findByID({ collection: "portfolio-projects", id, depth: 0, overrideAccess: true });
  const ownerId = typeof item?.owner === "object" ? (item.owner as { id?: unknown })?.id : item?.owner;
  if (String(ownerId) !== String(user.id)) return;
  await payload.delete({ collection: "portfolio-projects", id, overrideAccess: true });
  revalidatePath("/dashboard/profile/portfolio");
}
