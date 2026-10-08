"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetCategory } from "@/lib/adminEndpoints";
import type { Category } from "@/lib/endpoints";
import { Spinner } from "@/components/ui/Spinner";
import { CategoryForm } from "../../CategoryForm";

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetCategory(id)
      .then(setCategory)
      .catch(() => router.replace("/admin/categories"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!category) return null;
  return <CategoryForm category={category} />;
}
