import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { deletePortfolioItemAction } from "@/lib/network/profile-actions";
import { PortfolioForm } from "@/components/network/portfolio-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My portfolio" };

export default async function PortfolioPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business" && user.accountType !== "professional") {
    redirect("/dashboard");
  }

  const payload = await getCms();
  const items = await payload.find({
    collection: "portfolio-projects",
    where: { owner: { equals: user.id } },
    sort: "-createdAt",
    overrideAccess: true,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">My portfolio</h1>
        <p className="mt-1 text-sm text-n500">Projects shown on your public profile.</p>

        <div className="mt-6 flex flex-col gap-4">
          {items.docs.length === 0 && <p className="text-[15px] text-n500">No projects yet.</p>}
          {items.docs.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-n200 px-4 py-3">
              <div>
                <p className="text-[15px] font-medium text-ink">{item.title as string}</p>
                {Boolean(item.description) && <p className="text-[13px] text-n500">{item.description as string}</p>}
              </div>
              <form
                action={async () => {
                  "use server";
                  await deletePortfolioItemAction(String(item.id));
                }}
              >
                <Button type="submit" variant="secondary" size="sm">
                  Delete
                </Button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Add a project</h2>
        <div className="mt-4">
          <PortfolioForm />
        </div>
      </div>
    </div>
  );
}
