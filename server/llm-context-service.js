// LLM Context Service
// Assembles context from multiple sources and calls LLM for analysis

import axios from 'axios';
import { tables } from './tablePrefix.js';

export class LLMContextService {
    constructor(pool) {
        this.pool = pool;
    }

    // Get LLM settings for business
    async getLLMSettings(businessId) {
        try {
            const res = await this.pool.query(
                `SELECT * FROM ${tables.LLM_SETTINGS} 
                WHERE business_id = $1 AND is_active = true`,
                [businessId]
            );
            
            if (!res.rows[0]) {
                throw new Error('No active LLM configuration found');
            }
            
            return res.rows[0];
        } catch (error) {
            console.error('[LLM] Failed to get LLM settings:', error);
            throw error;
        }
    }

    // Assemble prompt context
    async assemblePromptContext(businessId, promptContextId, sqlResults, conversationHistory) {
        try {
            // Get prompt context template
            let contextTemplate = '';
            if (promptContextId) {
                const contextRes = await this.pool.query(
                    `SELECT context_text FROM ${tables.PROMPT_CONTEXTS} WHERE id = $1`,
                    [promptContextId]
                );
                if (contextRes.rows[0]) {
                    contextTemplate = contextRes.rows[0].context_text;
                }
            }
            
            // Build full context
            let fullContext = '';
            
            if (contextTemplate) {
                fullContext += `Context Information:\n${contextTemplate}\n\n`;
            }
            
            if (sqlResults && sqlResults.length > 0) {
                fullContext += `Data from Query:\n${JSON.stringify(sqlResults, null, 2)}\n\n`;
            }
            
            if (conversationHistory && conversationHistory.length > 0) {
                fullContext += `Conversation History:\n`;
                conversationHistory.forEach((msg, idx) => {
                    fullContext += `${idx + 1}. [${msg.message_role.toUpperCase()}]: ${msg.message_content}\n`;
                });
                fullContext += '\n';
            }
            
            return fullContext;
        } catch (error) {
            console.error('[LLM] Failed to assemble context:', error);
            throw error;
        }
    }

    // Call LLM with context
    async callLLM(businessId, prompt, context = '', systemRole = null) {
        try {
            const settings = await this.getLLMSettings(businessId);
            
            // Build full prompt
            let fullPrompt = prompt;
            if (context) {
                fullPrompt = `${context}\n\nUser Question: ${prompt}`;
            }
            
            // Prepare request based on provider
            const llmResponse = await this.callLLMProvider(settings, fullPrompt, systemRole);
            
            return {
                success: true,
                response: llmResponse.content,
                provider: settings.provider,
                model: settings.model_name,
                tokensUsed: llmResponse.tokensUsed || {}
            };
        } catch (error) {
            console.error('[LLM] LLM call failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Provider-specific LLM calls
    async callLLMProvider(settings, prompt, systemRole) {
        const provider = settings.provider;
        
        switch (provider) {
            case 'openai':
                return await this.callOpenAI(settings, prompt, systemRole);
            case 'anthropic':
                return await this.callAnthropic(settings, prompt, systemRole);
            case 'cohere':
                return await this.callCohere(settings, prompt, systemRole);
            default:
                throw new Error(`Unsupported LLM provider: ${provider}`);
        }
    }

    // OpenAI API call
    async callOpenAI(settings, prompt, systemRole) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: settings.model_name || 'gpt-4',
                    messages: [
                        {
                            role: 'system',
                            content: systemRole || 'You are a helpful data analysis assistant. Provide clear, actionable insights.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: settings.temperature || 0.7,
                    max_tokens: settings.max_tokens || 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${settings.api_key}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );
            
            const content = response.data.choices[0].message.content;
            const tokensUsed = {
                input: response.data.usage.prompt_tokens,
                output: response.data.usage.completion_tokens
            };
            
            return { content, tokensUsed };
        } catch (error) {
            console.error('[LLM] OpenAI call failed:', error.message);
            throw error;
        }
    }

    // Anthropic API call
    async callAnthropic(settings, prompt, systemRole) {
        try {
            const response = await axios.post(
                settings.api_endpoint || 'https://api.anthropic.com/v1/messages',
                {
                    model: settings.model_name || 'claude-3-sonnet-20240229',
                    max_tokens: settings.max_tokens || 2000,
                    system: systemRole || 'You are a helpful data analysis assistant. Provide clear, actionable insights.',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        'x-api-key': settings.api_key,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    },
                    timeout: 30000
                }
            );
            
            const content = response.data.content[0].text;
            const tokensUsed = {
                input: response.data.usage.input_tokens,
                output: response.data.usage.output_tokens
            };
            
            return { content, tokensUsed };
        } catch (error) {
            console.error('[LLM] Anthropic call failed:', error.message);
            throw error;
        }
    }

    // Cohere API call
    async callCohere(settings, prompt, systemRole) {
        try {
            const response = await axios.post(
                'https://api.cohere.ai/v1/generate',
                {
                    model: settings.model_name || 'command',
                    prompt: prompt,
                    max_tokens: settings.max_tokens || 2000,
                    temperature: settings.temperature || 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${settings.api_key}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );
            
            const content = response.data.generations[0].text;
            
            return { content };
        } catch (error) {
            console.error('[LLM] Cohere call failed:', error.message);
            throw error;
        }
    }

    // Generate insights from data
    async generateInsights(businessId, data, userQuery, context = '') {
        try {
            const prompt = `Based on the following data and user question, provide key insights and actionable recommendations.

Data Summary:
${JSON.stringify(data, null, 2)}

User Question: ${userQuery}

Please provide:
1. Key findings from the data
2. Trends or patterns identified
3. Recommendations based on insights
4. Any concerns or anomalies to note`;

            const result = await this.callLLM(businessId, prompt, context);
            return result;
        } catch (error) {
            console.error('[LLM] Insight generation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Save LLM settings
    async saveLLMSettings(businessId, provider, apiKey, modelName, apiEndpoint = null, temperature = 0.7, maxTokens = 2000) {
        try {
            const res = await this.pool.query(
                `INSERT INTO ${tables.LLM_SETTINGS} 
                (business_id, provider, api_key, model_name, api_endpoint, temperature, max_tokens, is_active) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (business_id) DO UPDATE SET
                    provider = $2, api_key = $3, model_name = $4, api_endpoint = $5,
                    temperature = $6, max_tokens = $7, updated_at = NOW()
                RETURNING id`,
                [businessId, provider, apiKey, modelName, apiEndpoint, temperature, maxTokens, true]
            );
            
            return {
                success: true,
                settingsId: res.rows[0].id
            };
        } catch (error) {
            console.error('[LLM] Failed to save settings:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default LLMContextService;
