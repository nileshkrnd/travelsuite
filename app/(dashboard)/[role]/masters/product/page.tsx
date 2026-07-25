"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Package, MoreHorizontal, X, Search } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SortableTableHead, type SortDirection } from "@/components/shared/SortableTableHead";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProductsStore } from "@/lib/store/products.store";
import { useSuppliersStore } from "@/lib/store/suppliers.store";
import { useTenantStore } from "@/lib/store/tenant.store";
import { useHydrateReferenceMasters, useCitiesForCountry } from "@/lib/hooks/useReferenceMasters";
import { useReferenceStore } from "@/lib/store/reference.store";
import { getCountry } from "@/config/countries";
import { can } from "@/config/permissions";
import {
  PRODUCT_TYPES,
  getProductTypeName,
  type Product,
  type ProductTypeCode,
  type RoleDef,
} from "@/types";

type PanelMode = "closed" | "create" | "edit" | "view";
type SortKey = "code" | "name" | "country" | "city" | "productType" | "status" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

const PRODUCT_TYPE_CODES = PRODUCT_TYPES.map((t) => t.code) as [ProductTypeCode, ...ProductTypeCode[]];

function useProductSchema(products: Product[], currentId?: string) {
  return z.object({
    code: z
      .string()
      .min(1, "Product code is required")
      .max(40, "Product code must be 40 characters or fewer")
      .refine(
        (value) =>
          !products.some((p) => p.id !== currentId && p.code.toLowerCase() === value.trim().toLowerCase()),
        "This product code is already in use"
      ),
    name: z.string().min(1, "Product name is required"),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    supplierId: z.string().min(1, "Supplier is required"),
    productType: z.enum(PRODUCT_TYPE_CODES, { error: "Product type is required" }),
  });
}

type FormValues = z.infer<ReturnType<typeof useProductSchema>>;

