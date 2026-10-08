"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetPage } from "@/lib/adminEndpoints";
import type { Page } from "@/lib/endpoints";
import { Spinner } from "@/components/ui/Spinner";
import { PageForm } from "../../PageForm";

export default function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetPage(id)
      .then((found) => setPage(found))
      .catch(() => router.replace("/admin/pages"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!page) return null;
  return <PageForm page={page} />;
}
