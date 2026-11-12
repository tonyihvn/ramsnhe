import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart } from 'chart.js';

export function ChatPanel({ activityId, conversationId, isOpen, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [promptContexts, setPromptContexts] = useState([]);
    const [selectedContext, setSelectedContext] = useState(null);
    const messagesEndRef = useRef(null);
    const chartRefs = useRef({});

    // Load prompt contexts
    useEffect(() => {
        fetchPromptContexts();
    }, []);

    const fetchPromptContexts = async () => {
        try {
            const response = await axios.get('/api/vanna/prompt-contexts');
            setPromptContexts(response.data);
            if (response.data.length > 0) {
                setSelectedContext(response.data[0].id);
            }
        } catch (error) {
            console.error('Failed to load prompt contexts:', error);
        }
    };

    // Load conversation messages
    useEffect(() => {
        if (conversationId) {
            fetchMessages();
        }
    }, [conversationId]);

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`/api/vanna/conversations/${conversationId}/messages`);
            setMessages(response.data);
            scrollToBottom();
            
            // Render charts after messages are loaded
            setTimeout(() => {
                response.data.forEach((msg, idx) => {
                    if (msg.chart_data && msg.chart_type && msg.message_role === 'assistant') {
                        renderChart(idx, msg);
                    }
                });
            }, 100);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const renderChart = (messageIdx, message) => {
        const chartId = `chart-${messageIdx}`;
        const canvasEl = document.getElementById(chartId);
        if (!canvasEl) return;

        const ctx = canvasEl.getContext('2d');
        const chartData = message.chart_data;

        if (chartRefs.current[chartId]) {
            chartRefs.current[chartId].destroy();
        }

        chartRefs.current[chartId] = new Chart(ctx, {
            type: message.chart_type === 'bar' ? 'bar' : 'line',
            data: {
                labels: chartData.labels || [],
                datasets: (chartData.datasets || []).map((dataset, i) => ({
                    label: dataset.label,
                    data: dataset.data,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)'
                    ][i % 4],
                    borderColor: [
                        'rgb(75, 192, 192)',
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 206, 86)'
                    ][i % 4],
                    borderWidth: 1
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !conversationId) return;

        const userMsg = inputMessage;
        setInputMessage('');
        setLoading(true);

        try {
            const response = await axios.post(`/api/vanna/conversations/${conversationId}/messages`, {
                message: userMsg,
                promptContextId: selectedContext
            });

            setMessages(prev => [
                ...prev,
                response.data.userMessage,
                response.data.assistantMessage
            ]);
            
            scrollToBottom();
            
            if (response.data.assistantMessage?.chart_data) {
                setTimeout(() => {
                    const msgIdx = messages.length + 1;
                    renderChart(msgIdx, response.data.assistantMessage);
                }, 100);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Error sending message: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg flex flex-col border-l">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">AI Analytics</h2>
                <button
                    onClick={onClose}
                    className="text-white hover:bg-blue-700 p-2 rounded"
                >
                    ✕
                </button>
            </div>

            {/* Context Selector */}
            {promptContexts.length > 0 && (
                <div className="p-3 border-b">
                    <label className="text-sm font-medium text-gray-700">
                        Context
                    </label>
                    <select
                        value={selectedContext || ''}
                        onChange={(e) => setSelectedContext(e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
                    >
                        {promptContexts.map(ctx => (
                            <option key={ctx.id} value={ctx.id}>
                                {ctx.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <p>Start a conversation to get AI-powered insights</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.message_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-xs p-3 rounded-lg ${
                                    msg.message_role === 'user'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-800'
                                }`}
                            >
                                <p className="text-sm">{msg.message_content}</p>

                                {/* Visualization */}
                                {msg.chart_data && msg.chart_type && msg.message_role === 'assistant' && (
                                    <div className="mt-3 w-64">
                                        <canvas id={`chart-${idx}`} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask a question..."
                        disabled={loading}
                        className="flex-1 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={loading || !inputMessage.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {loading ? '...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ChatPanel;
