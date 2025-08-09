// Cloudflare Pages Functions GraphQL endpoint
// Use: POST /graphql with body { query, variables }
// Set secret in Cloudflare: DEEPSEEK_API_KEY

import { buildSchema, graphql } from 'graphql'

const schema = buildSchema(`
  type Message { role: String!, content: String! }
  input MessageInput { role: String!, content: String! }

  type ChatPayload { content: String! }

  type Query { _health: String! }
  type Mutation {
    chat(messages: [MessageInput!]!, model: String): ChatPayload!
  }
`)

const root = {
  _health: () => 'ok',
  chat: async ({ messages, model }, context) => {
    const apiKey = context.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('Missing DEEPSEEK_API_KEY')
    }
    const body = JSON.stringify({
      model: model || 'deepseek-chat',
      messages,
      stream: false,
    })

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Upstream HTTP ${resp.status}: ${errText}`)
    }
    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content || ''
    return { content }
  },
}

export const onRequestPost = async ({ request, env }) => {
  try {
    const { query, variables } = await request.json()
    const result = await graphql({
      schema,
      source: query,
      rootValue: root,
      contextValue: { env },
      variableValues: variables,
    })
    return new Response(JSON.stringify(result), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ errors: [{ message: err.message }] }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'POST') {
      return onRequestPost({ request, env })
    }
    return new Response('GraphQL endpoint. Use POST with { query, variables }', { status: 200 })
  },
}


