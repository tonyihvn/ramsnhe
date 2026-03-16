import React from 'react';

const DocsPage: React.FC = () => {
    return (
        <div className="flex h-full">
            <aside className="w-64 border-r bg-white p-4 overflow-y-auto sticky top-0 h-screen">
                <h2 className="text-lg font-semibold mb-4">User Guide</h2>
                <nav className="space-y-2 text-sm">
                    {[
                        'getting-started',
                        'creating-forms',
                        'form-builder',
                        'excel-import',
                        'filling-forms',
                        'creating-reports',
                        'data-api',
                        'api-examples',
                        'sharing-activities',
                        'managing-data',
                        'tips-tricks'
                    ].map(id => (
                        <a
                            key={id}
                            href={`#/docs#${id}`}
                            className="block text-gray-700 hover:text-primary-600"
                            onClick={(e) => {
                                e.preventDefault();
                                const el = document.getElementById(id);
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            {id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </a>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold">User Guide — How to Use the App</h1>
                    <p className="text-sm text-gray-600 mt-1">Complete guide to creating forms, collecting data, generating reports, and accessing your data through APIs.</p>
                </header>

                <section id="getting-started" className="mb-8">
                    <h2 className="text-2xl font-semibold">Getting Started</h2>
                    <p className="mt-2">Welcome to the app! This guide will help you:</p>
                    <ul className="list-disc list-inside mt-3 space-y-1">
                        <li>Create and manage data collection forms</li>
                        <li>Collect responses from users</li>
                        <li>Generate reports and analyze data</li>
                        <li>Access and share your data programmatically</li>
                    </ul>
                    <p className="mt-3 text-gray-600">The app provides both a visual form builder and support for bulk imports from Excel to help you quickly set up your data collection workflows.</p>
                </section>

                <section id="creating-forms" className="mb-8">
                    <h3 className="text-xl font-semibold">Creating Forms</h3>
                    <p className="mt-2">Forms are used to collect data from your team and field workers. You have two ways to create forms:</p>
                    <ul className="list-disc list-inside mt-3 space-y-2">
                        <li><strong>Form Builder</strong> — A visual interface to design forms step-by-step with different question types</li>
                        <li><strong>Excel Import</strong> — Upload a spreadsheet to create many questions at once</li>
                    </ul>
                    <p className="mt-3 text-gray-600">Each form belongs to a program (like "Health", "Education", "Safety") and can be used in multiple activities for data collection.</p>
                </section>

                <section id="form-builder" className="mb-8">
                    <h3 className="text-xl font-semibold">Using the Form Builder</h3>
                    <p className="mt-2">The Form Builder allows you to create questions visually without any coding:</p>

                    <h4 className="mt-4 font-semibold text-lg">Step 1: Create a New Form</h4>
                    <p className="mt-2">Navigate to <strong>Build Form</strong> and click "New Form". Enter:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li><strong>Form Name</strong> — A clear title like "Site Inspection Checklist" or "Health Assessment"</li>
                        <li><strong>Program</strong> — Select which program this form belongs to (Health, Education, Safety, etc.)</li>
                        <li><strong>Description</strong> — Optional notes about what this form is for</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">Step 2: Add Questions</h4>
                    <p className="mt-2">Click "Add Question" and configure:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li><strong>Question Label</strong> — The text that users see (e.g., "Is the facility accessible?")</li>
                        <li><strong>Question Type</strong> — Choose from available question types</li>
                    </ul>
                    <ul className="list-disc list-inside mt-2 ml-6">
                        <li><strong>Text</strong> — Short text input</li>
                        <li><strong>Long Text</strong> — Multi-line paragraph</li>
                        <li><strong>Dropdown</strong> — Select from predefined options</li>
                        <li><strong>Checkbox</strong> — Multiple selections allowed</li>
                        <li><strong>Radio</strong> — Single selection</li>
                        <li><strong>Number</strong> — Numeric input</li>
                        <li><strong>Date</strong> — Date picker</li>
                        <li><strong>File Upload</strong> — Attach photos or documents</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">Step 3: Add Options</h4>
                    <p className="mt-2">For questions with predefined choices, add options users can select from. You can assign scores to options for metrics.</p>

                    <h4 className="mt-4 font-semibold text-lg">Step 4: Organize into Groups</h4>
                    <p className="mt-2">Group related questions together for better UX (e.g., "Infrastructure", "Staffing", "Supplies").</p>

                    <h4 className="mt-4 font-semibold text-lg">Step 5: Preview and Save</h4>
                    <p className="mt-2">Preview your form and save it. You can edit anytime.</p>
                </section>

                <section id="excel-import" className="mb-8">
                    <h3 className="text-xl font-semibold">Bulk Import Forms from Excel</h3>
                    <p className="mt-2">Create many questions at once by uploading an Excel file, useful for migrating from other systems.</p>

                    <h4 className="mt-4 font-semibold text-lg">Excel File Format</h4>
                    <p className="mt-2">Your file should have at least one worksheet named <code>questions</code> with these columns:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li><strong>label</strong> — Question text (required)</li>
                        <li><strong>type</strong> — <code>text</code>, <code>number</code>, <code>date</code>, <code>dropdown</code>, <code>checkbox</code>, <code>radio</code>, <code>file_upload</code>, <code>long_text</code></li>
                        <li><strong>group_name</strong> — Section name</li>
                        <li><strong>options_key</strong> — Reference to predefined options</li>
                        <li><strong>score</strong> — Optional score/weight</li>
                        <li><strong>required</strong> — Whether mandatory (yes/no)</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">How to Import</h4>
                    <ol className="list-decimal list-inside mt-2 space-y-2">
                        <li>Download optional template from Build Form page</li>
                        <li>Fill in your questions data</li>
                        <li>Click "Import from Excel" and select your file</li>
                        <li>Review preview and confirm creation</li>
                    </ol>

                    <h4 className="mt-4 font-semibold text-lg">Example Structure</h4>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">{`questions sheet:
| label                  | type     | group_name | required |
|------------------------|----------|-----------|----------|
| Facility Name          | text     | Basic     | yes      |
| Inspection Date        | date     | Basic     | yes      |
| Cleanliness Rating     | dropdown | Assessment| yes      |

options sheet:
| options_key      | option_value | option_score |
|------------------|--------------|--------------|
| rating_scale     | Poor         | 1            |
| rating_scale     | Fair         | 2            |
| rating_scale     | Good         | 3            |`}
                    </pre>
                </section>

                <section id="filling-forms" className="mb-8">
                    <h3 className="text-xl font-semibold">Filling Out Forms</h3>
                    <p className="mt-2">Field workers and team members fill forms through the app:</p>

                    <h4 className="mt-4 font-semibold text-lg">How to Fill</h4>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li>Go to <strong>Activities</strong> to find forms</li>
                        <li>Answer all required questions (marked *)</li>
                        <li>Save progress and return later if needed</li>
                        <li>Click "Submit" when complete</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">Features</h4>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li><strong>File Upload</strong> — Attach photos or documents</li>
                        <li><strong>Grouped Questions</strong> — Easy navigation</li>
                        <li><strong>Validation</strong> — Catches errors before submission</li>
                        <li><strong>Timestamps</strong> — Auto date/time stamp responses</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">Sharing</h4>
                    <ul className="list-disc list-inside mt-2">
                        <li><strong>Copy Link</strong> — Email or message the URL</li>
                        <li><strong>QR Code</strong> — Easy mobile access</li>
                        <li><strong>Embed</strong> — Embed on websites</li>
                    </ul>
                </section>

                <section id="creating-reports" className="mb-8">
                    <h3 className="text-xl font-semibold">Creating Reports</h3>
                    <p className="mt-2">Analyze and visualize your collected data with reports:</p>

                    <h4 className="mt-4 font-semibold text-lg">Report Types</h4>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li><strong>Summary Reports</strong> — Response counts and statistics</li>
                        <li><strong>Data Tables</strong> — Detailed response view</li>
                        <li><strong>Charts & Graphs</strong> — Visual data representation</li>
                        <li><strong>Maps</strong> — Geographic data visualization</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">Building a Report</h4>
                    <ol className="list-decimal list-inside mt-2 space-y-2">
                        <li>Go to <strong>Reports</strong> and create new report</li>
                        <li>Select which form/activity to analyze</li>
                        <li>Choose visualization type (table, chart, map)</li>
                        <li>Apply filters (date, facility, program)</li>
                        <li>Customize and export as PDF or Excel</li>
                    </ol>

                    <h4 className="mt-4 font-semibold text-lg">Report Features</h4>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li><strong>Filters</strong> — By date, facility, program, answers</li>
                        <li><strong>Grouping</strong> — By facility, program, date</li>
                        <li><strong>Aggregations</strong> — Totals, averages, percentages</li>
                        <li><strong>Export</strong> — PDF or Excel download</li>
                        <li><strong>Scheduling</strong> — Auto-run on schedule</li>
                    </ul>
                </section>

                <section id="data-api" className="mb-8">
                    <h3 className="text-xl font-semibold">Data API Reference</h3>
                    <p className="mt-2">Access your data programmatically for integrations, custom reports, or third-party apps.</p>

                    <h4 className="mt-4 font-semibold text-lg">Authentication</h4>
                    <p className="mt-2">Include your API token in request headers:</p>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">{`Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json`}
                    </pre>

                    <h4 className="mt-4 font-semibold text-lg">Common API Endpoints</h4>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li><code>GET /api/activities</code> — List all activities</li>
                        <li><code>GET /api/activities/:id</code> — Get activity details</li>
                        <li><code>GET /api/responses</code> — Get form responses</li>
                        <li><code>GET /api/responses/:id</code> — Get specific response</li>
                        <li><code>POST /api/responses</code> — Submit form response</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">Example Request</h4>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">{`curl -H "Authorization: Bearer TOKEN" \\
  https://your-app.com/api/activities`}
                    </pre>
                </section>

                <section id="api-examples" className="mb-8">
                    <h3 className="text-xl font-semibold">API Examples</h3>
                    <p className="mt-2">Common use cases and code examples:</p>

                    <h4 className="mt-4 font-semibold text-lg">Fetch All Activities</h4>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">{`const resp = await fetch('/api/activities', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
const activities = await resp.json();`}
                    </pre>

                    <h4 className="mt-4 font-semibold text-lg">Submit Form Response</h4>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">{`await fetch('/api/responses', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    activity_id: 123,
    answers: { question_1: 'answer_value' }
  })
});`}
                    </pre>
                </section>

                <section id="sharing-activities" className="mb-8">
                    <h3 className="text-xl font-semibold">Sharing & Distribution</h3>
                    <p className="mt-2">Share forms with users in multiple ways:</p>

                    <h4 className="mt-4 font-semibold text-lg">Direct Link</h4>
                    <p className="mt-2">Copy the activity link and share via email or messaging:</p>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">{`https://your-app.com/#/standalone/fill/ACTIVITY_ID`}
                    </pre>

                    <h4 className="mt-4 font-semibold text-lg">QR Codes</h4>
                    <p className="mt-2">Generate QR codes for easy mobile scanning and instant form access.</p>

                    <h4 className="mt-4 font-semibold text-lg">Embedded Forms</h4>
                    <p className="mt-2">Embed forms on your website:</p>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">{`<iframe src="https://your-app.com/#/standalone/fill/ACTIVITY_ID"
  width="800" height="900"></iframe>`}
                    </pre>
                </section>

                <section id="managing-data" className="mb-8">
                    <h3 className="text-xl font-semibold">Managing Your Data</h3>
                    <p className="mt-2">Best practices for data management:</p>

                    <h4 className="mt-4 font-semibold text-lg">Data Storage</h4>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li>All responses are securely stored</li>
                        <li>Attachments are preserved and searchable</li>
                        <li>Timestamps track when responses were submitted</li>
                    </ul>

                    <h4 className="mt-4 font-semibold text-lg">Data Export</h4>
                    <p className="mt-2">Export data from reports in PDF or Excel format for offline analysis or sharing with stakeholders.</p>

                    <h4 className="mt-4 font-semibold text-lg">Data Privacy</h4>
                    <p className="mt-2">Use field-level access controls to limit who can see certain data. Configure role-based permissions in Settings.</p>
                </section>

                <section id="tips-tricks" className="mb-8">
                    <h3 className="text-xl font-semibold">Tips & Tricks</h3>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                        <li><strong>Organize by Programs</strong> — Group related forms into programs for easier management</li>
                        <li><strong>Use Question Groups</strong> — Organize long forms into logical sections</li>
                        <li><strong>Scoring & Metrics</strong> — Assign scores to options to enable automatic calculations</li>
                        <li><strong>Regular Reports</strong> — Set up scheduled reports to track progress automatically</li>
                        <li><strong>Mobile First</strong> — Test forms on mobile devices as most users will use phones</li>
                        <li><strong>Clear Instructions</strong> — Add descriptions to complex questions for better responses</li>
                        <li><strong>Required vs Optional</strong> — Mark only essential questions as required</li>
                        <li><strong>File Upload Limits</strong> — Keep file sizes reasonable for faster uploads in the field</li>
                    </ul>
                </section>
            </main>
        </div>
    );
};

export default DocsPage;
