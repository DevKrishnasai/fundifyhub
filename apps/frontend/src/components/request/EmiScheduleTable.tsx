"use client";

import React from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

type RawRow = Record<string, any>;
type Mode = 'preview' | 'loan' | 'compact';

function normalize(rows: RawRow[], mode: Mode) {
  return rows.map((r) => {
    if (mode === 'loan') {
      return {
        emiNumber: r.emiNumber ?? r.installment ?? r.id,
        principal: r.principalAmount ?? r.principal ?? r.principalAmount ?? 0,
        interest: r.interestAmount ?? r.interest ?? 0,
        amount: r.emiAmount ?? r.paymentAmount ?? r.emiAmount ?? 0,
        dueDate: r.dueDate ?? r.paymentDate ?? null,
        status: r.status ?? null,
        remainingBalance: r.remainingBalance ?? null,
        id: r.id ?? r.installment ?? `${r.emiNumber ?? r.installment}`,
      };
    }

    // preview or compact
    return {
      emiNumber: r.installment ?? r.emiNumber ?? r.id,
      principal: r.principal ?? r.principalAmount ?? 0,
      interest: r.interest ?? r.interestAmount ?? 0,
      amount: r.paymentAmount ?? r.emiAmount ?? 0,
      dueDate: r.paymentDate ?? r.dueDate ?? null,
      remainingBalance: r.remainingBalance ?? null,
      id: r.installment ?? r.emiNumber ?? r.id,
    };
  });
}

export default function EmiScheduleTable({ rows = [], mode = 'preview' }: { rows?: RawRow[]; mode?: Mode }) {
  const normalized = normalize(rows, mode);

  if (!normalized || normalized.length === 0) return <div className="text-sm text-muted-foreground">No EMI schedule available.</div>;

  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <tr className="border-b">
          <TableHead className="p-2">EMI No.</TableHead>
          {mode === 'loan' && <TableHead className="p-2 text-left">Due</TableHead>}
          <TableHead className="p-2 text-right">Principal</TableHead>
          <TableHead className="p-2 text-right">Interest</TableHead>
          <TableHead className="p-2 text-right">Amount</TableHead>
          {mode === 'loan' && <TableHead className="p-2 text-right">Status</TableHead>}
          {/* For preview, keep compact: EMI No., Principal, Interest, Amount (no balance) */}
        </tr>
      </TableHeader>
      <TableBody>
        {normalized.map((e) => (
          <TableRow key={e.id} className={`border-b hover:bg-muted/50 ${e.status === 'PAID' ? 'bg-green-50 dark:bg-green-950/20' : e.status === 'OVERDUE' ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
            <TableCell className="p-2 font-medium">#{e.emiNumber}</TableCell>
            {mode === 'loan' && (
              <TableCell className="p-2 text-left text-muted-foreground">{e.dueDate ? new Date(e.dueDate).toLocaleDateString() : '-'}</TableCell>
            )}
            <TableCell className="p-2 text-right text-muted-foreground">₹{Number(e.principal ?? 0).toLocaleString()}</TableCell>
            <TableCell className="p-2 text-right text-muted-foreground">₹{Number(e.interest ?? 0).toLocaleString()}</TableCell>
            <TableCell className="p-2 text-right font-semibold">₹{Number(e.amount ?? 0).toLocaleString()}</TableCell>
            {mode === 'loan' && (
              <TableCell className="p-2 text-right text-muted-foreground">{e.status ?? '-'}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
