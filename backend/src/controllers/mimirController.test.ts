import type { Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SprintTask from '../models/SprintTask'
import MimirCache, { MimirOpenAiCache } from '../models/MimirCache'
import { getMimirHint, isMimirOpenAiPilot } from './mimirController'

vi.mock('../models/SprintTask', () => ({ default: { countDocuments: vi.fn() } }))
vi.mock('../models/MimirCache', () => ({
  default: { findOne: vi.fn() },
  MimirOpenAiCache: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
}))

const reply = 'Два борги перед Норнами: почни з найменшого.'
const fetchModel = vi.fn<typeof fetch>()

function request(userId: string) {
  const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
  const done = getMimirHint({ userId, query: { mode: 'witty' } } as unknown as Request, res as unknown as Response)
  return { done, res }
}

describe('Mimir OpenAI pilot', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubEnv('MIMIR_OPENAI_USER_ID', 'pilot-profile')
    vi.stubGlobal('fetch', fetchModel)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-16T21:30:00Z')) // 23:30 in Kyiv (UTC+2)
    vi.mocked(MimirOpenAiCache.findOne).mockReturnValue({ lean: async () => null } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('keeps other profiles on their existing provider path and requires both settings', async () => {
    vi.mocked(MimirCache.findOne).mockResolvedValue({ text: 'Existing response', pose: 'idle' })
    const { done, res } = request('other-profile')
    await done
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ text: 'Existing response' }))
    expect(MimirOpenAiCache.findOne).not.toHaveBeenCalled()
    expect(fetchModel).not.toHaveBeenCalled()
    vi.stubEnv('OPENAI_API_KEY', '')
    expect(isMimirOpenAiPilot('pilot-profile')).toBe(false)
  })

  it('uses the local date, sends only task counts, and coalesces concurrent generations', async () => {
    vi.mocked(SprintTask.countDocuments).mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    fetchModel.mockResolvedValue(Response.json({
      status: 'completed',
      output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: reply }] }],
    }))
    vi.mocked(MimirOpenAiCache.findOneAndUpdate).mockReturnValue({
      lean: async () => ({ text: reply, pose: 'skeptical' }),
    } as never)
    const first = request('pilot-profile')
    const second = request('pilot-profile')
    await Promise.all([first.done, second.done])
    expect(SprintTask.countDocuments).toHaveBeenCalledWith({
      userId: 'pilot-profile', deletedAt: null, done: false, dueDate: '2026-11-16',
    })
    expect(fetchModel).toHaveBeenCalledTimes(1)
    const [url, init] = fetchModel.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    const body = JSON.parse(String(init?.body))
    expect(JSON.parse(body.input)).toEqual({ timeSlot: 'evening', openTasksDueToday: 1, overdueOpenTasks: 2 })
    expect(body.store).toBe(false)
    expect(first.res.json).toHaveBeenCalledWith({ text: reply, pose: 'skeptical', slot: 'evening', cached: false })
    expect(second.res.json).toHaveBeenCalledWith({ text: reply, pose: 'skeptical', slot: 'evening', cached: false })
  })

  it('returns a cache hit without contacting the model', async () => {
    vi.mocked(MimirOpenAiCache.findOne).mockReturnValue({
      lean: async () => ({ text: reply, pose: 'skeptical' }),
    } as never)
    const { done, res } = request('pilot-profile')
    await done
    expect(res.json).toHaveBeenCalledWith({ text: reply, pose: 'skeptical', slot: 'evening', cached: true })
    expect(fetchModel).not.toHaveBeenCalled()
  })

  it('returns a fallback status when OpenAI fails without trying another provider', async () => {
    vi.mocked(SprintTask.countDocuments).mockResolvedValue(0)
    fetchModel.mockResolvedValue(new Response(null, { status: 429 }))
    const { done, res } = request('pilot-profile')
    await done
    expect(res.status).toHaveBeenCalledWith(503)
    expect(MimirCache.findOne).not.toHaveBeenCalled()
    expect(MimirOpenAiCache.findOneAndUpdate).not.toHaveBeenCalled()
  })
})
