/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudflare Turnstile site key (public). Kosong = widget disembunyikan; produksi: pasangkan dengan TURNSTILE_SECRET_KEY di backend. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}
