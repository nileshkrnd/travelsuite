"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ListTree, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/session.store";
import { useUsersStore } from "@/lib/store/users.store";
import { listSubscriptionModules } from "@/lib/services/subscription-modules.service";
import {
  createSubscriptionModuleMenu,
  updateSubscriptionModuleMenu,
  SubscriptionModuleMenusApiError,
} from "@/lib/services/subscription-module-menus.service";
import { listAssignableMenuOptions } from "@/lib/subscription-menu-access";
import { normalizeMenuUrl } from "@/lib/normalize-menu-url";
import type { ModuleKey } from "@/config/permissions";
import type { SubscriptionModule, SubscriptionModuleMenu } from "@/types";

const schema = z.object({
  subscriptionModuleId: z.number().int().positive("Module is required"),
  menuName: z.string().trim().min(1, "Menu name is required").max(100),
  menuUrl: z.string().trim().min(1, "Menu URL is required").max(200),
});

type FormValues = z.infer<typeof schema>;

export function SubscriptionModuleMenuForm({
  menu,
}: {
  menu?: SubscriptionModuleMenu;
}) {
  const { role } = useParams<{ role: string }>();
  const router = useRouter();
  const t = useTranslations("sidebar");
  const user = useSessionStore((s) => s.user);
  const users = useUsersStore((s) => s.users);
  const isEdit = !!menu;
  const listHref = `/${role}/masters/subscription-module-menu`;
  const userKey = user ? (users.find((u) => u.id === user.id)?.userKey ?? user.userKey ?? 0) : 0;
  const [modules, setModules] = useState<SubscriptionModule[]>([]);

  useEffect(() => {
    void listSubscriptionModules()
      .then(setModules)
      .catch(() => setModules([]));
  }, []);

  const activeModules = modules.filter(
    (m) => m.isActive || m.subscriptionModuleId === menu?.subscriptionModuleId
  );

  const assignableMenus = useMemo(
    () =>
      listAssignableMenuOptions((key) => {
        try {
          return t(key as ModuleKey);
        } catch {
          return key;
        }
      }),
    [t]
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subscriptionModuleId: menu?.subscriptionModuleId ?? 0,
      menuName: menu?.menuName ?? "",
      menuUrl: menu?.menuUrl ?? "",
    },
  });

  const menuUrl = watch("menuUrl");

  function applyCatalogMenu(path: string) {
    const option = assignableMenus.find((o) => o.path === path);
    if (!option) return;
    setValue("menuUrl", option.path, { shouldValidate: true, shouldDirty: true });
    setValue("menuName", option.label, { shouldValidate: true, shouldDirty: true });
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
    try {
      if (isEdit && menu) {
        await updateSubscriptionModuleMenu(menu.subscriptionModuleMenuId, {
          subscriptionModuleId: values.subscriptionModuleId,
          menuName: values.menuName.trim(),
          menuUrl: normalizedUrl,
          isActive: menu.isActive,
          modifiedBy: userKey,
        });
        toast.success("Module menu updated");
        router.push(`${listHref}/${menu.subscriptionModuleMenuId}`);
      } else {
        const created = await createSubscriptionModuleMenu({
          subscriptionModuleId: values.subscriptionModuleId,
          menuName: values.menuName.trim(),
          menuUrl: normalizedUrl,
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
              Link an application menu to a subscription module. Tenants with that module will see it.
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

          <div className="space-y-2 sm:col-span-2">
            <Label>Pick from app menu</Label>
            <Select
              value={assignableMenus.some((o) => o.path === menuUrl) ? menuUrl : ""}
              onValueChange={(v) => {
                if (v) applyCatalogMenu(v);
              }}
            >
              <SelectTrigger className="h-10 w-full max-w-full min-w-0">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return "Optional — choose an existing sidebar menu…";
                    const option = assignableMenus.find((o) => o.path === value);
                    return option
                      ? `${"— ".repeat(option.depth)}${option.label}`
                      : "Optional — choose an existing sidebar menu…";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {assignableMenus.map((option) => (
                  <SelectItem key={`${option.key}-${option.path}`} value={option.path}>
                    {"— ".repeat(option.depth)}
                    {option.label}
                    <span className="ms-2 text-muted-foreground">({option.path})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecting a catalog menu fills Menu Name and Menu URL. You can still edit them.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="menuName" required>
              Menu name
            </Label>
            <Input id="menuName" maxLength={100} placeholder="e.g. HRMS" {...register("menuName")} />
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
              placeholder="e.g. hrms or accounts/reports"
              {...register("menuUrl")}
            />
            <p className="text-xs text-muted-foreground">
              Use the app path segment after the role (example: <code>hrms</code>,{" "}
              <code>sales/dashboard</code>).
            </p>
            {errors.menuUrl && (
              <p className="text-sm text-destructive">{errors.menuUrl.message}</p>
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
