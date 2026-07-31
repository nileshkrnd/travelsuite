"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Layers, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listSubscriptionProducts } from "@/lib/services/subscription-products.service";
import {
  createSubscriptionModule,
  updateSubscriptionModule,
  SubscriptionModulesApiError,
} from "@/lib/services/subscription-modules.service";
import type { SubscriptionModule, SubscriptionProduct } from "@/types";

const schema = z.object({
  subscriptionProductId: z.number().int().positive("Product is required"),
  subscriptionModuleName: z
    .string()
    .trim()
    .min(1, "Subscription Module Name is required")
    .max(50, "Max 50 characters"),
  description: z.string().trim().max(200, "Max 200 characters").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function SubscriptionModuleForm({ module }: { module?: SubscriptionModule }) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const isEdit = !!module;
  const listHref = `/${role}/masters/subscription-module`;
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);

  useEffect(() => {
    void listSubscriptionProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const activeProducts = products.filter(
    (p) => p.isActive || p.subscriptionProductId === module?.subscriptionProductId
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      subscriptionProductId: module?.subscriptionProductId ?? 0,
      subscriptionModuleName: module?.subscriptionModuleName ?? "",
      description: module?.description ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    try {
      if (isEdit && module) {
        await updateSubscriptionModule(module.subscriptionModuleId, {
          subscriptionProductId: values.subscriptionProductId,
          subscriptionModuleName: values.subscriptionModuleName.trim(),
          description: values.description?.trim() ?? "",
          isActive: module.isActive,
          modifiedBy: userKey,
        });
        toast.success("Subscription module updated");
        router.push(`${listHref}/${module.subscriptionModuleId}`);
      } else {
        const created = await createSubscriptionModule({
          subscriptionProductId: values.subscriptionProductId,
          subscriptionModuleName: values.subscriptionModuleName.trim(),
          description: values.description?.trim() ?? "",
          createdBy: userKey,
        });
        toast.success("Subscription module created");
        router.push(`${listHref}/${created.subscriptionModuleId}`);
      }
    } catch (error) {
      toast.error(error instanceof SubscriptionModulesApiError ? error.message : "Could not save");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {isEdit ? "Modify subscription module" : "New subscription module"}
            </h2>
            <p className="text-sm text-muted-foreground">Attach a module to a subscription product.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label required>Subscription product</Label>
            <Controller
              name="subscriptionProductId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                >
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select product…";
                        return (
                          activeProducts.find((p) => String(p.subscriptionProductId) === value)
                            ?.subscriptionProductName ??
                          module?.subscriptionProductName ??
                          "Select product…"
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((p) => (
                      <SelectItem key={p.subscriptionProductId} value={String(p.subscriptionProductId)}>
                        {p.subscriptionProductName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subscriptionProductId && (
              <p className="text-sm text-destructive">{errors.subscriptionProductId.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="subscriptionModuleName" required>
              Subscription Module Name
            </Label>
            <Input
              id="subscriptionModuleName"
              autoFocus
              maxLength={50}
              placeholder="e.g. POS, Inventory, Accounts"
              {...register("subscriptionModuleName")}
            />
            {errors.subscriptionModuleName && (
              <p className="text-sm text-destructive">{errors.subscriptionModuleName.message}</p>
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
            <Button type="submit" disabled={isSubmitting || activeProducts.length === 0}>
              <Save className="h-4 w-4" />
              {isEdit ? "Save changes" : "Create module"}
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
