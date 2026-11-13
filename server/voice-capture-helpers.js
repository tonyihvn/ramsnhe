/**
 * Voice Capture Helper Functions
 * Handles transcription service integration and LLM extraction
 */

import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { execSync } from 'child_process';
import pool from '../db.js';

const tablePrefix = process.env.TABLE_PREFIX || 'dqatb_';

/**
 * Test OpenAI Whisper API connection
 */
export async function testOpenAIWhisper(config) {
    try {
        if (!config.api_key) {
            return { success: false, message: 'API key not configured' };
        }
        // Make a simple API call to verify key validity
        await axios.post('https://api.openai.com/v1/audio/transcriptions', {}, {
            headers: { Authorization: `Bearer ${config.api_key}` }
        }).catch(err => {
            // Expected to fail since we're not sending audio, but validates API key format
            if (err.response?.status === 400) return true;
            throw err;
        });
        return { success: true, message: 'OpenAI Whisper API is accessible' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Test Google Cloud Speech-to-Text connection
 */
export async function testGoogleCloudSpeech(config) {
    try {
        if (!config.api_key && !config.credentials_path) {
            return { success: false, message: 'API key or credentials path not configured' };
        }
        return { success: true, message: 'Google Cloud Speech API is configured' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Test Azure Speech Services connection
 */
export async function testAzureSpeech(config) {
    try {
        if (!config.api_key || !config.region) {
            return { success: false, message: 'API key and region required' };
        }
        return { success: true, message: 'Azure Speech Services are configured' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Transcribe using OpenAI Whisper API
 */
export async function transcribeWithOpenAI(filePath, config) {
    try {
        if (!config.api_key) {
            throw new Error('OpenAI API key not configured');
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('model', config.model || 'whisper-1');
        form.append('language', config.language || 'en');

        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${config.api_key}`
                },
                timeout: 600000 // 10 minutes for large files
            }
        );

        return response.data.text;
    } catch (error) {
        console.error('OpenAI Whisper transcription error:', error.message);
        throw new Error(`Whisper transcription failed: ${error.message}`);
    }
}

/**
 * Transcribe using Google Cloud Speech-to-Text
 */
export async function transcribeWithGoogleCloud(filePath, config) {
    try {
        // This is a placeholder - would require google-cloud-speech-v1 library
        // Install: npm install @google-cloud/speech

        const speech = require('@google-cloud/speech');
        const client = new speech.SpeechClient({
            keyFilename: config.credentials_path || process.env.GOOGLE_APPLICATION_CREDENTIALS
        });

        const audioBytes = fs.readFileSync(filePath);
        const audio = {
            content: audioBytes,
        };

        const config_obj = {
            encoding: config.encoding || 'WEBM_OPUS',
            sampleRateHertz: config.sample_rate || 48000,
            languageCode: config.language || 'en-US',
        };

        const request = {
            audio: audio,
            config: config_obj,
        };

        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        return transcription;
    } catch (error) {
        console.error('Google Cloud transcription error:', error.message);
        throw new Error(`Google Cloud transcription failed: ${error.message}`);
    }
}

/**
 * Transcribe using Azure Cognitive Services
 */
export async function transcribeWithAzure(filePath, config) {
    try {
        if (!config.api_key || !config.region) {
            throw new Error('Azure API key and region required');
        }

        const fs_module = await import('fs');
        const audioData = fs_module.readFileSync(filePath);

        const response = await axios.post(
            `https://${config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`,
            audioData,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': config.api_key,
                    'Content-Type': 'audio/wav'
                },
                params: {
                    language: config.language || 'en-US'
                }
            }
        );

        if (response.data.RecognitionStatus !== 'Success') {
            throw new Error(`Azure recognition failed: ${response.data.RecognitionStatus}`);
        }

        return response.data.DisplayText;
    } catch (error) {
        console.error('Azure transcription error:', error.message);
        throw new Error(`Azure transcription failed: ${error.message}`);
    }
}

/**
 * Transcribe using local Whisper.cpp
 * Requires whisper.cpp to be installed and running as a server
 */
export async function transcribeWithLocalWhisper(filePath) {
    try {
        const localWhisperUrl = process.env.LOCAL_WHISPER_URL || 'http://localhost:8000';

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        const response = await axios.post(
            `${localWhisperUrl}/inference`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 600000
            }
        );

        return response.data.result?.transcription || response.data.text;
    } catch (error) {
        console.error('Local Whisper transcription error:', error.message);
        throw new Error(`Local Whisper transcription failed: ${error.message}`);
    }
}

/**
 * Get LLM settings for business
 */
export async function getLLMSettings(businessId) {
    try {
        const result = await pool.query(
            `SELECT provider, api_key, model_name, temperature, max_tokens
             FROM ${tablePrefix}llm_settings
             WHERE business_id = $1 AND is_active = true
             LIMIT 1`,
            [businessId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting LLM settings:', error);
        return null;
    }
}

/**
 * Build LLM extraction prompt
 */
export function buildExtractionPrompt(
    transcriptionText,
    formFields,
    aiContext = '',
    guidelines = {},
    aiContextId = null
) {
    // Build field definitions for LLM
    const fieldDefinitions = formFields.map(field => ({
        id: field.id,
        name: field.name,
        label: field.label,
        type: field.type,
        options: field.options || [],
        required: field.required || false
    }));

    const systemPrompt = `You are an expert form data extractor. Your job is to analyze a transcribed interview conversation and extract structured data for form submission.

${aiContext ? `CONTEXT:\n${aiContext}\n\n` : ''}

FORM FIELDS TO EXTRACT:
${JSON.stringify(fieldDefinitions, null, 2)}

${guidelines.ai_guide_text ? `VOICE GUIDELINES:\n${guidelines.ai_guide_text}\n\n` : ''}

TASK:
1. Identify each question asked by the interviewer
2. Find the corresponding answer from the responder
3. Map each answer to the most appropriate form field based on the field label and name
4. Convert values to match field data types:
   - Text → string (trim whitespace)
   - Number → parse as integer/float
   - Date → parse to ISO format (YYYY-MM-DD)
   - Select → match to available options exactly, use field.options
   - Checkbox → boolean (yes/true/agreed/positive = true, no/false/disagree = false)
   - Multiple Select → array of matched values from field.options
   - Email → validate and normalize
   - URL → validate and normalize
5. Ignore small talk and greetings
6. Be conservative with mapping - only include fields you're confident about

OUTPUT FORMAT (valid JSON only):
{
  "extracted_data": {
    "field_id_1": value1,
    "field_id_2": value2,
    ...
  },
  "confidence_scores": {
    "field_id_1": 95,
    "field_id_2": 87,
    ...
  },
  "notes": "any important observations about the conversation",
  "unmapped_responses": ["list of responses that didn't map to any field"]
}

IMPORTANT:
- Only include fields that were explicitly discussed in the conversation
- Confidence scores should be 0-100, where 100 = certain, 0 = not discussed
- Return ONLY valid JSON, no markdown formatting or extra text`;

    const userMessage = `Please extract the form data from this transcribed interview:\n\n${transcriptionText}`;

    return { systemPrompt, userMessage };
}

/**
 * Call LLM for data extraction
 */
export async function callLLMForExtraction(llmSettings, prompt) {
    try {
        const { provider, api_key, model_name, temperature = 0.3, max_tokens = 2000 } = llmSettings;

        let response;

        switch (provider) {
            case 'openai':
                response = await callOpenAI(api_key, model_name, prompt, temperature, max_tokens);
                break;
            case 'anthropic':
                response = await callAnthropic(api_key, model_name, prompt, temperature, max_tokens);
                break;
            case 'cohere':
                response = await callCohere(api_key, model_name, prompt, temperature, max_tokens);
                break;
            default:
                throw new Error(`Unsupported LLM provider: ${provider}`);
        }

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in LLM response');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error calling LLM:', error);
        throw error;
    }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(apiKey, model, prompt, temperature, maxTokens) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: model || 'gpt-4',
                messages: [
                    { role: 'system', content: prompt.systemPrompt },
                    { role: 'user', content: prompt.userMessage }
                ],
                temperature: temperature,
                max_tokens: maxTokens
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        throw new Error(`OpenAI API error: ${error.message}`);
    }
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(apiKey, model, prompt, temperature, maxTokens) {
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: model || 'claude-3-sonnet-20240229',
                max_tokens: maxTokens,
                system: prompt.systemPrompt,
                messages: [
                    { role: 'user', content: prompt.userMessage }
                ]
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.content[0].text;
    } catch (error) {
        throw new Error(`Anthropic API error: ${error.message}`);
    }
}

/**
 * Call Cohere API
 */
async function callCohere(apiKey, model, prompt, temperature, maxTokens) {
    try {
        const fullPrompt = `${prompt.systemPrompt}\n\nUser: ${prompt.userMessage}\n\nAssistant:`;

        const response = await axios.post(
            'https://api.cohere.ai/v1/generate',
            {
                model: model || 'command',
                prompt: fullPrompt,
                max_tokens: maxTokens,
                temperature: temperature,
                num_generations: 1
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.generations[0].text;
    } catch (error) {
        throw new Error(`Cohere API error: ${error.message}`);
    }
}
