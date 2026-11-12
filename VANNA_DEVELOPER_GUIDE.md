# Developer Integration Guide: Adding AI Analytics to Pages

## Overview

This guide shows how to integrate Vanna.AI chat into any React page in your application.

---

## Basic Integration (Activity Dashboard)

### Step 1: Import Components

```typescript
import { ChatPanel } from '@/components/ui/ChatPanel';
import { useState } from 'react';
```

### Step 2: Add State & Handler

```typescript
export function ActivityDashboardPage() {
    const [showChat, setShowChat] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);

    const handleOpenChat = async () => {
        try {
            // Create new conversation session
            const response = await fetch('/api/vanna/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    activityId: activityId // Pass current activity ID
                })
            });
            const data = await response.json();
            setConversationId(data.id);
            setShowChat(true);
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    };

    return (
        <div className="flex">
            {/* Main content */}
            <div className="flex-1">
                {/* ... your page content ... */}
            </div>

            {/* AI Chat Button */}
            <button 
                onClick={handleOpenChat}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                💬 AI Analytics
            </button>

            {/* Chat Panel */}
            {conversationId && (
                <ChatPanel
                    conversationId={conversationId}
                    activityId={activityId}
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
}
```

---

## Advanced: Custom Chat Implementation

If you want to customize the chat UI:

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

