import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const CustomPage: React.FC = () => {
  const { slug } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/landing-page-config');
        if (!resp.ok) { setConfig({}); return; }
        const j = await resp.json();
        const cfg = j.config || j;
        setConfig(cfg);
        const found = (cfg.customPages || []).find((p: any) => String(p.slug) === String(slug));
        setPage(found || null);
      } catch (e) {
        console.error(e);
        setConfig({});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const primaryColor = config?.primaryColor || '#2563eb';
  const navBackgroundColor = config?.navBackgroundColor || '#ffffff';
  const navTextColor = config?.navTextColor || '#374151';
  const appName = config?.appName || 'OneApp';

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 shadow-sm" style={{ backgroundColor: navBackgroundColor, zIndex: 1000, position: 'sticky' as any }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                {config?.logoUrl ? <img src={config.logoUrl} alt="Logo" className="h-10" /> : <span className="text-2xl font-bold" style={{ color: primaryColor }}>{appName}</span>}
              </Link>
            </div>
            <div className="flex gap-4 items-center">
              {(config?.customPages || []).filter((p: any) => p.displayOnNav).map((p: any) => (
                <Link key={p.slug} to={`/page/${p.slug}`} className="font-medium" style={{ color: navTextColor }}>{p.title}</Link>
              ))}
              <Link to="/login" className="px-4 py-2 font-medium" style={{ color: navTextColor }}>Sign In</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {!page ? (
            <div>
              <h1 className="text-3xl font-bold mb-4">Page not found</h1>
              <p>The requested page could not be found.</p>
            </div>
          ) : (
            <article>
              <h1 className="text-3xl font-bold mb-6">{page.title}</h1>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
            </article>
          )}
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-12 px-4 mt-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="h-8 mb-4" />
            ) : (
              <span className="text-xl font-bold">{appName}</span>
            )}
            <p className="text-gray-400 mt-4">{config?.heroSubtitle || 'Transform your data into insights'}</p>
          </div>
          {config?.footerLinks && config.footerLinks.map((link: any, idx: number) => (
            <div key={idx}>
              <h3 className="font-bold mb-4">{link.title}</h3>
              <ul className="space-y-2 text-gray-400">
                {link.items?.map((item: any, i: number) => (
                  <li key={i}><a href={item.link} className="hover:text-white">{item.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default CustomPage;
