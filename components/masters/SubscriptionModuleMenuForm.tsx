"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Layers, ListTree, Save, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listSubscriptionModules } from "@/lib/services/subscription-modules.service";
import { listSubscriptionProducts } from "@/lib/services/subscription-products.service";
import {
  createSubscriptionModuleMenu,
  listSubscriptionModuleMenus,
  updateSubscriptionModuleMenu,
  SubscriptionModuleMenusApiError,
} from "@/lib/services/subscription-module-menus.service";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import { ICONS, ICON_NAMES } from "@/lib/icon-registry";
import type { SubscriptionModule, SubscriptionModuleMenu, SubscriptionProduct } from "@/types";

const schema = z.object({
  subscriptionModuleId: z.number().int().positive("Module is required"),
  parentMenuId: z.number().int().positive().nullable(),
  menuName: z.string().trim().min(1, "Menu name is required").max(100),
  menuUrl: z.string().trim().min(1, "Menu URL is required").max(200),
  menuIcon: z.string().trim().min(1, "Icon is required").max(50),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  subscriptionProductIds: z.array(z.number().int().positive()),
});

type FormValues = z.infer<typeof schema>;

export function SubscriptionModuleMenuForm({
  menu,
}: {
  menu?: SubscriptionModuleMenu;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetModuleId = Number(searchParams.get("moduleId") ?? 0);
  const presetParentId = Number(searchParams.get("parentMenuId") ?? 0);
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const isEdit = !!menu;
  const listHref = `/${role}/masters/subscription-module-menu`;
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const [modules, setModules] = useState<SubscriptionModule[]>([]);
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [allMenus, setAllMenus] = useState<SubscriptionModuleMenu[]>([]);

  useEffect(() => {
    void listSubscriptionModules()
      .then(setModules)
      .catch(() => setModules([]));
    void listSubscriptionProducts({ activeOnly: true })
      .then(setProducts)
      .catch(() => setProducts([]));
    void listSubscriptionModuleMenus()
      .then(setAllMenus)
      .catch(() => setAllMenus([]));
  }, []);

  const activeModules = modules.filter(
    (m) => m.isActive || m.subscriptionModuleId === menu?.subscriptionModuleId
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      subscriptionModuleId:
        menu?.subscriptionModuleId ??
        (Number.isFinite(presetModuleId) && presetModuleId > 0 ? presetModuleId : 0),
      parentMenuId:
        menu?.parentMenuId ??
        (Number.isFinite(presetParentId) && presetParentId > 0 ? presetParentId : null),
      menuName: menu?.menuName ?? "",
      menuUrl: menu?.menuUrl ?? "",
      menuIcon: menu?.menuIcon ?? "Layers",
      sortOrder: menu?.sortOrder ?? 0,
      subscriptionProductIds: menu?.subscriptionProductIds ?? [],
    },
  });

  const moduleId = watch("subscriptionModuleId");
  const menuIcon = watch("menuIcon");
  const selectedProductIds = watch("subscriptionProductIds");
  const IconPreview = ICONS[menuIcon] ?? Layers;

  const selectedModule = activeModules.find((m) => m.subscriptionModuleId === moduleId);
  const isAdministrationModule =
    selectedModule?.subscriptionModuleName === "Administration" &&
    selectedModule?.subscriptionProductName === "Administration";

  const linkableProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.isActive &&
          p.subscriptionProductName !== "Administration" &&
          (isEdit || p.isActive)
      ),
    [products, isEdit]
  );

  useEffect(() => {
    if (!isAdministrationModule) {
      setValue("subscriptionProductIds", []);
    }
  }, [isAdministrationModule, setValue]);

  const parentOptions = useMemo(() => {
    if (!moduleId) return [];
    return allMenus
      .filter(
        (m) =>
          m.subscriptionModuleId === moduleId &&
          m.subscriptionModuleMenuId !== menu?.subscriptionModuleMenuId
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.menuName.localeCompare(b.menuName));
  }, [allMenus, moduleId, menu?.subscriptionModuleMenuId]);

  function toggleProduct(productId: number, checked: boolean) {
    const current = selectedProductIds ?? [];
    if (checked) {
      if (!current.includes(productId)) {
        setValue("subscriptionProductIds", [...current, productId], { shouldDirty: true });
      }
      return;
    }
    setValue(
      "subscriptionProductIds",
      current.filter((id) => id !== productId),
      { shouldDirty: true }
    );
  }

  async function onSubmit(values: FormValues) {
    if (!userKey) {
      toast.error("Missing user key — sign in again.");
      return;
    }
    const normalizedUrl = normalizeMenuUrl(values.menuUrl);
    if (!normalizedUrl) {
      toast.error("Menu URL is required");
      return;
    }
    const productIds = isAdministrationModule ? values.subscriptionProductIds : [];
    try {
      if (isEdit && menu) {
        await updateSubscriptionModuleMenu(menu.subscriptionModuleMenuId, {
          subscriptionModuleId: values.subscriptionModuleId,
          parentMenuId: values.parentMenuId,
          menuName: values.menuName.trim(),
          menuUrl: normalizedUrl,
          menuIcon: values.menuIcon,
          sortOrder: values.sortOrder,
          isActive: menu.isActive,
          subscriptionProductIds: productIds,
          modifiedBy: userKey,
        });
        toast.success("Module menu updated");
        router.push(`${listHref}/${menu.subscriptionModuleMenuId}`);
      } else {
        const created = await createSubscriptionModuleMenu({
          subscriptionModuleId: values.subscriptionModuleId,
          parentMenuId: values.parentMenuId,
          menuName: values.menuName.trim(),
          menuUrl: normalizedUrl,
          menuIcon: values.menuIcon,
          sortOrder: values.sortOrder,
          subscriptionProductIds: productIds,
          createdBy: userKey,
        });
        toast.success("Module menu created");
        router.push(`${listHref}/${created.subscriptionModuleMenuId}`);
      }
    } catch (error) {
      toast.error(
        error instanceof SubscriptionModuleMenusApiError ? error.message : "Could not save"
      );
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListTree className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {isEdit ? "Modify module menu" : "New module menu"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Menus, submenus, icons, and URLs are stored in the database — not hard-coded.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label required>Subscription module</Label>
            <Controller
              name="subscriptionModuleId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value > 0 ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                >
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value) return "Select module…";
                        const m = activeModules.find(
                          (row) => String(row.subscriptionModuleId) === value
                        );
                        if (!m) return menu?.subscriptionModuleName ?? "Select module…";
                        return m.subscriptionProductName
                          ? `${m.subscriptionModuleName} — ${m.subscriptionProductName}`
                          : m.subscriptionModuleName;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeModules.map((m) => (
                      <SelectItem
                        key={m.subscriptionModuleId}
                        value={String(m.subscriptionModuleId)}
                      >
                        {m.subscriptionModuleName}
                        {m.subscriptionProductName ? ` — ${m.subscriptionProductName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subscriptionModuleId && (
              <p className="text-sm text-destructive">{errors.subscriptionModuleId.message}</p>
            )}
          </div>

          {isAdministrationModule && (
            <div className="space-y-3 sm:col-span-2 rounded-lg border border-border p-4">
              <div>
                <Label>Visible for products</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tenant sees this menu when they have Module Access under any selected product.
                  Leave all unchecked for a common menu (e.g. Dashboard).
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {linkableProducts.map((p) => {
                  const checked = (selectedProductIds ?? []).includes(p.subscriptionProductId);
                  return (
                    <label
                      key={p.subscriptionProductId}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          toggleProduct(p.subscriptionProductId, v === true)
                        }
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-snug">{p.subscriptionProductName}</span>
                    </label>
                  );
                })}
              </div>
              {linkableProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">No products available.</p>
              )}
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label>Parent menu</Label>
            <Controller
              name="parentMenuId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value == null ? "none" : String(field.value)}
                  onValueChange={(v) => field.onChange(!v || v === "none" ? null : Number(v))}
                >
                  <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === "none") return "None (top-level)";
                        const p = parentOptions.find(
                          (row) => String(row.subscriptionModuleMenuId) === value
                        );
                        return p?.menuName ?? menu?.parentMenuName ?? "None (top-level)";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {parentOptions.map((p) => (
                      <SelectItem
                        key={p.subscriptionModuleMenuId}
                        value={String(p.subscriptionModuleMenuId)}
                      >
                        {p.menuName}
                        <span className="ms-2 text-muted-foreground">({p.menuUrl})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="menuName" required>
              Menu name
            </Label>
            <Input id="menuName" maxLength={100} placeholder="e.g. Employee" {...register("menuName")} />
            {errors.menuName && (
              <p className="text-sm text-destructive">{errors.menuName.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="menuUrl" required>
              Menu URL
            </Label>
            <Input
              id="menuUrl"
              maxLength={200}
              placeholder="e.g. masters/employee"
              {...register("menuUrl")}
            />
            <p className="text-xs text-muted-foreground">
              Path after the role (example: <code>hrms</code>, <code>sales/dashboard</code>).
            </p>
            {errors.menuUrl && (
              <p className="text-sm text-destructive">{errors.menuUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label required>Icon</Label>
            <Controller
              name="menuIcon"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue>
                      {() => (
                        <span className="flex items-center gap-2">
                          <IconPreview className="h-4 w-4" />
                          {field.value}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {ICON_NAMES.map((name) => {
                      const Ic = ICONS[name];
                      return (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">
                            <Ic className="h-4 w-4" />
                            {name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.menuIcon && (
              <p className="text-sm text-destructive">{errors.menuIcon.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input id="sortOrder" type="number" min={0} max={9999} {...register("sortOrder")} />
            {errors.sortOrder && (
              <p className="text-sm text-destructive">{errors.sortOrder.message}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting || activeModules.length === 0}>
              <Save className="h-4 w-4" />
              {isEdit ? "Save changes" : "Create menu"}
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
