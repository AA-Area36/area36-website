import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useGdriveFiles } from "./use-gdrive-files"
afterEach(() => vi.unstubAllGlobals())
it("shares concurrent public catalog requests", async () => {
  let resolve!: (value: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(done => { resolve = done }))
  vi.stubGlobal("fetch", fetch)
  const first = renderHook(() => useGdriveFiles("background-materials"))
  const second = renderHook(() => useGdriveFiles("background-materials"))
  expect(fetch).toHaveBeenCalledTimes(1)
  await act(async () => { resolve(Response.json({ fixture: true })) })
  await waitFor(() => expect(first.result.current.data).toEqual({ fixture: true }))
  expect(second.result.current.data).toEqual({ fixture: true })
})
it("fetches fresh recordings after unlock and discards a late locked response", async () => {
  const pending: ((value: Response) => void)[] = []
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(done => pending.push(done))))
  const hook = renderHook(() => useGdriveFiles("recordings"))
  let retry!: Promise<void>
  act(() => { retry = hook.result.current.refetch() })
  expect(pending).toHaveLength(2)
  await act(async () => { pending[1](Response.json({ unlocked: true })); await retry })
  await act(async () => { pending[0](Response.json({ unlocked: false })) })
  expect(hook.result.current.data).toEqual({ unlocked: true })
})
