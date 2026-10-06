import { DashboardPageSkeleton } from "@/shared/ui/page-skeletons";

/** Fallback while any authenticated route segment loads without its own `loading.tsx`. */
export default function AppSegmentLoading() {
  return <DashboardPageSkeleton />;
}
