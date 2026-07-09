import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: "https://rootsync.io", lastModified: now },
    { url: "https://rootsync.io/rootsync", lastModified: now },
    { url: "https://rootsync.io/discover", lastModified: now },
    { url: "https://rootsync.io/pulse", lastModified: now },
    { url: "https://rootsync.io/rootsync/dashboard", lastModified: now },
    { url: "https://rootsync.io/messages/inbox", lastModified: now },
    { url: "https://rootsync.io/rootsyncai", lastModified: now },
  ];
}
