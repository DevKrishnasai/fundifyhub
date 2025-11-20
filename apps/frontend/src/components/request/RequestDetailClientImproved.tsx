/**
 * Improved Request Detail Page
 * 
 * Improvements:
 * - Timeline in descending order (latest first) ✓
 * - Role-specific information display
 * - Hide unnecessary customer details
 * - Show EMI preview only to customers when offer is sent
 * - Better UI with proper cards and layout
 * - Show all timeline events including negative actions
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { REQUEST_STATUS, ROLES } from '@fundifyhub/types';
import { useRouter } from 'next/navigation';
import RequestActions from '@/components/request/RequestActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  MapPin, 
  IndianRupee, 
  FileText, 
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Download
} from 'lucide-react';

interface RequestDetail {
  id: string;
  requestNumber?: string | null;
  currentStatus: string;
  requestedAmount: number;
  district: string;
  customerId: string;
  assignedAgentId?: string | null;
  
  // Asset details
  assetType?: string;
  assetBrand?: string;
  assetModel?: string;
  assetCondition?: string;
  purchaseYear?: number;
  AdditionalDescription?: string;
  
  // Offer details
  adminOfferedAmount?: number | null;
  adminTenureMonths?: number | null;
  adminInterestRate?: number | null;
  offerMadeDate?: string | null;
  adminEmiSchedule?: any;
  
  // Related data
  documents?: Array<{
    id: string;
    url?: string | null;
    fileName?: string | null;
    documentType?: string;
    isVerified?: boolean;
  }>;
  requestHistory?: Array<{
    id: string;
    createdAt: string;
    action: string;
    actorId?: string | null;
    metadata?: any;
    actor?: {
      id: string;
      firstName?: string;
      lastName?: string;
      roles?: string[];
    };
  }>;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    author?: {
      id: string;
      firstName?: string;
      lastName?: string;
      roles?: string[];
    };
  }>;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  };
  assignedAgent?: {
    id: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
}

export default function RequestDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const auth = useAuth();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const isCustomer = auth.isCustomer();
  const isAdmin = auth.hasRole([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]);
  const isAgent = auth.isAgent();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${id}`, { 
          credentials: 'include' 
        });
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        if (res.ok) {
          if (mounted) setRequest(data.data.request as RequestDetail);
        } else {
          alert(data.message || 'Failed to load request');
        }
      } catch (err) {
        console.error(err);
        alert('Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    return () => { 
      mounted = false; 
    };
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="mt-4 text-lg font-semibold">Request not found</p>
        </div>
      </div>
    );
  }

  // Build timeline events
  const timelineEvents = buildTimeline(request);

  // Check if offer is available to show
  const hasOffer = request.adminOfferedAmount && request.adminTenureMonths && request.adminInterestRate;
  const showOfferToCustomer = isCustomer && hasOffer && [
    REQUEST_STATUS.OFFER_SENT,
    REQUEST_STATUS.OFFER_ACCEPTED,
    REQUEST_STATUS.OFFER_DECLINED
  ].includes(request.currentStatus as REQUEST_STATUS);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Request #{request.requestNumber || request.id.slice(0, 8)}</h1>
          <p className="text-muted-foreground mt-1">Track your loan request status and updates</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={request.currentStatus} />
        </div>
      </div>

      {/* Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <RequestActions 
            requestId={id} 
            requestStatus={request.currentStatus} 
            district={request.district}
            onUpdated={(r) => setRequest(r as RequestDetail)} 
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Asset Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Asset Details
              </CardTitle>
              <CardDescription>Information about the pledged asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Asset Type" value={request.assetType || '—'} />
                <InfoItem label="Condition" value={request.assetCondition || '—'} />
                <InfoItem label="Brand" value={request.assetBrand || '—'} />
                <InfoItem label="Model" value={request.assetModel || '—'} />
                {request.purchaseYear && (
                  <InfoItem label="Purchase Year" value={request.purchaseYear.toString()} />
                )}
                <InfoItem 
                  label="Requested Amount" 
                  value={`₹${request.requestedAmount.toLocaleString()}`}
                  icon={<IndianRupee className="h-4 w-4" />}
                />
              </div>
              {request.AdditionalDescription && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Description</p>
                  <p className="text-sm text-muted-foreground">{request.AdditionalDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offer Details - Show to Customer Only */}
          {showOfferToCustomer && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Loan Offer Details
                </CardTitle>
                <CardDescription>Review the offer made by our team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Offered Amount</p>
                    <p className="text-2xl font-bold text-primary">
                      ₹{request.adminOfferedAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Tenure</p>
                    <p className="text-2xl font-bold">{request.adminTenureMonths} months</p>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Interest Rate</p>
                    <p className="text-2xl font-bold">{request.adminInterestRate}%</p>
                  </div>
                </div>

                {/* EMI Schedule Preview */}
                {request.adminEmiSchedule && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-4">EMI Schedule Preview</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="text-left p-3 font-medium">Installment</th>
                              <th className="text-left p-3 font-medium">Due Date</th>
                              <th className="text-right p-3 font-medium">EMI Amount</th>
                              <th className="text-right p-3 font-medium">Principal</th>
                              <th className="text-right p-3 font-medium">Interest</th>
                            </tr>
                          </thead>
                          <tbody>
                            {request.adminEmiSchedule.emiSchedule?.map((emi: any, idx: number) => (
                              <tr key={idx} className="border-t hover:bg-muted/50">
                                <td className="p-3">{emi.installment}</td>
                                <td className="p-3">
                                  {new Date(emi.paymentDate).toLocaleDateString('en-IN')}
                                </td>
                                <td className="p-3 text-right font-medium">
                                  ₹{Number(emi.paymentAmount).toLocaleString()}
                                </td>
                                <td className="p-3 text-right">
                                  ₹{Number(emi.principal).toLocaleString()}
                                </td>
                                <td className="p-3 text-right">
                                  ₹{Number(emi.interest).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted font-semibold border-t-2">
                            <tr>
                              <td colSpan={2} className="p-3">Total</td>
                              <td className="p-3 text-right">
                                ₹{request.adminEmiSchedule.totalPayment?.toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                ₹{request.adminOfferedAmount?.toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                ₹{request.adminEmiSchedule.totalInterest?.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Uploaded documents for this request</CardDescription>
            </CardHeader>
            <CardContent>
              {request.documents && request.documents.length > 0 ? (
                <div className="space-y-2">
                  {request.documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName || 'Document'}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType || 'General'}
                            {doc.isVerified && (
                              <span className="ml-2 text-green-600">✓ Verified</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {doc.url && (
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Download className="h-4 w-4" />
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Request Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem 
                label="District" 
                value={request.district}
                icon={<MapPin className="h-4 w-4" />}
              />
              {request.offerMadeDate && (
                <InfoItem 
                  label="Offer Date" 
                  value={new Date(request.offerMadeDate).toLocaleDateString('en-IN')}
                  icon={<Calendar className="h-4 w-4" />}
                />
              )}
              
              {/* Show customer info to admins/agents only */}
              {(isAdmin || isAgent) && request.customer && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Details
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      {request.customer.firstName} {request.customer.lastName}
                    </p>
                    {request.customer.email && (
                      <p className="text-muted-foreground">{request.customer.email}</p>
                    )}
                    {request.customer.phoneNumber && (
                      <p className="text-muted-foreground">{request.customer.phoneNumber}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Show agent info if assigned */}
              {request.assignedAgent && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned Agent
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      {request.assignedAgent.firstName} {request.assignedAgent.lastName}
                    </p>
                    {request.assignedAgent.phoneNumber && (
                      <p className="text-muted-foreground">{request.assignedAgent.phoneNumber}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>Latest updates and actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {timelineEvents.length > 0 ? (
                  timelineEvents.map((event, index) => (
                    <TimelineEvent 
                      key={event.id} 
                      event={event} 
                      isLast={index === timelineEvents.length - 1}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No activity yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatusBadge({ status }: { status: string }) {
  const getVariant = () => {
    if (['PENDING', 'UNDER_REVIEW'].includes(status)) return 'secondary';
    if (['OFFER_SENT', 'OFFER_ACCEPTED'].includes(status)) return 'default';
    if (['APPROVED', 'AMOUNT_DISBURSED', 'ACTIVE', 'COMPLETED'].includes(status)) return 'default';
    if (['REJECTED', 'CANCELLED', 'OFFER_DECLINED'].includes(status)) return 'destructive';
    return 'outline';
  };

  const getIcon = () => {
    if (['APPROVED', 'COMPLETED', 'AMOUNT_DISBURSED'].includes(status)) return <CheckCircle className="h-4 w-4" />;
    if (['REJECTED', 'CANCELLED', 'OFFER_DECLINED'].includes(status)) return <XCircle className="h-4 w-4" />;
    if (['PENDING', 'UNDER_REVIEW'].includes(status)) return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Badge variant={getVariant() as any} className="px-4 py-2 text-sm flex items-center gap-2">
      {getIcon()}
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function TimelineEvent({ event, isLast }: { event: any; isLast: boolean }) {
  const getIcon = () => {
    const action = event.action?.toUpperCase() || '';
    if (action.includes('REJECT') || action.includes('CANCEL') || action.includes('DECLINE')) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (action.includes('APPROVE') || action.includes('ACCEPT') || action.includes('COMPLETE')) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (action.includes('COMMENT')) {
      return <MessageCircle className="h-5 w-5 text-blue-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="relative pl-8 pb-4">
      {!isLast && (
        <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-border"></div>
      )}
      <div className="absolute left-0 top-0 bg-background p-0.5">
        {getIcon()}
      </div>
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm">{event.title}</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(event.date)}
          </p>
        </div>
        {event.actor && (
          <p className="text-xs text-muted-foreground">
            by {event.actor.firstName} {event.actor.lastName}
            {event.roleLabel && ` (${event.roleLabel})`}
          </p>
        )}
        {event.description && (
          <div className="text-xs text-muted-foreground mt-2">
            {typeof event.description === 'string' ? (
              <p>{event.description}</p>
            ) : Array.isArray(event.description) ? (
              <ul className="list-disc list-inside space-y-1">
                {event.description.map((item: any, idx: number) => (
                  <li key={idx}>
                    <strong>{item.key}:</strong> {item.value}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Functions

function buildTimeline(request: RequestDetail) {
  const events: any[] = [];

  // Add history events
  (request.requestHistory || []).forEach((h) => {
    const actor = h.actor || null;
    let roleLabel = '';
    if (actor && Array.isArray(actor.roles)) {
      if (actor.roles.includes(ROLES.SUPER_ADMIN) || actor.roles.includes(ROLES.DISTRICT_ADMIN)) {
        roleLabel = 'Admin';
      } else if (actor.roles.includes(ROLES.AGENT)) {
        roleLabel = 'Agent';
      } else if (actor.roles.includes(ROLES.CUSTOMER)) {
        roleLabel = 'Customer';
      }
    }

    // eslint-disable-next-line
    const { getActionLabel, formatMetadata } = require('@/lib/actionLabels');
    const title = getActionLabel(String(h.action || ''));
    const metadata = formatMetadata(h.metadata);

    events.push({
      id: `h-${h.id}`,
      date: h.createdAt,
      type: 'history',
      title,
      action: h.action,
      actor,
      roleLabel,
      description: metadata,
      raw: h,
    });
  });

  // Add comments
  (request.comments || []).forEach((c) => {
    const actor = c.author || null;
    let roleLabel = '';
    if (actor && Array.isArray(actor.roles)) {
      if (actor.roles.includes(ROLES.SUPER_ADMIN) || actor.roles.includes(ROLES.DISTRICT_ADMIN)) {
        roleLabel = 'Admin';
      } else if (actor.roles.includes(ROLES.AGENT)) {
        roleLabel = 'Agent';
      } else if (actor.roles.includes(ROLES.CUSTOMER)) {
        roleLabel = 'Customer';
      }
    }

    events.push({
      id: `c-${c.id}`,
      date: c.createdAt,
      type: 'comment',
      title: 'Comment',
      action: 'COMMENT',
      actor,
      roleLabel,
      description: c.content,
      raw: c,
    });
  });

  // Sort by date descending (latest first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return events;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-IN', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
}
