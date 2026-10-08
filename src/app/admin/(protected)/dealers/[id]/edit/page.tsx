"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dealer } from "@/types";
import { adminGetDealer } from "@/lib/adminEndpoints";
import { Spinner } from "@/components/ui/Spinner";
import { DealerForm } from "../../DealerForm";

export default function EditDealerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetDealer(id)
      .then((found) => setDealer(found))
      .catch(() => router.replace("/admin/dealers"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!dealer) return null;
  return <DealerForm dealer={dealer} />;
}