export function CustomAIChat({ conversationId, activityId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [contexts, setContexts] = useState([]);
    const [selectedContext, setSelectedContext] = useState(null);

    // Load prompt contexts
    useEffect(() => {
        fetchContexts();
    }, []);

    const fetchContexts = async () => {
        const response = await axios.get('/api/vanna/prompt-contexts');
        setContexts(response.data);
        if (response.data.length > 0) setSelectedContext(response.data[0].id);
    };

    // Load existing messages
    useEffect(() => {
        if (conversationId) {
            loadMessages();
        }
    }, [conversationId]);

    const loadMessages = async () => {
        const response = await axios.get(
            `/api/vanna/conversations/${conversationId}/messages`
        );
        setMessages(response.data);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post(
                `/api/vanna/conversations/${conversationId}/messages`,
                {
                    message: userMsg,
                    promptContextId: selectedContext
                }
            );

            // Add both user and assistant messages
            setMessages(prev => [
                ...prev,
                response.data.userMessage,
                response.data.assistantMessage
            ]);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-96 bg-white border rounded">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg, idx) => (
                    <div 
                        key={idx}
                        className={`text-sm p-2 rounded ${
                            msg.message_role === 'user'
                                ? 'bg-blue-100 text-blue-900 ml-12'
                                : 'bg-gray-100 text-gray-900 mr-12'
                        }`}
                    >
                        {msg.message_content}
                    </div>
                ))}
            </div>

            {/* Context selector */}
            {contexts.length > 0 && (
                <select
                    value={selectedContext || ''}
                    onChange={(e) => setSelectedContext(e.target.value)}
                    className="m-2 p-2 border rounded text-sm"
                >
                    {contexts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 p-2 border rounded"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
```

---

## Adding to Report Pages

```typescript
// pages/ReportsPage.tsx
import { ChatPanel } from '@/components/ui/ChatPanel';
import { useState } from 'react';

export function ReportsPage() {
    const [chatOpen, setChatOpen] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);

    const handleAnalyzeReport = async (reportId) => {
        const response = await fetch('/api/vanna/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: reportId })
        });
        const data = await response.json();
        setConversationId(data.id);
        setChatOpen(true);
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Reports</h1>

            {/* Reports list */}
            <div className="grid gap-4">
                {/* ... render reports ... */}
                
                {reports.map(report => (
                    <div key={report.id} className="p-4 border rounded">
                        <h2>{report.title}</h2>
                        <p>{report.description}</p>
                        <button 
                            onClick={() => handleAnalyzeReport(report.id)}
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
                        >
                            🤖 Analyze with AI
                        </button>
                    </div>
                ))}
            </div>

            {/* Chat panel */}
            {conversationId && (
                <ChatPanel
                    conversationId={conversationId}
                    isOpen={chatOpen}
                    onClose={() => setChatOpen(false)}
                />
            )}
        </div>
    );
}
```

---

## Handling Chart Visualizations

### Rendering Charts from AI Responses

```typescript
import { Chart } from 'chart.js';
import { useEffect, useRef } from 'react';

export function ChartRenderer({ message }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!message.chart_data || !message.chart_type || !canvasRef.current) {
            return;
        }

        const ctx = canvasRef.current.getContext('2d');
        
        // Destroy previous chart
        if (canvasRef.current.chartInstance) {
            canvasRef.current.chartInstance.destroy();
        }

        // Create new chart
        canvasRef.current.chartInstance = new Chart(ctx, {
            type: message.chart_type === 'bar' ? 'bar' : 'line',
            data: {
                labels: message.chart_data.labels,
                datasets: message.chart_data.datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });

        return () => {
            if (canvasRef.current?.chartInstance) {
                canvasRef.current.chartInstance.destroy();
            }
        };
    }, [message.chart_data, message.chart_type]);

    if (!message.chart_data || !message.chart_type) {
        return null;
    }

    return <canvas ref={canvasRef} width={400} height={300} />;
}
```

---

## Settings Page Integration

### Adding AI Context Settings Tab

```typescript
// pages/SettingsPage.tsx
import { AIContextSettings } from '@/components/ui/AIContextSettings';

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div>
            <div className="flex gap-4 border-b mb-4">
                <button
                    className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-blue-600' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`px-4 py-2 ${activeTab === 'ai-context' ? 'border-b-2 border-blue-600' : ''}`}
                    onClick={() => setActiveTab('ai-context')}
                >
                    AI Context
                </button>
            </div>

            {activeTab === 'general' && (
                // ... existing settings ...
            )}

            {activeTab === 'ai-context' && (
                <AIContextSettings />
            )}
        </div>
    );
}
```

---

## Error Handling

### Best Practices

```typescript
const handleMessage = async (message) => {
    try {
        setLoading(true);
        
        const response = await axios.post(
            `/api/vanna/conversations/${conversationId}/messages`,
            { message, promptContextId: selectedContext }
        );

        if (response.data.error) {
            // AI couldn't process request
            console.warn('AI processing error:', response.data.error);
            showNotification('warning', response.data.error);
        } else {
            // Success
            setMessages(prev => [...prev, response.data.userMessage, response.data.assistantMessage]);
        }
    } catch (error) {
        // Network or API error
        console.error('Failed to send message:', error);
        
        if (error.response?.status === 403) {
            showNotification('error', 'Admin access required');
        } else if (error.response?.status === 401) {
            showNotification('error', 'Not authenticated');
        } else {
            showNotification('error', 'Failed to send message. Please try again.');
        }
    } finally {
        setLoading(false);
    }
};
```

---

## Type Definitions

```typescript
// types/vanna.ts

export interface Message {
    id: number;
    conversation_id: number;
    message_role: 'user' | 'assistant';
    message_content: string;
    vanna_sql_generated?: string;
    llm_analysis?: Record<string, any>;
    chart_data?: ChartData;
    chart_type?: 'bar' | 'line' | 'scatter' | 'pie';
    created_at: string;
}

export interface ChartData {
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
    }>;
}

export interface Conversation {
    id: number;
    business_id: number;
    session_key: string;
    activity_id: number;
    user_id: number;
    status: 'active' | 'archived';
    created_at: string;
}

export interface PromptContext {
    id: number;
    business_id: number;
    name: string;
    description?: string;
    context_text: string;
    is_active: boolean;
    created_at: string;
}

