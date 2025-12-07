'use client';

import React from 'react';
import { RequestProvider } from './context/RequestContext';
import { RequestActionProvider } from './context/RequestActionContext';
import { ActionModalManager } from './modals/ActionModalManager';
import { RequestDetailPage } from './RequestDetailPage';

interface RequestDetailPageContainerProps {
  id: string;
}

/**
 * Container component that handles data fetching and actions
 * Passes data down to the pure presentation RequestDetailPage
 */
export function RequestDetailPageContainer({ id }: RequestDetailPageContainerProps) {
  return (
    <RequestProvider requestId={id}>
      <RequestActionProvider>
        <RequestDetailPage />
        <ActionModalManager />
      </RequestActionProvider>
    </RequestProvider>
  );
}

export default RequestDetailPageContainer;
