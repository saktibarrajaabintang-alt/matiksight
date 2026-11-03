"use client";

import { useParams } from "next/navigation";
import { VisualizationPage } from "@/components/visualization-page";

export default function GoogleAdsDatasetPage() {
  const { datasetId } = useParams<{ datasetId: string }>();
  return <VisualizationPage key={datasetId} datasetId={datasetId} />;
}
