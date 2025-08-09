export const onRequestPost = async (nextMessages, systemMessage) => {
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          systemMessage,
          ...nextMessages.map(m => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });
    return res;
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
  },
}


