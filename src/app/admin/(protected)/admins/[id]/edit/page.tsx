"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetAdmin, type AdminUser } from "@/lib/adminEndpoints";
import { Spinner } from "@/components/ui/Spinner";
import { AdminUserForm } from "../../AdminUserForm";

export default function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetAdmin(id)
      .then((found) => setAdmin(found))
      .catch(() => router.replace("/admin/admins"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!admin) return null;
  return <AdminUserForm admin={admin} />;
}
