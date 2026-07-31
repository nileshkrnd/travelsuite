import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { BLOG_POSTS } from "@/config/marketingContent";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: `Blog — ${SAAS_BRAND.name}` };
  return { title: `${post.title} — ${SAAS_BRAND.name}`, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <MarketingPageHero eyebrow={post.category} title={post.title} description={post.excerpt} />
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="text-xs text-[#1a1814]/45">
          {new Date(post.date).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}{" "}
          · {post.readMins} min · {post.author}
        </p>
        <div className="prose-nexus mt-8 space-y-4 text-base leading-relaxed text-[#1a1814]/75">
          <p>
            This is a prototype article for {SAAS_BRAND.name}. In production, this page would load
            long-form content from your CMS. The structure is intentionally quiet — title, meta,
            and readable body — so it never feels like a template dump.
          </p>
          <p>
            {post.excerpt} Teams evaluating modular ERP usually start with POS and accounts, then
            layer mid office, OTA, or property once the first desk is live.
          </p>
          <p>
            If you want a walkthrough for your holding structure,{" "}
            <Link href="/contact" className="font-medium text-[#c45c26] hover:underline">
              contact us
            </Link>{" "}
            or{" "}
            <Link href="/register" className="font-medium text-[#c45c26] hover:underline">
              start a trial
            </Link>
            .
          </p>
        </div>
        <Link href="/blogs" className="mt-12 inline-block text-sm font-medium text-[#c45c26] hover:underline">
          ← All blogs
        </Link>
      </article>
    </>
  );
}
