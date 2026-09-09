import { $fetch } from '#imports'

export interface StorageObject {
  key: string
  size?: number
  lastModified?: string
  eTag?: string
}

export interface StorageListResult {
  isTruncated: boolean
  contents: StorageObject[]
}

export function useFileStorage() {
  const { public: { apiUrl: baseURL } } = useRuntimeConfig()

  const list = (params: { prefix?: string, maxKeys?: number } = {}) =>
    $fetch<StorageListResult>('/storage/list', {
      baseURL,
      credentials: 'include',
      query: params
    })

  const stat = (key: string) =>
    $fetch<{ key: string, exists: boolean, size?: number, etag?: string, type?: string, lastModified?: string }>(
      `/storage/stat/${key}`,
      { baseURL, credentials: 'include' }
    )

  const presign = (params: {
    key: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'
    expiresIn?: number
    type?: string
    contentDisposition?: string
  }) =>
    $fetch<{ key: string, url: string }>('/storage/presign', {
      baseURL,
      method: 'POST',
      credentials: 'include',
      body: params
    })

  const upload = (file: File, key?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (key) form.append('key', key)
    return $fetch<{ key: string, size: number }>('/storage/upload', {
      baseURL,
      method: 'POST',
      credentials: 'include',
      body: form
    })
  }

  const remove = (key: string) =>
    $fetch<{ key: string, deleted: true }>(`/storage/objects/${key}`, {
      baseURL,
      method: 'DELETE',
      credentials: 'include'
    })

  const downloadUrl = (key: string) => `${baseURL}/storage/objects/${key}`

  return { list, stat, presign, upload, remove, downloadUrl }
}
