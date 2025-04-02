import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { message, language } = await req.json()

    const response = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
        systemPrompt: `You are a helpful healthcare assistant. Respond in ${language}.`,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to get response")
    }

    // Handle streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    let fullResponse = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // Convert the chunk to text
      const chunk = new TextDecoder().decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.response) {
              fullResponse += data.response
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e)
          }
        }
      }
    }

    return NextResponse.json({ response: fullResponse })
  } catch (error) {
    console.error("Error in chat route:", error)
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    )
  }
}

