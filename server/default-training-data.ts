/**
 * Default AI Context Activities Seed Data
 * These are example question-response pairs that the AI will learn from
 */

export const DEFAULT_AI_CONTEXT_ACTIVITIES = [
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'How many facilities are in the database?',
        response: 'To find the total number of facilities, I would query the facilities table and count all records. The query would be: SELECT COUNT(*) as total_facilities FROM facilities;',
        feedbackScore: 5,
        contextTags: ['facilities', 'count', 'basic', 'analytics']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'Which facilities have the most beds?',
        response: 'To find facilities with the most beds, I would order the facilities table by the beds column in descending order: SELECT name, beds FROM facilities ORDER BY beds DESC LIMIT 10;',
        feedbackScore: 5,
        contextTags: ['facilities', 'beds', 'ranking', 'analytics']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'Show me facilities grouped by location',
        response: 'To group facilities by location: SELECT location, COUNT(*) as facility_count FROM facilities GROUP BY location ORDER BY facility_count DESC;',
        feedbackScore: 5,
        contextTags: ['facilities', 'location', 'grouping', 'geographic']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'How many activities were completed this month?',
        response: 'To count completed activities in the current month: SELECT COUNT(*) as completed_activities FROM activities WHERE status = \'completed\' AND DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', CURRENT_DATE);',
        feedbackScore: 5,
        contextTags: ['activities', 'monthly', 'completion', 'time-based']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'What is the success rate of activities?',
        response: 'To calculate the success rate: SELECT ROUND((COUNT(CASE WHEN status = \'completed\' THEN 1 END)::float / COUNT(*) * 100), 2) as success_rate FROM activities;',
        feedbackScore: 5,
        contextTags: ['activities', 'success', 'metrics', 'performance']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'Show me top performing facilities',
        response: 'To find top performing facilities by activity completion: SELECT f.name, COUNT(a.id) as activity_count FROM facilities f LEFT JOIN activities a ON f.id = a.facility_id WHERE a.status = \'completed\' GROUP BY f.id, f.name ORDER BY activity_count DESC LIMIT 10;',
        feedbackScore: 5,
        contextTags: ['facilities', 'performance', 'ranking', 'analytics']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'List all facilities in a specific region',
        response: 'To list facilities in a specific region: SELECT * FROM facilities WHERE region = $1 ORDER BY name;',
        feedbackScore: 5,
        contextTags: ['facilities', 'location', 'filtering', 'regional']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'What are the average metrics per facility?',
        response: 'To calculate average metrics per facility: SELECT f.name, AVG(COALESCE(a.duration, 0)) as avg_duration, COUNT(a.id) as total_activities FROM facilities f LEFT JOIN activities a ON f.id = a.facility_id GROUP BY f.id, f.name ORDER BY avg_duration DESC;',
        feedbackScore: 5,
        contextTags: ['facilities', 'metrics', 'averaging', 'aggregation']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'Find facilities with low activity rates',
        response: 'To find facilities with low activity rates: SELECT f.name, COUNT(a.id) as activity_count FROM facilities f LEFT JOIN activities a ON f.id = a.facility_id GROUP BY f.id, f.name HAVING COUNT(a.id) < 5 ORDER BY activity_count ASC;',
        feedbackScore: 5,
        contextTags: ['facilities', 'activity', 'performance', 'improvement']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'Compare performance between two facilities',
        response: 'To compare two facilities: SELECT f.name, COUNT(a.id) as total_activities, ROUND(AVG(CASE WHEN a.status = \'completed\' THEN 1 ELSE 0 END)::numeric * 100, 2) as completion_rate FROM facilities f LEFT JOIN activities a ON f.id = a.facility_id WHERE f.name IN ($1, $2) GROUP BY f.id, f.name;',
        feedbackScore: 5,
        contextTags: ['facilities', 'comparison', 'performance', 'analytics']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'What is the total bed capacity?',
        response: 'To find the total bed capacity: SELECT SUM(beds) as total_beds FROM facilities;',
        feedbackScore: 5,
        contextTags: ['facilities', 'beds', 'capacity', 'metrics']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'Show me activity trends over time',
        response: 'To show activity trends: SELECT DATE_TRUNC(\'month\', created_at) as month, COUNT(*) as activity_count FROM activities GROUP BY DATE_TRUNC(\'month\', created_at) ORDER BY month DESC;',
        feedbackScore: 5,
        contextTags: ['activities', 'trends', 'time-series', 'analytics']
    },
    {
        activityType: 'QUESTION_RESPONSE',
        question: 'Which activities are pending?',
        response: 'To find pending activities: SELECT * FROM activities WHERE status = \'pending\' ORDER BY created_at DESC;',
        feedbackScore: 5,
        contextTags: ['activities', 'pending', 'status', 'filtering']
    },
    {
        activityType: 'FEEDBACK',
        question: 'How do I filter by date range?',
        response: 'To filter by date range, use the BETWEEN operator or comparison operators: WHERE created_at BETWEEN $1 AND $2 or WHERE created_at >= $1 AND created_at <= $2',
        feedbackScore: 5,
        contextTags: ['date', 'filtering', 'query', 'techniques']
    },
    {
        activityType: 'FEEDBACK',
        question: 'How do I join multiple tables?',
        response: 'Use JOIN clauses to connect tables on common columns: SELECT f.name, a.* FROM facilities f INNER JOIN activities a ON f.id = a.facility_id',
        feedbackScore: 5,
        contextTags: ['joins', 'query', 'multiple-tables', 'techniques']
    },
    {
        activityType: 'FEEDBACK',
        question: 'How do I handle NULL values?',
        response: 'Use COALESCE() to provide a default value for NULLs: COALESCE(column_name, default_value) or use IS NULL / IS NOT NULL in WHERE clauses',
        feedbackScore: 5,
        contextTags: ['null-handling', 'query', 'data-quality', 'techniques']
    }
];

