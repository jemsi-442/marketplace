'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';
import { extractRequestId } from '@/lib/ui/extract-request-id';
import { useToastStore } from '@/lib/ui/toast-store';

import {
  type NotificationCategory,
  NOTIFICATIONS_STALE_MS,
  PAGE_SIZE,
} from './notifications.utils';

export function useNotifications() {
  const token = useAuthStore((state) => state.token);
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.push);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] =
    useState<NotificationCategory>('all');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingNotificationId, setPendingNotificationId] = useState<
    number | null
  >(null);
  const isAdmin =
    roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SUPER_ADMIN');
  const feedbackRequestId = extractRequestId(feedback);

  const notifications = useQuery({
    queryKey: [
      'notifications-page',
      token,
      filter,
      categoryFilter,
      notificationSearch,
      page,
    ],
    queryFn: () =>
      apiClient.getNotifications(token ?? '', {
        page,
        limit: PAGE_SIZE,
        search: notificationSearch.trim(),
        view: filter,
        category: categoryFilter,
      }),
    enabled: Boolean(token),
    staleTime: NOTIFICATIONS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const opsOverview = useQuery({
    queryKey: ['admin-ops-overview', token],
    queryFn: () => apiClient.getAdminOpsOverview(token ?? ''),
    enabled: Boolean(token) && isAdmin,
    staleTime: NOTIFICATIONS_STALE_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const markRead = useMutation({
    mutationFn: async (notificationId: number) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }

      setPendingNotificationId(notificationId);
      return apiClient.markNotificationRead(token, notificationId);
    },
    onSuccess: async () => {
      setFeedback('Alert marked as read.');
      pushToast({
        title: 'Alert updated',
        message: 'The alert was marked as read.',
        tone: 'success',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications-page'] }),
        queryClient.invalidateQueries({ queryKey: ['notification-summary'] }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard-shell-summary'],
        }),
      ]);
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to mark alert as read';
      setFeedback(message);
      pushToast({ title: 'Alert update failed', message, tone: 'danger' });
    },
    onSettled: () => {
      setPendingNotificationId(null);
    },
  });

  const paginatedNotifications = notifications.data?.items ?? [];
  const unreadCount = notifications.data?.summary.unread ?? 0;
  const totalPages = notifications.data?.total_pages ?? 1;
  const currentPage = Math.min(page, totalPages);

  return {
    filter,
    categoryFilter,
    notificationSearch,
    feedback,
    feedbackRequestId,
    pendingNotificationId,
    isAdmin,
    paginatedNotifications,
    unreadCount,
    totalPages,
    currentPage,
    queries: {
      notifications,
      opsOverview,
    },
    status: {
      isMarkingRead: markRead.isPending,
    },
    actions: {
      dismissFeedback: () => setFeedback(null),
      applyReadFilter: (nextFilter: 'all' | 'unread') => {
        setFilter(nextFilter);
        setPage(1);
      },
      applyCategoryFilter: (nextFilter: NotificationCategory) => {
        setCategoryFilter(nextFilter);
        setPage(1);
      },
      setNotificationSearch: (value: string) => {
        setNotificationSearch(value);
        setPage(1);
      },
      markRead: (notificationId: number) => markRead.mutate(notificationId),
      goToPreviousPage: () => setPage((value) => Math.max(1, value - 1)),
      goToNextPage: () =>
        setPage((value) => Math.min(totalPages, value + 1)),
    },
  };
}

export type NotificationsModel = ReturnType<typeof useNotifications>;
