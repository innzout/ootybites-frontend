"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Banner } from "@/types";
import { adminGetBanner } from "@/lib/adminEndpoints";
import { Spinner } from "@/components/ui/Spinner";
import { BannerForm } from "../../BannerForm";

export default function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetBanner(id)
      .then((found) => setBanner(found))
      .catch(() => router.replace("/admin/banners"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!banner) return null;
  return <BannerForm banner={banner} />;
}
