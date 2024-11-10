import { on } from 'events'

import merge from 'fast-merge-async-iterators'
import { aiter } from 'iterator-helper'

import { context } from '../game/game.js'

export function combine(...iterables) {
  // @ts-ignore weird
  return merge('iters-close-wait', ...iterables)
}

export async function* named_on(events, event, options) {
  for await (const payload of on(events, event, options)) {
    yield { event, payload }
  }
}

/**
 * @template {import("@aresrpg/aresrpg-protocol/types").EventMap} T
 * @template {import("@aresrpg/aresrpg-protocol/types").EventName<T>} K
 * @param {import("@aresrpg/aresrpg-protocol/types").TypedEmitter<T>} emitter
 * @param {K} event
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {AsyncIterableIterator<T[K]>}
 */
export async function* typed_on(emitter, event, options) {
  // @ts-expect-error TypedEmitter is compatible with EventEmitter
  for await (const [value] of on(emitter, event, options)) {
    yield value
  }
}

/**
 * @template T
 * @param {AsyncIterableIterator<T> | AsyncIterable<T>} iterator
 * @returns {AsyncIterator<T>}
 */
export async function* abortable(iterator) {
  try {
    yield* iterator
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) throw error
  }
}

export function state_iterator() {
  return aiter(typed_on(context.events, 'STATE_UPDATED')).map(state => state)
}
