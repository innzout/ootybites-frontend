"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Area } from "@/types";
import { adminGetArea } from "@/lib/adminEndpoints";
import { Spinner } from "@/components/ui/Spinner";
import { AreaForm } from "../../AreaForm";

export default function EditAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [area, setArea] = useState<Area | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetArea(id)
      .then((found) => setArea(found))
      .catch(() => router.replace("/admin/areas"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!area) return null;
  return <AreaForm area={area} />;
}
