"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Package, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import {
  createSubscriptionProduct,
  updateSubscriptionProduct,
  SubscriptionProductsApiError,
} from "@/lib/services/subscription-products.service";
import type { SubscriptionProduct } from "@/types";

const schema = z.object({
  subscriptionProductName: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(50, "Max 50 characters"),
  description: z.string().trim().max(200, "Max 200 characters").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function SubscriptionProductForm({ product }: { product?: SubscriptionProduct }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const isEdit = !!product;
  const listHref = `/${role}/masters/subscription-product`;
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      subscriptionProductName: product?.subscriptionProductName ?? "",
      description: product?.description ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (isEdit && product) {
        await updateSubscriptionProduct(product.subscriptionProductId, {
          subscriptionProductName: values.subscriptionProductName.trim(),
          description: values.description?.trim() ?? "",
          isActive: product.isActive,
          modifiedBy: userKey,
        });
        toast.success("Subscription product updated");
        router.push(`${listHref}/${product.subscriptionProductId}`);
      } else {
        const created = await createSubscriptionProduct({
          subscriptionProductName: values.subscriptionProductName.trim(),
          description: values.description?.trim() ?? "",
          createdBy: userKey,
        });
        toast.success("Subscription product created");
        router.push(`${listHref}/${created.subscriptionProductId}`);
      }
    } catch (error) {
      toast.error(error instanceof SubscriptionProductsApiError ? error.message : "Could not save");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {isEdit ? "Modify subscription product" : "New subscription product"}
            </h2>
            <p className="text-sm text-muted-foreground">Name and description for SaaS packaging.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="subscriptionProductName" required>
              Product name
            </Label>
            <Input
              id="subscriptionProductName"
              autoFocus
              maxLength={50}
              {...register("subscriptionProductName")}
            />
            {errors.subscriptionProductName && (
              <p className="text-sm text-destructive">{errors.subscriptionProductName.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} maxLength={200} {...register("description")} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4" />
              {isEdit ? "Save changes" : "Create product"}
            </Button>
            <Button type="button" variant="outline" nativeButton={false} render={<Link href={listHref} />}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
