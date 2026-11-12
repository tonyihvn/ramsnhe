import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface AIAssistantDashboardProps {
  activityId: string;
  currentUser: any;
}

const AIAssistantDashboard: React.FC<AIAssistantDashboardProps> = ({ activityId, currentUser }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [aiQueryResult, setAiQueryResult] = useState<any | null>(null);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [selectedBusinessRules, setSelectedBusinessRules] = useState<any[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [chartVisualization, setChartVisualization] = useState<any>(null);

  // Load AI settings and initialize
  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const loadSettings = async () => {
    try {
      const res = await fetch(`/api/ai-settings/${currentUser?.businessId}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    }
  };

  const handleAskAI = async () => {
    if (!aiPrompt || !aiPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setAiLoading(true);
    setError(null);
    setAiResponseText(null);
    setAiQueryResult(null);
    setChartVisualization(null);

    try {
      // First, send prompt to Vanna.AI to generate SQL
      const vannaResponse = await fetch('/api/vanna/generate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentUser?.businessId,
          prompt: aiPrompt,
          context: { 
            activityId,
            conversationHistory: conversationHistory.slice(-settings?.conversationContext || 5)
          }
        })
      });

      if (!vannaResponse.ok) {
        throw new Error(`Vanna API error: ${vannaResponse.statusText}`);
      }

      const vannaData = await vannaResponse.json();
      const generatedSQL = vannaData.sql;

      // Execute the generated SQL to get data
      const executeResponse = await fetch('/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentUser?.businessId,
          sql: generatedSQL,
          activityId
        })
      });

      if (!executeResponse.ok) {
        throw new Error(`SQL execution error: ${executeResponse.statusText}`);
      }

      const queryData = await executeResponse.json();
      setAiQueryResult(queryData);

      // Send query result to LLM for interpretation
      const llmResponse = await fetch('/api/llm/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentUser?.businessId,
          prompt: aiPrompt,
          queryResult: queryData,
          llmModel: settings?.llmModel || 'gpt-4',
          llmProvider: settings?.llmProvider || 'openai',
          tone: settings?.responseToneStyle || 'professional',
          requestChart: aiPrompt.toLowerCase().includes('chart') || 
                       aiPrompt.toLowerCase().includes('visual') ||
                       aiPrompt.toLowerCase().includes('graph')
        })
      });

      if (!llmResponse.ok) {
        throw new Error(`LLM error: ${llmResponse.statusText}`);
      }

      const llmData = await llmResponse.json();
      setAiResponseText(llmData.interpretation);
      
      if (llmData.chartData) {
        setChartVisualization(llmData.chartData);
      }

      // Update conversation history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: aiPrompt },
        { role: 'assistant', content: llmData.interpretation }
      ];
      setConversationHistory(newHistory);
      setAiPrompt('');

    } catch (err) {
      console.error('AI Assistant error:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearConversation = () => {
    setConversationHistory([]);
    setAiPrompt('');
    setAiResponseText(null);
    setAiQueryResult(null);
    setChartVisualization(null);
    setError(null);
  };

  if (!settings?.enableAIAssistant) {
    return (
      <Card>
        <h2 className="text-lg font-semibold mb-2">AI Assistant</h2>
        <p className="text-sm text-gray-500">AI Assistant is currently disabled. Please enable it in settings.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-2">🤖 AI Assistant</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ask questions about this activity's data. The AI will generate SQL queries and provide analysis with insights.
      </p>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="mb-4 max-h-60 overflow-y-auto border rounded p-3 bg-gray-50">
          <div className="text-xs font-semibold text-gray-600 mb-2">Conversation History</div>
          {conversationHistory.map((msg, idx) => (
            <div key={idx} className={`mb-2 p-2 rounded ${msg.role === 'user' ? 'bg-blue-50' : 'bg-green-50'}`}>
              <div className="text-xs font-semibold text-gray-700">
                {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
              </div>
              <div className="text-sm text-gray-800 mt-1">{msg.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="space-y-3">
        <textarea
          className="w-full border rounded p-3 text-sm"
          rows={4}
          placeholder="Ask a question about this activity's data...
Examples:
- 'What is the total number of reports submitted?'
- 'Show me the distribution of responses by facility'
- 'Create a chart showing trends over time'
- 'What are the key insights from this data?'"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          disabled={aiLoading}
        />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleAskAI}
            disabled={aiLoading || !aiPrompt.trim()}
          >
            {aiLoading ? '⏳ Processing...' : '✨ Ask AI'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleClearConversation}
            disabled={conversationHistory.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-xs font-semibold text-red-900">❌ Error</div>
          <div className="text-sm text-red-800 mt-1">{error}</div>
        </div>
      )}

      {/* AI Response */}
      {aiResponseText && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="font-semibold text-blue-900 mb-2">💡 AI Analysis</div>
          <div className="text-sm text-blue-800 whitespace-pre-wrap">{aiResponseText}</div>
        </div>
      )}

      {/* Chart Visualization */}
      {chartVisualization && settings?.enableChartGeneration && (
        <div className="mt-4 p-4 bg-white border rounded">
          <div className="font-semibold text-gray-900 mb-3">📊 Chart Visualization</div>
          <div className="text-sm text-gray-600">
            <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded overflow-auto max-h-64">
              {JSON.stringify(chartVisualization, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Query Result Data */}
      {aiQueryResult && settings?.enableInsights && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
          <div className="font-semibold text-amber-900 mb-2">📈 Query Result</div>
          <div className="text-sm text-amber-800">
            <div className="max-h-48 overflow-auto bg-white p-2 rounded font-mono text-xs">
              {JSON.stringify(aiQueryResult, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Selected Schemas & Context */}
      {(selectedSchemas.length > 0 || selectedBusinessRules.length > 0) && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-xs">
          <div className="font-semibold text-gray-900 mb-2">🔍 Context Used</div>
          {selectedSchemas.length > 0 && (
            <div className="mb-1">
              <span className="font-medium">Tables:</span> {selectedSchemas.join(', ')}
            </div>
          )}
          {selectedBusinessRules.length > 0 && (
            <div>
              <span className="font-medium">Rules:</span> {selectedBusinessRules.length} applied
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AIAssistantDashboard;
