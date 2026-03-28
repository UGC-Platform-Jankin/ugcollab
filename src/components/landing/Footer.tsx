const Footer = () => {
  return (
    <footer className="border-t border-border py-16">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-coral" />
              <span className="text-lg font-heading font-bold">CreatorHub</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The UGC campaign platform for Hong Kong and London.
            </p>
          </div>

          {[
            { title: "Platform", links: ["For Brands", "For Creators", "Pricing", "Roadmap"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
            { title: "Legal", links: ["Privacy", "Terms", "Cookie Policy"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CreatorHub. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Hong Kong</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">London</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
