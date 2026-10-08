"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Coupon } from "@/types";
import { adminGetCoupon } from "@/lib/adminEndpoints";
import { Spinner } from "@/components/ui/Spinner";
import { CouponForm } from "../../CouponForm";

export default function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetCoupon(id)
      .then((found) => setCoupon(found))
      .catch(() => router.replace("/admin/coupons"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!coupon) return null;
  return <CouponForm coupon={coupon} />;
}
