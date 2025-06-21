import { openrouterModels } from "./data/openrouter"
import { ModelConfig } from "./types"

// Static models (only openrouter model is available now)
const STATIC_MODELS: ModelConfig[] = [...openrouterModels]

// Dynamic models cache
let dynamicModelsCache: ModelConfig[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Function to get all models (only openrouter now)
export async function getAllModels(): Promise<ModelConfig[]> {
  const now = Date.now()

  // Use cache if it's still valid
  if (dynamicModelsCache && now - lastFetchTime < CACHE_DURATION) {
    return dynamicModelsCache
  }

  try {
    // Since we only care about openrouter models now, directly return them
    dynamicModelsCache = openrouterModels
    lastFetchTime = now
    return dynamicModelsCache
  } catch (error) {
    console.warn("Failed to load models, using static openrouter models:", error)
    return openrouterModels
  }
}

export async function getModelsWithAccessFlags(): Promise<ModelConfig[]> {
  const models = await getAllModels()

  // Since all available models are openrouter, just map them with accessible flag
  const freeModels = models
    .filter((model) => model.providerId === "openrouter")
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  const proModels = [] // No pro models anymore since it's only openrouter

  return [...freeModels, ...proModels]
}

export async function getModelsForProvider(
  provider: string
): Promise<ModelConfig[]> {
  const models = openrouterModels

  // Only return openrouter models as there's no other provider now
  const providerModels = models
    .filter((model) => model.providerId === provider)
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  return providerModels
}

// Function to get models based on user's available providers (only openrouter)
export async function getModelsForUserProviders(
  providers: string[]
): Promise<ModelConfig[]> {
  const providerModels = await Promise.all(
    providers.map((provider) => getModelsForProvider(provider))
  )

  const flatProviderModels = providerModels.flat()

  return flatProviderModels
}

// Synchronous function to get model info for simple lookups
// This uses cached data if available, otherwise falls back to static openrouter models
export function getModelInfo(modelId: string): ModelConfig | undefined {
  // First check the cache if it exists
  if (dynamicModelsCache) {
    return dynamicModelsCache.find((model) => model.id === modelId)
  }

  // Fall back to openrouter models for immediate lookup
  return openrouterModels.find((model) => model.id === modelId)
}

// For backward compatibility - static models only (now just openrouter)
export const MODELS: ModelConfig[] = openrouterModels

// Function to refresh the models cache (now just for openrouter)
export function refreshModelsCache(): void {
  dynamicModelsCache = null
  lastFetchTime = 0
}
