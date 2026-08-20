export default function GrowthCampaignBuilderLoading() {
  return (
    <div className="animate-pulse space-y-4 py-2">
      <div className="h-6 w-56 rounded-lg bg-fix-bg-muted" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="h-8 w-24 rounded-full bg-fix-bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-fix-bg-muted" />
    </div>
  );
}