function ProductPanel({
  mode,
  product,
  products,
  suppliers,
  onClose,
}: {
  mode: Exclude<PanelMode, "closed">;
  product?: Product;
  products: Product[];
  suppliers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const addProduct = useProductsStore((s) => s.addProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const countries = useReferenceStore((s) => s.countries);
  useHydrateReferenceMasters();
  const schema = useProductSchema(products, product?.id);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      code: product?.code ?? "",
      name: product?.name ?? "",
      country: product?.country ?? "",
      city: product?.city ?? "",
      supplierId: product?.supplierId ?? "",
      productType: product?.productType ?? "flight",
    },
  });

  const countryValue = useWatch({ control, name: "country" });
  const { cities: cityOptions, loading: citiesLoading } = useCitiesForCountry(countryValue || undefined);

  async function onSubmit(values: FormValues) {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      country: values.country,
      city: values.city,
      supplierId: values.supplierId,
      productType: values.productType,
    };
    if (mode === "edit" && product) {
      updateProduct(product.id, payload);
      toast.success("Product updated");
    } else if (mode === "create") {
      addProduct(payload);
      toast.success("Product created");
    }
    onClose();
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "create" ? "Add product" : mode === "edit" ? "Edit product" : "Product details"}
          </h2>
          {mode === "view" && product && (
            <p className="text-sm text-muted-foreground">
              Created {new Date(product.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="productCode" required>
            Product code
          </Label>
          <Input
            id="productCode"
            autoFocus={mode !== "view"}
            disabled={isReadOnly}
            aria-invalid={!!errors.code}
            {...register("code")}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName" required>
            Product name
          </Label>
          <Input
            id="productName"
            disabled={isReadOnly}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label required>Country</Label>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value ?? "");
                  setValue("city", "");
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? (countries.find((c) => c.code === value)?.name ?? value) : "Select country"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
        </div>

        <div className="space-y-2">
          <Label required>City</Label>
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? "")}
                disabled={isReadOnly || !countryValue}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue
                    placeholder={
                      !countryValue
                        ? "Select a country first"
                        : citiesLoading
                          ? "Loading cities…"
                          : "Select city"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((city) => (
                    <SelectItem key={city.id} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>

        <div className="space-y-2">
          <Label required>Supplier</Label>
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value ?? "")}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? (suppliers.find((s) => s.id === value)?.name ?? value) : "Select supplier"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No active suppliers — add one under Partners → Supplier
                    </div>
                  ) : (
                    suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          />
          {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label required>Product type</Label>
          <Controller
            control={control}
            name="productType"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange((value as ProductTypeCode) ?? "flight")}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      value ? getProductTypeName(value as ProductTypeCode) : "Select product type"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.productType && <p className="text-sm text-destructive">{errors.productType.message}</p>}
        </div>

        {mode === "view" && product && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Status</Label>
            <div>
              <Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status}</Badge>
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {mode === "edit" ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

function ProductList({ roleDef }: { roleDef: RoleDef }) {
  const tenantId = useTenantStore((s) => s.tenantId);
  const allProducts = useProductsStore((s) => s.products);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const allSuppliers = useSuppliersStore((s) => s.suppliers);

  const products = useMemo(
    () => allProducts.filter((p) => p.tenantId === tenantId),
    [allProducts, tenantId]
  );
  const suppliers = useMemo(
    () => allSuppliers.filter((s) => s.tenantId === tenantId && s.status === "active"),
    [allSuppliers, tenantId]
  );
  const supplierName = (id: string) => allSuppliers.find((s) => s.id === id)?.name ?? "—";

  const [panelMode, setPanelMode] = useState<PanelMode>("closed");
  const [target, setTarget] = useState<Product | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const canEdit = can(roleDef, "product", "edit");
  const canCreate = can(roleDef, "product", "create");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = products;
    if (term) {
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(term) ||
          p.name.toLowerCase().includes(term) ||
          getProductTypeName(p.productType).toLowerCase().includes(term) ||
          supplierName(p.supplierId).toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = String(av).localeCompare(String(bv));
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [products, search, statusFilter, sortKey, sortDirection, allSuppliers]);

  function openCreate() {
    setTarget(undefined);
    setPanelMode("create");
  }
  function openEdit(product: Product) {
    setTarget(product);
    setPanelMode("edit");
  }
  function openView(product: Product) {
    setTarget(product);
    setPanelMode("view");
  }
  function closePanel() {
    setPanelMode("closed");
    setTarget(undefined);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Product"
        description="Product master for your tenant — code, location, supplier, and type."
        actions={
          canCreate && panelMode === "closed" ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          ) : undefined
        }
      />

      {panelMode !== "closed" && (
        <ProductPanel
          mode={panelMode}
          product={target}
          products={products}
          suppliers={suppliers}
          onClose={closePanel}
        />
      )}

      {products.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search code, name, type, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            tone="primary"
            heading="No products yet"
            description="Add your first product to get started."
            size="compact"
          />
        ) : visibleProducts.length === 0 ? (
          <EmptyState
            icon={Search}
            tone="muted"
            heading="No matching products"
            description="Try a different search term or status filter."
            size="compact"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr. No</TableHead>
                <SortableTableHead sortKey="code" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Product code
                </SortableTableHead>
                <SortableTableHead sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Product name
                </SortableTableHead>
                <SortableTableHead sortKey="country" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  Country
                </SortableTableHead>
                <SortableTableHead sortKey="city" activeKey={sortKey} direction={sortDirection} onSort={toggleSort}>
                  City
                </SortableTableHead>
                <TableHead>Supplier</TableHead>
                <SortableTableHead
                  sortKey="productType"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Product type
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                >
                  Status
                </SortableTableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product, index) => (
                <TableRow key={product.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{getCountry(product.country)?.name ?? product.country}</TableCell>
                  <TableCell>{product.city}</TableCell>
                  <TableCell>{supplierName(product.supplierId)}</TableCell>
                  <TableCell>{getProductTypeName(product.productType)}</TableCell>
                  <TableCell>
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(product)}>View</DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(product)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateProduct(product.id, {
                                  status: product.status === "active" ? "inactive" : "active",
                                })
                              }
                            >
                              {product.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default function ProductMasterPage() {
  return <AccessGate module="product">{(roleDef) => <ProductList roleDef={roleDef} />}</AccessGate>;
}
