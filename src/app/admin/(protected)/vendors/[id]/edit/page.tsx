"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Vendor } from "@/types";
import { adminGetVendor } from "@/lib/adminEndpoints";
import { Spinner } from "@/components/ui/Spinner";
import { VendorForm } from "../../VendorForm";

export default function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetVendor(id)
      .then((found) => setVendor(found))
      .catch(() => router.replace("/admin/vendors"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!vendor) return null;
  return <VendorForm vendor={vendor} />;
}
