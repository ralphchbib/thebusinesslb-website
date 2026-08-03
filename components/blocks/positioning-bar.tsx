import { positioning } from "@/content/home";

export function PositioningBar() {
  return (
    <div className="border-y border-n200 bg-mist py-4">
      <p className="mx-auto max-w-content px-6 text-center text-sm text-n600 lg:px-10">
        {positioning}
      </p>
    </div>
  );
}
