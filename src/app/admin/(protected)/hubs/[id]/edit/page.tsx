"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Hub } from "@/types";
import { adminGetHub } from "@/lib/adminEndpoints";
import { Spinner } from "@/components/ui/Spinner";
import { HubForm } from "../../HubForm";

export default function EditHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [hub, setHub] = useState<Hub | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetHub(id)
      .then((found) => setHub(found))
      .catch(() => router.replace("/admin/hubs"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!hub) return null;
  return <HubForm hub={hub} />;
}
