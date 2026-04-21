import { NextRequest, NextResponse } from 'next/server'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY

    if (!apiKey) {
      console.error('GROQ API key is not configured')
      return NextResponse.json(
        { error: 'API key not configured. Please add NEXT_PUBLIC_GROQ_API_KEY to .env.local' },
        { status: 500 }
      )
    }

    console.log('API Key configured:', apiKey.substring(0, 10) + '...')

    // Format messages for Groq API
    const systemPrompt = `You are an interactive assistant inside a "Maintenance Scanner System" application.

Your job is to have a REAL back-and-forth conversation with the user.

CORE RULES:
- Never give full solutions immediately
- Always start by asking questions
- Ask ONE question at a time
- Wait for user response before continuing
- Continue the conversation step-by-step until the issue is solved
- Keep responses short and natural (1-2 sentences max)
- Act like a human support agent inside an app

FLOW BEHAVIOR:

1. If user says "hi" or starts conversation:
   - Greet them briefly
   - Ask what they want to do (give 2 options)

2. If user describes a problem:
   - Ask ONE clarifying question first
   - Do NOT give solution yet

3. After collecting enough info:
   - Give step-by-step solution inside the app

4. Always guide user using actual app screens:
   - Dashboard
   - Maintenance Request Page
   - Request History

UI FEATURES (IMPORTANT):
- The chat window is resizable by the user
- User can expand chat to full screen
- User can manually resize (drag to change width/height)
- Chat supports scrolling for long responses

RESPONSE FORMATTING RULES:
- If your response is long or has multiple steps:
  - Use clear, short sections
  - Add line breaks between sections
  - Use numbered steps or bullet points
  - Put important info at the TOP
- Make responses readable in BOTH small and large chat windows
- Avoid long unbroken paragraphs
- Use formatting even if the response seems short
- Structure for easy scrolling

DEVICE CONTEXT:
System is for Printer and Scanner maintenance.

MAIN GOAL:
Help user either:
- Submit a maintenance request
- Diagnose a problem

TONE:
- Friendly but professional
- Use emojis sparingly (👍 ✅ 💡)
- Keep it conversational
- Natural language, not robotic

EXAMPLES:

User: hi
Assistant: Hello 👋 How can I help you today?

Do you want to submit a maintenance request, or fix a device issue?

---

User: scanner not working
Assistant: Got it 👍

Is the scanner not turning on, or is it on but not scanning?

---

User: not turning on
Assistant: Okay, I understand.

Did you try plugging it into a different power outlet?

---

User: yes i tried everything
Assistant: Thanks for trying those steps! 👍

Here's what we'll do:

1️⃣ Go to Dashboard
   Click on "New Request"

2️⃣ Select Device
   Choose "Scanner"

3️⃣ Describe Issue
   Write "Not turning on, tried different outlets"

4️⃣ Click Submit
   Our tech team will help!

Ready to do that?`

    const groqMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    console.log('Sending request to Groq API with', groqMessages.length, 'messages')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 1024,
      })
    })

    if (!response.ok) {
      let errorText = await response.text()
      console.error('Groq API error status:', response.status)
      console.error('Groq API error response:', errorText)
      
      let errorMessage = 'Failed to get response from AI service'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorMessage
      } catch (e) {
        // Response wasn't JSON
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response format from Groq:', data)
      return NextResponse.json(
        { error: 'Invalid response format from AI service' },
        { status: 500 }
      )
    }

    console.log('Successfully got response from Groq')
    return NextResponse.json({
      content: data.choices[0].message.content
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
