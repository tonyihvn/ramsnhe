# Quick Start: Using Vanna.AI in Activity Dashboards

## 5-Minute Setup

### Step 1: Admin Configuration (1-2 min)

1. Go to **Settings → AI Context** tab
2. Click **"Configure"** under "LLM Configuration"
3. Select provider:
   - **OpenAI** (recommended for best quality)
   - **Anthropic** (good quality, lower cost)
   - **Cohere** (budget option)

4. Enter API key from your LLM provider
5. Click **"Save LLM Settings"**

✅ LLM is now configured

### Step 2: Train Vanna (1-2 min)

1. Still in **Settings → AI Context**
2. Under "Vanna.AI Training", paste your database DDL:
   ```sql
   CREATE TABLE facilities (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255),
       location VARCHAR(255),
       ...
   );
   ```
3. Click **"Train Vanna on DDL"**
4. Wait for status message "Training completed!"

✅ Vanna.AI is now trained

### Step 3: Add Prompt Context (30 sec)

1. Under "Prompt Contexts (RAG)" section
2. Click **"+ Add Context"**
3. Fill form:
   - **Name:** e.g., "Healthcare Analysis Context"
   - **Description:** Optional
   - **Context Text:** Paste relevant information:
     ```
     This database tracks healthcare facility data including:
     - Facility name and location
     - Number of beds and staff
     - Services provided
     - Patient statistics
     
     Use this context to understand the data structure
     and provide relevant insights.
     ```
4. Click **"Save Context"**

✅ Ready to use!

---

## Using AI Analytics in Activities

### Open AI Chat

1. Go to any **Activity Dashboard** (e.g., `/activities/dashboard/1`)
2. Look for **"AI Analytics"** button (top right)
3. Click it → Chat panel opens on the right side

### Ask Questions

Examples of questions you can ask:

```
1. "What are the top 5 facilities by bed count?"
2. "Show me facilities with more than 10 staff"
3. "Which locations have the most activities this month?"
4. "Compare patient statistics across regions"
5. "Highlight facilities with declining performance"
```

### See Results

The AI will:
1. 🔍 Generate SQL from your question
2. 📊 Query the database
3. 📈 Create charts/tables from results
4. 💡 Provide insights and analysis
5. 💬 Continue conversation naturally

---

## Example Conversation

**User:** "Show me health facilities by region"

**AI Response:**
```
Based on your database, I found 15 facilities distributed across 
3 regions:

1. Northern Region - 6 facilities
2. Central Region - 5 facilities  
3. Southern Region - 4 facilities

[BAR CHART showing facility count per region]

The Northern region has the highest concentration, with 40% of 
all facilities. The Central region has steady distribution.
```

**User:** "Which has the most beds?"

**AI Response:**
```
The Northern region has the most beds:
- Northern: 2,450 beds
- Central: 1,820 beds
- Southern: 1,340 beds

[LINE CHART showing bed distribution]

To increase capacity in the Southern region, you may want to 
consider expanding facilities there.
```

---

## Switching Contexts

Different prompts contexts are useful for different analyses:

1. **Healthcare Context** - Medical/clinical questions
2. **Financial Context** - Budget/cost analysis
3. **Operations Context** - Efficiency/performance metrics
4. **Statistics Context** - Data distributions

Select from dropdown at top of chat panel to switch contexts.

---

## What AI Can Do

### ✅ Can Do These

- **Query Database:** Natural language → SQL
- **Analyze Data:** Patterns, trends, anomalies
- **Generate Reports:** Summary of key metrics
- **Create Visualizations:** Charts and graphs
- **Answer Questions:** About your data
- **Make Recommendations:** Based on data analysis
- **Continue Conversations:** Multi-turn dialogue

### ⚠️ Limitations

- Can't modify data (read-only SQL generation)
- Accuracy depends on data quality
- Hallucination risk with unfamiliar data
- LLM knowledge cutoff (may not know 2024+ events)
- Requires proper context for best results

---

## Troubleshooting

### Chat doesn't open
- Refresh page
- Check browser console for errors
- Verify you're logged in as user (not just visitor)

### "No prompt contexts" error
- Admin needs to create context first
- Go to Settings → AI Context → Add Context

### AI gives wrong results
- Ask more specific questions
- Add more detailed prompt context
- Train Vanna with complete DDL
- Check if data in database is correct

### AI response is slow (>20 sec)
- May be waiting for LLM API response
- Check internet connection
- Verify LLM API is not rate-limited
- Try simpler questions first

