'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Tag, 
  FileText,
} from 'lucide-react';
import { 
  ASSET_TYPE_OPTIONS, 
  ASSET_CONDITION_OPTIONS,
} from '@fundifyhub/types';
import type { RequestType } from '@fundifyhub/types';
import { 
  SectionCard, 
  SectionRow, 
  SectionGrid, 
  SectionDivider 
} from './SectionCard';

/**
 * AssetSection - Displays asset details for the request
 * Mobile-first responsive design with clear visual hierarchy
 */

interface AssetSectionProps {
  request: RequestType;
  isLoading?: boolean;
  className?: string;
}

export function AssetSection({ request, isLoading, className }: AssetSectionProps) {
  const asset = request.asset;
  
  // Get human-readable labels
  const assetTypeLabel = ASSET_TYPE_OPTIONS.find(o => o.value === asset?.assetType)?.label || asset?.assetType || 'N/A';
  const conditionLabel = ASSET_CONDITION_OPTIONS.find(o => o.value === asset?.condition)?.label || asset?.condition || 'N/A';
  
  // Condition badge color
  const conditionColors: Record<string, string> = {
    EXCELLENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    GOOD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    FAIR: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    POOR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  if (!asset) {
    return (
      <SectionCard
        title="Asset Details"
        icon={Package}
        isLoading={isLoading}
        className={className}
        id="asset-section"
      >
        <p className="text-sm text-muted-foreground">No asset information available.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Asset Details"
      icon={Package}
      isLoading={isLoading}
      className={className}
      id="asset-section"
    >
      {/* Asset Type & Condition Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="outline" className="text-sm font-medium">
          <Tag className="mr-1.5 h-3.5 w-3.5" />
          {assetTypeLabel}
        </Badge>
        <Badge 
          variant="secondary"
          className={conditionColors[asset.condition] || ''}
        >
          {conditionLabel}
        </Badge>
      </div>

      {/* Asset Info Grid */}
      <SectionGrid columns={2}>
        <SectionRow 
          label="Brand" 
          value={asset.brand}
          valueVariant="highlight"
        />
        <SectionRow 
          label="Model" 
          value={asset.model}
          valueVariant="highlight"
        />
        <SectionRow 
          label="Purchase Year" 
          value={asset.purchaseYear?.toString()}
          inline
        />
        <SectionRow 
          label="District" 
          value={(request.district as any)?.name || 'N/A'}
          inline
        />
      </SectionGrid>

      {/* Additional Description */}
      {asset.description && (
        <>
          <SectionDivider />
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Additional Details
            </span>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {asset.description}
            </p>
          </div>
        </>
      )}
    </SectionCard>
  );
}

/**
 * AssetSummaryCard - Compact version for sidebar/overview
 */
interface AssetSummaryCardProps {
  request: RequestType;
  className?: string;
}

export function AssetSummaryCard({ request, className }: AssetSummaryCardProps) {
  const asset = request.asset;
  const assetTypeLabel = ASSET_TYPE_OPTIONS.find(o => o.value === asset?.assetType)?.label || asset?.assetType || 'N/A';

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">
            {asset?.brand || 'N/A'} {asset?.model || ''}
          </h4>
          <p className="text-xs text-muted-foreground">
            {assetTypeLabel} • {asset?.purchaseYear || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AssetSection;
