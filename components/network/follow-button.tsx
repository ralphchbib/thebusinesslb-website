"use client";

import { useActionState, useEffect, useState } from "react";
import { followProfileAction, unfollowProfileAction, type SocialFormState } from "@/lib/network/social-actions";
import { Button } from "@/components/ui/button";

const initialState: SocialFormState = { status: "idle" };

/** Same real form-submission toggle shape as SaveButton — see that file's comment. Only rendered for logged-in non-owner viewers; self-follow is also blocked at the access-control layer (payload/access-social.ts). */
export function FollowButton({
  profileType,
  profileId,
  initiallyFollowing,
}: {
  profileType: "business-profiles" | "professional-profiles";
  profileId: string | number;
  initiallyFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [followState, followFormAction, followPending] = useActionState(followProfileAction, initialState);
  const [unfollowState, unfollowFormAction, unfollowPending] = useActionState(unfollowProfileAction, initialState);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (followState.status === "success") setFollowing(true);
    if (followState.status === "error") setError(followState.message);
  }, [followState]);
  useEffect(() => {
    if (unfollowState.status === "success") setFollowing(false);
  }, [unfollowState]);

  if (following) {
    return (
      <form action={unfollowFormAction}>
        <input type="hidden" name="profileType" value={profileType} />
        <input type="hidden" name="profileId" value={profileId} />
        <Button type="submit" variant="secondary" size="sm" disabled={unfollowPending}>
          {unfollowPending ? "Updating…" : "Following ✓"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={followFormAction}>
        <input type="hidden" name="profileType" value={profileType} />
        <input type="hidden" name="profileId" value={profileId} />
        <Button type="submit" variant="secondary" size="sm" disabled={followPending}>
          {followPending ? "Following…" : "Follow"}
        </Button>
      </form>
      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