export interface LLMSettings {
    id: number;
    business_id: number;
    provider: 'openai' | 'anthropic' | 'cohere';
    model_name: string;
    temperature: number;
    max_tokens: number;
    is_active: boolean;
}
```

---

## Testing Integration

### Unit Test Example

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPanel } from '@/components/ui/ChatPanel';
import axios from 'axios';

jest.mock('axios');

describe('ChatPanel', () => {
    it('sends message and displays response', async () => {
        const mockResponse = {
            data: {
                userMessage: { id: 1, message_content: 'Test' },
                assistantMessage: { id: 2, message_content: 'Response' }
            }
        };
        (axios.post as jest.Mock).mockResolvedValue(mockResponse);

        render(
            <ChatPanel 
                conversationId={123} 
                isOpen={true}
                onClose={jest.fn()}
            />
        );

        const input = screen.getByPlaceholderText('Ask a question...');
        const button = screen.getByRole('button', { name: /send/i });

        fireEvent.change(input, { target: { value: 'Test' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('Response')).toBeInTheDocument();
        });
    });
});
```

---

## Performance Optimization

### Lazy Load Chat Component

```typescript
import { lazy, Suspense } from 'react';

const ChatPanel = lazy(() => import('@/components/ui/ChatPanel'));

export function Page() {
    const [showChat, setShowChat] = useState(false);

    return (
        <div>
            <button onClick={() => setShowChat(true)}>Open Chat</button>
            
            {showChat && (
                <Suspense fallback={<div>Loading...</div>}>
                    <ChatPanel
                        conversationId={conversationId}
                        isOpen={showChat}
                        onClose={() => setShowChat(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}
```

### Memoize Messages

```typescript
import { useMemo } from 'react';

export function ChatPanel({ conversationId, ... }) {
    const [messages, setMessages] = useState([]);

    // Only re-render when messages actually change
    const memoizedMessages = useMemo(
        () => messages,
        [messages]
    );

    return (
        <div>
            {memoizedMessages.map((msg, idx) => (
                // ...
            ))}
        </div>
    );
}
```

---

## Debugging

### Enable Console Logging

```typescript
// In ChatPanel or custom component

const handleSendMessage = async (message) => {
    console.log('[AI] Sending message:', message);
    
    try {
        const response = await axios.post(`/api/vanna/conversations/${conversationId}/messages`, {
            message,
            promptContextId: selectedContext
        });
        
        console.log('[AI] Response received:', response.data);
        setMessages(prev => [...prev, response.data.userMessage, response.data.assistantMessage]);
    } catch (error) {
        console.error('[AI] Error:', {
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });
    }
};
```

### Check Network Requests

In browser DevTools → Network tab:
- Look for POST requests to `/api/vanna/conversations/*/messages`
- Check response JSON for errors
- Verify status code (200 = success, 400+ = error)

---

## Security Considerations

### Input Validation

```typescript
const sendMessage = async (message) => {
    // Validate input
    if (!message || typeof message !== 'string') {
        throw new Error('Invalid message');
    }
    if (message.length > 5000) {
        throw new Error('Message too long');
    }
    if (message.includes(';DROP')) {  // Basic SQL injection check
        throw new Error('Invalid message format');
    }

    // Send validated message
    await axios.post(`/api/vanna/conversations/${conversationId}/messages`, {
        message
    });
};
```

### Rate Limiting (Client Side)

```typescript
let lastMessageTime = 0;
const MIN_MESSAGE_INTERVAL = 1000; // 1 second between messages

const sendMessage = async (message) => {
    const now = Date.now();
    if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
        throw new Error('Too many messages. Please wait.');
    }
    lastMessageTime = now;
    
    // Send message...
};
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Configure LLM credentials (not in code)
- [ ] Train Vanna on production database schema
- [ ] Add comprehensive prompt contexts
- [ ] Test all API endpoints
- [ ] Set up error logging/monitoring
- [ ] Configure rate limiting (backend)
- [ ] Set budget alerts on LLM provider
- [ ] Document for support team
- [ ] Create user training materials
- [ ] Monitor token usage for costs

---

**Questions?** See VANNA_IMPLEMENTATION_COMPLETE.md for full documentation.

