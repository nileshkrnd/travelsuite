import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageHero } from "@/components/marketing/MarketingShell";
import { SAAS_BRAND } from "@/config/saasBrand";
import { BLOG_POSTS } from "@/config/marketingContent";

export const metadata: Metadata = {
  title: `Blogs — ${SAAS_BRAND.name}`,
  description: "Product notes on travel ERP, APIs, POS, and holding operations.",
};

export default function BlogsPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Blogs"
        title="Practical notes — not launch fluff."
        description="How holdings run POS, NDC, property, and partner integrations without stacking five vendors."
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="divide-y divide-[#1a1814]/10 border-y border-[#1a1814]/10">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blogs/${post.slug}`}
              className="grid gap-3 py-8 transition-colors hover:bg-[#1a1814]/[0.03] sm:grid-cols-[160px_1fr] sm:gap-10"
            >
              <div className="text-xs text-[#1a1814]/45">
                <p>
                  {new Date(post.date).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-1">{post.readMins} min read</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c45c26]">
                  {post.category}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{post.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#1a1814]/65">{post.excerpt}</p>
                <p className="mt-3 text-xs text-[#1a1814]/45">By {post.author}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
