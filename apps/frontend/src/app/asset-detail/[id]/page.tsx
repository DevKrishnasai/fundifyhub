"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getWithResult, postWithResult } from "@/lib/api-client";
import { BACKEND_API_CONFIG } from "@/lib/urls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AssetDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [openEmi, setOpenEmi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const url = `${BACKEND_API_CONFIG.ENDPOINTS.USER.GET_REQUEST_BY_IDENTIFIER(id)}`;
        const resp = await getWithResult<any>(url);
        if (!resp.ok) {
          setError(resp.error?.message || 'Failed to load request');
          setRequest(null);
        } else {
          setRequest(resp.data);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load request');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!request) return <div className="p-6">Request not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{`${request.assetBrand || ''} ${request.assetModel || ''}`}</div>
                <div className="text-xs text-muted-foreground">Ref: {request.requestNumber ?? request.id}</div>
              </div>
              <div className="text-sm text-muted-foreground">{request.currentStatus}</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {request.documents?.map((doc: any) => (
                  <div key={doc.id} className="rounded overflow-hidden">
                    <Image
                      src={doc.signedUrl || `/api/v1/documents/signed-url-by-filekey/${doc.fileKey}?expiresIn=900`}
                      alt={doc.fileName}
                      width={300}
                      height={200}
                      className="object-cover w-full h-48"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Offer / Admin message */}
            {request.adminOfferedAmount ? (
              <div className="mb-4 p-4 border rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Admin Offer</div>
                    <div className="text-sm">Offered Amount: ₹{request.adminOfferedAmount?.toLocaleString()}</div>
                    <div className="text-sm">Tenure: {request.adminTenureMonths} months • Interest: {request.adminInterestRate}%</div>
                    {request.offerMadeDate && <div className="text-xs text-muted-foreground">Offer made on {new Date(request.offerMadeDate).toLocaleDateString()}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button disabled title="Accept offer (not implemented yet)">Accept ₹{request.adminOfferedAmount}</Button>
                    <Button variant="outline" disabled title="Reject offer (not implemented yet)">Reject</Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Requested Amount</p>
                <p className="font-semibold text-sm sm:text-base">₹{(request.requestedAmount || 0).toLocaleString()}</p>
              </div>
              {request.loan?.approvedAmount && (
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Approved Amount</p>
                  <p className="font-semibold text-sm sm:text-base">₹{request.loan.approvedAmount.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
                <p className="font-semibold text-sm sm:text-base">{new Date(request.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {request.loan ? (
              <div className="mb-4 flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Loan</p>
                  <p className="font-semibold">Loan Ref: {request.loan.loanNumber ?? request.loan.id}</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setOpenEmi(true)}>View EMI Schedule</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>EMI Schedule</DialogTitle>
                    </DialogHeader>
                    <div className="mt-3">
                      {request.loan.emisSchedule && request.loan.emisSchedule.length > 0 ? (
                        <div className="space-y-2">
                          {request.loan.emisSchedule.map((e: any) => (
                            <div key={e.id} className="p-2 border rounded flex justify-between">
                              <div>
                                <div className="text-sm font-medium">EMI #{e.emiNumber}</div>
                                <div className="text-xs text-muted-foreground">Due: {new Date(e.dueDate).toLocaleDateString()}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₹{e.emiAmount.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Status: {e.status}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No EMI schedule available.</div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}

            {/* Comments */}
            <div className="mb-4">
              <h3 className="font-semibold">Comments</h3>
              <div className="mt-3">
                <Textarea value={commentContent} onChange={(e) => setCommentContent((e.target as HTMLTextAreaElement).value)} placeholder="Write a comment..." />
                <div className="flex gap-2 mt-2">
                  <Button onClick={async () => {
                    if (!commentContent || commentContent.trim() === '') return;
                    setSubmittingComment(true);
                    try {
                      const url = BACKEND_API_CONFIG.ENDPOINTS.USER.POST_COMMENT(id);
                      const resp = await postWithResult<any>(url, { content: commentContent });
                      if (resp.ok) {
                        // prepend comment
                        setRequest((prev: any) => ({ ...prev, comments: [resp.data, ...(prev?.comments || [])] }));
                        setCommentContent('');
                      } else {
                        alert(resp.error?.message || 'Failed to post comment');
                      }
                    } catch (e: any) {
                      alert(e?.message || 'Failed to post comment');
                    } finally {
                      setSubmittingComment(false);
                    }
                  }} disabled={submittingComment}>{submittingComment ? 'Posting...' : 'Post Comment'}</Button>
                </div>

                {request.comments && request.comments.length > 0 ? (
                  <div className="space-y-3 mt-3">
                    {request.comments.map((c: any) => (
                      <div key={c.id} className="p-3 border rounded">
                        <div className="text-xs text-muted-foreground">{c.author?.firstName} {c.author?.lastName} • {new Date(c.createdAt).toLocaleString()}</div>
                        <div className="mt-1">{c.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">No comments yet.</div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Timeline</h3>
              <div className="border-l-2 border-muted-foreground pl-4">
                {(() => {
                  const events: { key: string; title: string; date?: string | null; description?: string }[] = [];
                  // Submitted
                  events.push({ key: 'submitted', title: 'Submitted', date: request.createdAt, description: undefined });
                  // Under review (heuristic: assignedAgent or status change)
                  if (request.assignedAgent) {
                    events.push({ key: 'under-review', title: 'Under review', date: request.updatedAt || request.createdAt, description: `Assigned to ${request.assignedAgent.firstName || ''} ${request.assignedAgent.lastName || ''}` });
                  }
                  // Offer made
                  if (request.offerMadeDate) events.push({ key: 'offer-made', title: 'Offer made', date: request.offerMadeDate, description: `Offered ₹${request.adminOfferedAmount}` });
                  // Approved
                  if (request.loan?.approvedDate) events.push({ key: 'approved', title: 'Approved', date: request.loan.approvedDate, description: `Approved ₹${request.loan.approvedAmount}` });
                  // Disbursed
                  if (request.loan?.disbursedDate) events.push({ key: 'disbursed', title: 'Disbursed', date: request.loan.disbursedDate, description: `Disbursed on ${new Date(request.loan.disbursedDate).toLocaleDateString()}` });
                  // Comments as events
                  (request.comments || []).forEach((c: any) => {
                    events.push({ key: `comment-${c.id}`, title: 'Comment', date: c.createdAt, description: c.content });
                  });

                  // Sort by date asc
                  const sorted = events.filter(e => e.date).sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());

                  return sorted.map((e) => (
                    <div key={e.key} className="relative mb-6 pl-4">
                      <div className="absolute -left-3 top-1 w-2 h-2 rounded-full bg-primary" />
                      <div className="text-sm font-medium">{e.title} <span className="text-muted-foreground text-xs">{e.date ? new Date(e.date).toLocaleString() : ''}</span></div>
                      {e.description && <div className="text-sm mt-1">{e.description}</div>}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild>
                <a href="/dashboard">Back</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
