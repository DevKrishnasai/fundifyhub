"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  request: any;
  triggerLabel?: string;
};

export default function EmiSchedulePanel({ request, triggerLabel = 'View EMI Schedule' }: Props) {
  const loan = request?.loan;
  const snapshot = request?.adminEmiSchedule;

  const hasLoanSchedule = loan && Array.isArray(loan.emisSchedule) && loan.emisSchedule.length > 0;
  const hasSnapshot = snapshot && Array.isArray(snapshot.emiSchedule) && snapshot.emiSchedule.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>EMI Schedule</DialogTitle>
        </DialogHeader>

        <div className="mt-3">
          {hasLoanSchedule ? (
            <div className="space-y-2">
              {loan.emisSchedule.map((e: any) => (
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
          ) : hasSnapshot ? (
            <div className="space-y-2">
              {snapshot.emiSchedule.map((e: any, idx: number) => (
                <div key={idx} className="p-2 border rounded flex justify-between">
                  <div>
                    <div className="text-sm font-medium">EMI #{e.installment}</div>
                    <div className="text-xs text-muted-foreground">Principal: ₹{Number(e.principal).toLocaleString()} • Interest: ₹{Number(e.interest).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{Number(e.paymentAmount).toLocaleString()}</div>
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
  );
}
