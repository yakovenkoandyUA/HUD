import type { Request, Response } from 'express'
import { afterEach, expect, it, vi } from 'vitest'
import MimirConversation from '../models/MimirConversation'
import { getChatHistory, streamChat } from './ai'

vi.mock('../models/MimirConversation', () => ({
  MIMIR_CHAT_TURN_LIMIT: 10,
  default: { findOne: vi.fn(), updateOne: vi.fn() },
}))
vi.mock('../models/SprintTask', () => ({ default: { find: vi.fn(() => query([])) } }))
vi.mock('../models/TodoItem', () => ({ default: { find: vi.fn(() => query([])) } }))
vi.mock('../models/User', () => ({ User: { findById: vi.fn(() => query({ name: 'Мандрівник' })) } }))

function query(result: unknown) {
  return { select: () => query(result), sort: () => query(result), limit: () => query(result), lean: async () => result }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function response() {
  return { set: vi.fn(), json: vi.fn(), setHeader: vi.fn(), flushHeaders: vi.fn(), write: vi.fn(), end: vi.fn() }
}

function rethrow(error?: unknown): never {
  throw error
}

it('hands the mascot topic to the chat, restores the pilot turn, and reuses it for a follow-up', async () => {
  vi.stubEnv('BILLING_ENABLED', 'false')
  vi.stubEnv('MIMIR_OPENAI_USER_ID', 'pilot')
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
  const answer = 'Почни з найдавнішої задачі.'
  const saved = { _id: 'turn-1', question: 'З якої почати?', answer, domains: ['sprint'] }
  vi.mocked(MimirConversation.findOne)
    .mockReturnValueOnce(query(null) as never)
    .mockReturnValue(query({ turns: [saved] }) as never)
  const model = vi.fn<typeof fetch>(async () => new Response(new ReadableStream({
    start(controller) {
      const encode = new TextEncoder()
      const event = `data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: answer } })}\n\n`
      controller.enqueue(encode.encode(event.slice(0, 30)))
      controller.enqueue(encode.encode(event.slice(30) + 'data: {"type":"message_stop"}\n\n'))
      controller.close()
    },
  })))
  vi.stubGlobal('fetch', model)
  const send = async (message: string, discussOverdue = false) => {
    const res = response()
    await streamChat({ userId: 'pilot', body: { message, discussOverdue } } as Request, res as unknown as Response, rethrow)
    expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n')
  }
  await send(saved.question, true)
  expect(MimirConversation.updateOne).toHaveBeenCalledWith({ userId: 'pilot' }, {
    $push: { turns: { $each: [{ question: saved.question, answer, domains: ['sprint'] }], $slice: -10 } },
  }, { upsert: true })
  const firstPrompt = JSON.parse(String(model.mock.calls[0][1]?.body))
  expect(firstPrompt.system).toContain('Прострочені')
  expect(firstPrompt.system).toContain('Розмову відкрили з репліки маскота')

  const other = response()
  await getChatHistory({ userId: 'other' } as Request, other as unknown as Response, rethrow)
  expect(other.json).toHaveBeenCalledWith({ enabled: false, turns: [] })
  const restored = response()
  await getChatHistory({ userId: 'pilot' } as Request, restored as unknown as Response, rethrow)
  expect(restored.json).toHaveBeenCalledWith({ enabled: true, turns: [saved] })

  await send('А чому саме з неї?')
  const prompt = JSON.parse(String(model.mock.calls[1][1]?.body))
  expect(prompt.system).toContain('Прострочені')
  expect(prompt.messages).toEqual([
    { role: 'user', content: saved.question },
    { role: 'assistant', content: answer },
    { role: 'user', content: 'А чому саме з неї?' },
  ])
})