### "Failed to load resource" errors
- Check network tab in browser dev tools
- Verify API endpoints are accessible
- Confirm backend server is running
- Check CORS settings in vite.config.ts

---

## Performance Tips

### For Better Results

1. **Be Specific:**
   - ✅ "Show me the top 5 facilities by patient count in Q4 2024"
   - ❌ "Show me facilities"

2. **Provide Context:**
   - ✅ Add prompt context with business rules
   - ❌ Leave context empty

3. **Follow Up:**
   - ✅ "That's interesting. Why is this happening?"
   - ❌ Asking unrelated questions

4. **Use Precise Terms:**
   - ✅ Column/table names from database
   - ❌ Informal nicknames

### For Faster Responses

1. Ask questions about smaller data subsets
2. Use time-limited queries (e.g., "last 30 days")
3. Request specific columns, not full rows
4. Add filters to reduce data volume

---

## Advanced Usage

### Creating Custom Contexts

Structure your context for best results:

```
1. BUSINESS CONTEXT
   [Explain your organization]
   
2. DATA STRUCTURE
   [Describe key tables & relationships]
   
3. BUSINESS RULES
   [Define important metrics & definitions]
   
4. HISTORICAL CONTEXT
   [Explain trends or changes]
   
5. SPECIAL INSTRUCTIONS
   [Any nuances the LLM should know]
```

### Multi-Turn Analysis

Build on previous responses:

```
Q1: "How many activities were completed this month?"
A1: [Shows 245 activities]

Q2: "What was the success rate?"
A2: [References Q1 data, shows 92% success rate]

Q3: "Which facilities had lower success rates?"
A3: [Uses previous context to identify patterns]
```

### Exporting Insights

Future feature will allow:
- Save conversations to PDF
- Export charts as images
- Share analysis with team
- Schedule recurring reports

---

## Cost Management

### Monitor Usage

View in **Settings → AI Context** or logs:
```
Each query costs approximately:
- OpenAI GPT-4: $0.05-0.15 per query
- Claude 3: $0.01-0.03 per query  
- Cohere: $0.0002-0.001 per query
```

### Reduce Costs

1. **Use cheaper models** for brainstorming
2. **Limit max_tokens** in LLM settings
3. **Use caching** for similar queries (future)
4. **Batch queries** instead of individual questions
5. **Monitor usage** via activity logs

---

## API for Developers

### Embed in Custom Pages

```typescript
import { ChatPanel } from '@/components/ui/ChatPanel';

export function MyCustomPage() {
    const [showChat, setShowChat] = useState(false);
    const [conversationId, setConversationId] = useState(null);

    const handleOpenChat = async () => {
        const response = await fetch('/api/vanna/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId: 123 })
        });
        const data = await response.json();
        setConversationId(data.id);
        setShowChat(true);
    };

    return (
        <>
            <button onClick={handleOpenChat}>Open AI Chat</button>
            <ChatPanel 
                conversationId={conversationId} 
                isOpen={showChat}
                onClose={() => setShowChat(false)}
            />
        </>
    );
}
```

### Direct API Calls

```bash
# Send a message
curl -X POST http://localhost:3000/api/vanna/conversations/5/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me top 10 facilities",
    "promptContextId": 1
  }'

# Get conversation history
curl http://localhost:3000/api/vanna/conversations/5/messages
```

---

## Common Questions

### Q: Can AI modify data?
**A:** No, it's read-only. Vanna generates SELECT queries only.

### Q: Is my data sent to OpenAI/LLM providers?
**A:** Only the query results and question are sent to LLM API. Raw data stays in your database.

### Q: How long does training take?
**A:** Usually 30 seconds to 2 minutes depending on DDL size.

### Q: Can I use multiple LLM providers?
**A:** Currently one per business. Future versions may support switching.

### Q: What if Vanna generates wrong SQL?
**A:** It's designed to learn from mistakes. Train it with corrected SQL examples for improvement.

### Q: Can I undo a query?
**A:** Queries are read-only, but you can ask new questions in the conversation.

---

## Next Steps

1. ✅ Follow 5-minute setup above
2. ✅ Test with simple questions
3. ✅ Create better prompt contexts
4. ✅ Train Vanna with complete database DDL
5. ✅ Explore advanced usage
6. 📖 Read full documentation in VANNA_IMPLEMENTATION_COMPLETE.md

---

**Ready to get started?** Go to **Settings → AI Context** now! 🚀

