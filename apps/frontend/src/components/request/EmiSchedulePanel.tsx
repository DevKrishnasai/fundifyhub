"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import EmiScheduleTable from '@/components/request/EmiScheduleTable';

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
            <div className="overflow-x-auto">
              <EmiScheduleTable rows={loan.emisSchedule} mode="loan" />
            </div>
          ) : hasSnapshot ? (
            <div className="overflow-x-auto">
              <EmiScheduleTable rows={snapshot.emiSchedule} mode="preview" />
            </div>
          ) : (
          ) : (
            <div className="text-sm text-muted-foreground">No EMI schedule available.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
