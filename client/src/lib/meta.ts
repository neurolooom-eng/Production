import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { ResourceMeta, Row } from './types';

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: () => api.get<{ resources: ResourceMeta[]; role: string }>('/meta'),
    staleTime: Infinity,
  });
}

export function useResourceMeta(key?: string) {
  const { data } = useMeta();
  return data?.resources.find((r) => r.key === key);
}

export function useRows(key: string, enabled = true) {
  return useQuery({
    queryKey: ['rows', key],
    queryFn: () => api.get<Row[]>(`/${key}`),
    enabled,
  });
}

export function useSaveRow(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Row) =>
      row.id ? api.put<Row>(`/${key}/${row.id}`, row) : api.post<Row>(`/${key}`, row),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rows', key] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useDeleteRow(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/${key}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rows', key] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
