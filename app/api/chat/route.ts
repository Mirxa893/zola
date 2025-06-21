import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import type { ProviderWithoutOllama } from "@/lib/user-keys"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message as MessageAISDK } from "ai"
import { logUserMessage } from "./api"
import { createErrorResponse, extractErrorMessage } from "./utils"

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  enableSearch: boolean
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      enableSearch,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const userMessage = messages[messages.length - 1]

    if (userMessage?.role === "user") {
      // Log user message here
      await logUserMessage({
        userId,
        chatId,
        content: userMessage.content,
        attachments: userMessage.experimental_attachments as Attachment[],
        model,
        isAuthenticated,
      })
    }

    // Prepare the system prompt
    const effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT_DEFAULT

    // If the user is authenticated, set API key (if necessary)
    let apiKey: string | undefined
    if (isAuthenticated && userId) {
      const { getEffectiveApiKey } = await import("@/lib/user-keys")
      const provider = getProviderForModel(model)
      apiKey =
        (await getEffectiveApiKey(userId, provider as ProviderWithoutOllama)) ||
        undefined
    }

    // Prepare the API payload
    const payload = {
      inputs: {
        prompt: effectiveSystemPrompt + "\n" + userMessage.content, // Sending the system prompt + user message to HuggingFace
        enable_search: enableSearch,
      },
    }

    // HuggingFace API URL (replace with your HuggingFace space endpoint)
    const huggingFaceURL = "https://mirxakamran893-logiqcurvecode.hf.space/chat"

    // Call HuggingFace API
    const response = await fetch(huggingFaceURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`, // If you need authentication
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HuggingFace API request failed with status: ${response.status}`)
    }

    // Get the response from HuggingFace
    const responseData = await response.json()

    // Ensure we have a valid response from HuggingFace
    if (!responseData || !responseData.message) {
      throw new Error("Invalid response from HuggingFace API")
    }

    const assistantMessage = responseData.message

    // Log assistant message
    if (userId) {
      // Assuming a `storeAssistantMessage` method to store the assistant's response
      await storeAssistantMessage({
        chatId,
        messages: [
          {
            role: "assistant",
            content: assistantMessage,
            sender: "assistant",
          },
        ], // Assuming response is an array of messages from HuggingFace
      })
    }

    // Return the result to the client
    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error("Error in /api/chat:", err)
    const error = err as {
      code?: string
      message?: string
      statusCode?: number
    }

    return createErrorResponse(error)
  }
}
