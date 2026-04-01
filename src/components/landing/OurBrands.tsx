import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HomepageBrand {
  id: string;
  brand_name: string;
  logo_url: string | null;
  website_url: string | null;
}

const OurBrands = () => {
  const [brands, setBrands] = useState<HomepageBrand[]>([]);

  useEffect(() => {
    supabase
      .from("homepage_brands" as any)
      .select("id, brand_name, logo_url, website_url")
      .eq("visible", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (data) setBrands(data as any);
      });
  }, []);

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Our Brands</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Trusted by <span className="text-gradient">leading brands</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            Brands across Hong Kong and London rely on UGC Zone for authentic creator content.
          </p>
        </motion.div>

        {brands.length > 0 ? (
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 max-w-4xl mx-auto">
            {brands.map((brand, i) => (
              <motion.a
                key={brand.id}
                href={brand.website_url || "#"}
                target={brand.website_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ scale: 1.1, y: -4 }}
                className="group flex flex-col items-center gap-3"
              >
                {brand.logo_url ? (
                  <div className="h-20 w-20 rounded-2xl border border-border bg-card overflow-hidden flex items-center justify-center p-2 group-hover:border-primary/40 group-hover:shadow-glow transition-all duration-300">
                    <img src={brand.logo_url} alt={brand.brand_name} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-2xl border border-border bg-gradient-card flex items-center justify-center group-hover:border-primary/40 group-hover:shadow-glow transition-all duration-300">
                    <span className="text-2xl font-heading font-bold text-primary">{brand.brand_name.charAt(0)}</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{brand.brand_name}</span>
              </motion.a>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center gap-3 rounded-2xl border border-dashed border-border bg-gradient-card px-8 py-6">
              <p className="text-muted-foreground">Brand partnerships launching soon. Stay tuned!</p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default OurBrands;
