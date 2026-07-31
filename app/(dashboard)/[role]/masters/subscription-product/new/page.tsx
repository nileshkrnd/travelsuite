"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AccessGate } from "@/components/shared/AccessGate";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { SubscriptionProductForm } from "@/components/masters/SubscriptionProductForm";

function NewProduct() {
  const { role } = useParams<{ role: string }>();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Add subscription product"
        description="Create a global SaaS product for packaging modules."
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/${role}/masters/subscription-product`} />}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        }
      />
      <SubscriptionProductForm />
    </div>
  );
}

export default function NewSubscriptionProductPage() {
  return (
    <AccessGate module="subscriptionProduct" action="create">
      {() => <NewProduct />}
    </AccessGate>
  );
}
