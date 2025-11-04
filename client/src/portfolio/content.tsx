import { createContext, useContext, useMemo, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { tr, type L, type Lang, type SiteContent } from "@shared/content";
import { useLang } from "./i18n";

type Ctx = {
  content: SiteContent | null;
  loading: boolean;
  error: boolean;
  preview: boolean;
  refetch: () => void;
};

const ContentCtx = createContext<Ctx>({ content: null, loading: true, error: false, preview: false, refetch: () => {} });

function readEmbedded(): SiteContent | null {
  try {
    const el = document.getElementById("pf-data");
    if (!el?.textContent) return null;
    return JSON.parse(el.textContent) as SiteContent;
  } catch {
    return null;
  }
}

const embedded = typeof document !== "undefined" ? readEmbedded() : null;
const staticSite = import.meta.env.VITE_STATIC === "1" && !!embedded;

export function ContentProvider({ children }: { children: ReactNode }) {
  const preview = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");
  const query = trpc.portfolio.content.useQuery(
    { preview },
    {
      initialData: !preview && embedded ? { content: embedded, publishedAt: new Date(0), preview: false } : undefined,
      initialDataUpdatedAt: staticSite ? Date.now() : 0,
      staleTime: staticSite ? Infinity : 15_000,
      refetchOnWindowFocus: !staticSite,
      refetchInterval: staticSite ? false : preview ? 5_000 : 60_000,
      retry: staticSite ? false : 2,
      enabled: !(staticSite && !preview),
    },
  );
  const value = useMemo<Ctx>(
    () => ({
      content: query.data?.content ?? null,
      loading: query.isLoading,
      error: !!query.error && !query.data,
      preview: !!query.data?.preview,
      refetch: () => void query.refetch(),
    }),
    [query.data, query.isLoading, query.error],
  );
  return <ContentCtx.Provider value={value}>{children}</ContentCtx.Provider>;
}

export function useContent() {
  return useContext(ContentCtx);
}

/** Translation helper bound to the current language. */
export function useT() {
  const lang = useLang();
  const { content } = useContent();
  return useMemo(() => {
    const t = (value: L | undefined | null) => tr(value, lang);
    const ui = (key: string) => tr(content?.settings.ui?.[key], lang) || key;
    return { t, ui, lang: lang as Lang };
  }, [lang, content]);
}
