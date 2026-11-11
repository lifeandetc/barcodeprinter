"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { act } from "@/lib/browser";
import { Button } from "@/components/ui";

export function LogoForm({ logo }: { logo: string | null }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      {logo ? <img src={logo} alt="Uploaded Life & Etc. logo" className="h-16 w-16 object-contain" /> : <p className="text-sm text-muted">No logo uploaded yet.</p>}
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            void act("saveLogo", { dataUrl: String(reader.result) }).then((result) => {
              toast.success(result.message);
              router.refresh();
            }).catch((error) => toast.error(error.message));
          };
          reader.readAsDataURL(file);
        }}
      />
      {logo ? <Button variant="ghost" onClick={() => act("saveLogo", { dataUrl: null }).then(() => router.refresh())}>Remove logo</Button> : null}
    </div>
  );
}
