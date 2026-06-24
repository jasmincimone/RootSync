import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: "https://thefixcollective.com", lastModified: now },
    { url: "https://thefixcollective.com/marketplace", lastModified: now },
    { url: "https://thefixcollective.com/community", lastModified: now },
    { url: "https://thefixcollective.com/courses", lastModified: now },
    { url: "https://thefixcollective.com/downloads", lastModified: now },
    { url: "https://thefixcollective.com/messages/inbox", lastModified: now },
    { url: "https://thefixcollective.com/rootsync", lastModified: now },
    { url: "https://thefixcollective.com/rootsyncai", lastModified: now },
    // Legacy shop URLs remain valid via redirect to marketplace vendor profiles.
    { url: "https://thefixcollective.com/shops/urban-roots", lastModified: now },
  ];
}
