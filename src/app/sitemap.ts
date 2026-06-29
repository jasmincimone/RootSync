import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: "https://thefixcollective.com", lastModified: now },
    { url: "https://thefixcollective.com/rootsync", lastModified: now },
    { url: "https://thefixcollective.com/discover", lastModified: now },
    { url: "https://thefixcollective.com/community", lastModified: now },
    { url: "https://thefixcollective.com/messages/inbox", lastModified: now },
    { url: "https://thefixcollective.com/rootsyncai", lastModified: now },
  ];
}