/**
 * Insert default AI Context activities for a business
 */
export async function seedDefaultAIContextActivities(businessId: number, pool: any) {
    try {
        const tablePrefix = process.env.TABLE_PREFIX || 'dqatb_';
        
        for (const activity of DEFAULT_AI_CONTEXT_ACTIVITIES) {
            const query = `
                INSERT INTO ${tablePrefix}ai_context_activities
                (business_id, activity_type, question, response, feedback_score, context_tags, created_by, created_at, updated_at, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), true)
                ON CONFLICT DO NOTHING
            `;
            
            await pool.query(query, [
                businessId,
                activity.activityType,
                activity.question,
                activity.response,
                activity.feedbackScore,
                JSON.stringify(activity.contextTags),
                'system_seed',
            ]);
        }
        
        console.log(`✅ Seeded ${DEFAULT_AI_CONTEXT_ACTIVITIES.length} default AI Context activities for business ${businessId}`);
        return true;
    } catch (error) {
        console.error('Error seeding AI Context activities:', error);
        return false;
    }
}

/**
 * Example Vanna DDL Training Records
 */
export const DEFAULT_VANNA_DDL_RECORDS = [
    {
        trainingType: 'DDL',
        title: 'Facilities Table Schema',
        content: `
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    region VARCHAR(100),
    beds INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_facilities_location ON facilities(location);
CREATE INDEX idx_facilities_region ON facilities(region);
CREATE INDEX idx_facilities_status ON facilities(status);
        `,
        metadata: { importance: 'high', source: 'core_database' }
    },
    {
        trainingType: 'DDL',
        title: 'Activities Table Schema',
        content: `
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    facility_id INTEGER REFERENCES facilities(id),
    name VARCHAR(255),
    description TEXT,
    activity_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    start_date DATE,
    end_date DATE,
    duration_days INTEGER,
    participants INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_facility ON activities(facility_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_date ON activities(start_date, end_date);
        `,
        metadata: { importance: 'high', source: 'core_database' }
    },
    {
        trainingType: 'DOCUMENTATION',
        title: 'Database Documentation',
        content: `
# Healthcare Facility Management Database

## Tables Overview

### facilities
Stores information about health facilities (hospitals, clinics, health centers)
- Columns: id, name, location, region, beds, status
- Used for: Facility location tracking, capacity planning, facility enumeration

### activities
Tracks activities/programs/trainings conducted at facilities
- Columns: id, facility_id, name, description, activity_type, status, dates, participants
- Used for: Activity tracking, performance monitoring, resource allocation

## Common Queries

1. Find all active facilities: WHERE status = 'active'
2. Count activities per facility: GROUP BY facility_id, COUNT(*)
3. Get facilities by region: WHERE region = $1
4. Track activity progress: WHERE status IN ('pending', 'in_progress')

## Data Relationships
- Activities are linked to facilities via facility_id
- Each facility can have multiple activities
- Activities track participation and time span
        `,
        metadata: { importance: 'high', source: 'documentation' }
    }
];

/**
 * Example Vercel AI Training Records
 */
export const DEFAULT_VERCEL_TRAINING_RECORDS = [
    {
        trainingType: 'PROMPT_CONTEXT',
        title: 'Healthcare Analytics Context',
        content: `
You are an expert healthcare data analyst helping with facility and activity data analysis.

Key Context:
- Facilities table contains health centers, hospitals, and clinics information
- Activities table tracks programs and trainings at each facility
- Both tables use timestamps for tracking
- Location and region are key dimensions for analysis

Your Role:
1. Help interpret facility and activity data
2. Provide insights on facility performance
3. Suggest data-driven improvements
4. Answer questions about program effectiveness
5. Help identify bottlenecks and opportunities

When responding:
- Be specific and data-focused
- Reference actual data when possible
- Suggest actionable recommendations
- Ask clarifying questions if needed
        `,
        modelConfig: { provider: 'openai', model: 'gpt-4', temperature: 0.7 },
        metadata: { importance: 'high', domain: 'healthcare' }
    },
    {
        trainingType: 'EXAMPLE_QUERY',
        title: 'Example: Facilities Performance Analysis',
        content: `
User: "Show me the top 10 facilities by activity count"

Expected Response:
Here are the top 10 facilities by number of activities:

1. Central Hospital - 156 activities
2. Urban Health Center - 123 activities
3. District Hospital - 98 activities
...

Analysis:
- These facilities show high engagement in programs
- Consider resource allocation based on activity load
- Peak activity seasons should inform staffing decisions

Generated SQL:
SELECT f.name, COUNT(a.id) as activity_count 
FROM facilities f 
LEFT JOIN activities a ON f.id = a.facility_id 
GROUP BY f.id, f.name 
ORDER BY activity_count DESC 
LIMIT 10;
        `,
        modelConfig: { provider: 'openai', model: 'gpt-4', temperature: 0.5 },
        metadata: { importance: 'high', example_type: 'query_response' }
    }
];

export default {
    DEFAULT_AI_CONTEXT_ACTIVITIES,
    DEFAULT_VANNA_DDL_RECORDS,
    DEFAULT_VERCEL_TRAINING_RECORDS,
    seedDefaultAIContextActivities
};
