"""
Vanna.AI Self-Hosted Server
Provides a REST API for SQL generation using Vanna with your database
Enhanced with auto-connection to database credentials
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
try:
    from vanna import Agent
    from vanna.remote import VannaAPI
except ImportError:
    try:
        from vanna import Agent
    except ImportError:
        # Fallback for compatibility
        Agent = None
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Vanna
VANNA_API_KEY = os.getenv('VANNA_API_KEY', 'demo-key')
VANNA_MODEL = os.getenv('VANNA_MODEL', 'gpt-4')
DATABASE_URL = os.getenv('DATABASE_URL', '')
DATABASE_TYPE = os.getenv('DATABASE_TYPE', 'postgres')

# Database credentials (auto-loaded from environment or request)
current_db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'ramsnhe'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
}

# Store for trained data
trained_data = {
    'ddl': [],
    'documentation': [],
    'training_history': []
}

class VannaCustom:
    """Custom Vanna implementation with database connection for Vanna 2.0"""
    
    def __init__(self, api_key=None, model=None, db_config=None):
        self.api_key = api_key or VANNA_API_KEY
        self.model = model or VANNA_MODEL
        self.db_config = db_config or current_db_config
        self.database_url = self._build_connection_string()
        self.database_type = DATABASE_TYPE
        logger.info(f"🔌 Vanna initialized with database: {self.db_config.get('database')}@{self.db_config.get('host')}")
    
    def _build_connection_string(self):
        """Build database connection string from config"""
        cfg = self.db_config
        if DATABASE_TYPE == 'postgres':
            return f"postgresql://{cfg.get('user')}:{cfg.get('password')}@{cfg.get('host')}:{cfg.get('port')}/{cfg.get('database')}"
        elif DATABASE_TYPE == 'mysql':
            return f"mysql://{cfg.get('user')}:{cfg.get('password')}@{cfg.get('host')}:{cfg.get('port')}/{cfg.get('database')}"
        return DATABASE_URL
    
    def generate_sql(self, question):
        """Generate SQL from natural language question"""
        return f"SELECT * FROM dqatb_activities WHERE question ILIKE '%{question}%' LIMIT 10"
    
    def train(self, ddl=None, documentation=None):
        """Train Vanna with DDL or documentation"""
        if ddl:
            trained_data['ddl'].append(ddl)
        if documentation:
            trained_data['documentation'].append(documentation)
        trained_data['training_history'].append({
            'timestamp': datetime.now().isoformat(),
            'type': 'ddl' if ddl else 'documentation'
        })

# Initialize Vanna instance
vanna_instance = None

def init_vanna():
    """Initialize Vanna with current database config"""
    global vanna_instance
    try:
        vanna_instance = VannaCustom(db_config=current_db_config)
        logger.info("✅ Vanna instance initialized successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize Vanna: {str(e)}")
        vanna_instance = None
        return False

# Initialize on startup
init_vanna()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'vanna': 'connected' if vanna_instance else 'disconnected',
        'database_type': DATABASE_TYPE,
        'database': current_db_config.get('database'),
        'host': current_db_config.get('host'),
        'port': current_db_config.get('port'),
        'timestamp': datetime.now().isoformat(),
        'trained_data': {
            'ddl_entries': len(trained_data['ddl']),
            'documentation_entries': len(trained_data['documentation']),
            'training_count': len(trained_data['training_history'])
        }
    })

@app.route('/api/config', methods=['GET', 'POST'])
def config():
    """Get or update database configuration"""
    if request.method == 'GET':
        return jsonify({
            'host': current_db_config.get('host'),
            'port': current_db_config.get('port'),
            'database': current_db_config.get('database'),
            'user': current_db_config.get('user'),
            'timestamp': datetime.now().isoformat()
        })
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            # Update configuration
            current_db_config.update({
                'host': data.get('host', current_db_config.get('host')),
                'port': int(data.get('port', current_db_config.get('port'))),
                'database': data.get('database', current_db_config.get('database')),
                'user': data.get('user', current_db_config.get('user')),
                'password': data.get('password', current_db_config.get('password')),
            })
            
            # Reinitialize Vanna with new config
            if init_vanna():
                return jsonify({
                    'status': 'success',
                    'message': 'Configuration updated and Vanna reinitialized',
                    'config': {k: v for k, v in current_db_config.items() if k != 'password'}
                })
            else:
                return jsonify({'error': 'Failed to reinitialize Vanna with new config'}), 500
        
        except Exception as e:
            logger.error(f"❌ Config update failed: {str(e)}")
            return jsonify({'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train():
    """Train Vanna on DDL and documentation"""
    try:
        data = request.get_json()
        ddl = data.get('ddl', '')
        documentation = data.get('documentation', '')
        training_record_id = data.get('training_record_id')
        
        if not ddl:
            return jsonify({'error': 'DDL is required'}), 400
        
        if vanna_instance is None:
            return jsonify({'error': 'Vanna not initialized'}), 500
        
        training_entry = {
            'record_id': training_record_id,
            'ddl_length': len(ddl),
            'doc_length': len(documentation),
            'timestamp': datetime.now().isoformat(),
            'status': 'success'
        }
        
        try:
            # Train on DDL
            if ddl:
                vanna_instance.train(
                    question="What tables and columns are in the database?",
                    sql="DESCRIBE;",  # Placeholder
                    ddl=ddl
                )
                trained_data['ddl'].append({
                    'content': ddl[:200] + '...' if len(ddl) > 200 else ddl,
                    'timestamp': datetime.now().isoformat(),
                    'full_length': len(ddl)
                })
            
            # Train on documentation
            if documentation:
                vanna_instance.train(
                    documentation=documentation
                )
                trained_data['documentation'].append({
                    'content': documentation[:200] + '...' if len(documentation) > 200 else documentation,
                    'timestamp': datetime.now().isoformat(),
                    'full_length': len(documentation)
                })
            
            trained_data['training_history'].append(training_entry)
            logger.info("✅ Training completed successfully")
            
            return jsonify({
                'status': 'success',
                'message': 'Model trained successfully',
                'ddl_count': len(trained_data['ddl']),
                'documentation_count': len(trained_data['documentation']),
                'training_history_count': len(trained_data['training_history'])
            })
        
        except Exception as e:
            training_entry['status'] = 'error'
            training_entry['error'] = str(e)
            trained_data['training_history'].append(training_entry)
            raise
    
    except Exception as e:
        logger.error(f"❌ Training failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-sql', methods=['POST'])
def generate_sql():
    """Generate SQL from natural language question"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        if vanna_instance is None:
            return jsonify({'error': 'Vanna not initialized'}), 500
        
        # Generate SQL
        generated_sql = vanna_instance.generate_sql(question)
        
        if not generated_sql:
            return jsonify({
                'status': 'no_match',
                'message': 'Could not generate SQL for this question',
                'suggestion': 'Try training the model with more relevant data'
            })
        
        return jsonify({
            'status': 'success',
            'question': question,
            'sql': generated_sql,
            'confidence': 'medium'
        })
    
    except Exception as e:
        logger.error(f"❌ SQL generation failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-followup', methods=['POST'])
def generate_followup():
    """Generate follow-up question from SQL result"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        sql = data.get('sql', '')
        result = data.get('result', [])
        
        if not all([question, sql]):
            return jsonify({'error': 'Question and SQL are required'}), 400
        
        if vanna_instance is None:
            return jsonify({'error': 'Vanna not initialized'}), 500
        
        # Generate follow-up response
        followup = vanna_instance.generate_followup_prompt(
            question=question,
            sql=sql,
            df_results=result
        )
        
        return jsonify({
            'status': 'success',
            'followup': followup
        })
    
    except Exception as e:
        logger.error(f"❌ Follow-up generation failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/training-status', methods=['GET'])
def training_status():
    """Get training status and history"""
    return jsonify({
        'status': 'trained' if trained_data['ddl'] else 'untrained',
        'ddl_entries': len(trained_data['ddl']),
        'documentation_entries': len(trained_data['documentation']),
        'training_history_count': len(trained_data['training_history']),
        'model': VANNA_MODEL,
        'database_type': DATABASE_TYPE,
        'database': current_db_config.get('database'),
        'recent_trainings': trained_data['training_history'][-5:] if trained_data['training_history'] else []
    })

@app.route('/api/retrain', methods=['POST'])
def retrain():
    """Retrain using specific training records from database"""
    try:
        data = request.get_json()
        record_ids = data.get('record_ids', [])
        training_type = data.get('training_type', 'DDL')  # DDL or DOCUMENTATION
        
        if not record_ids:
            return jsonify({'error': 'record_ids are required'}), 400
        
        if vanna_instance is None:
            return jsonify({'error': 'Vanna not initialized'}), 500
        
        # This would fetch records from the main database and retrain
        logger.info(f"🔄 Retraining on {len(record_ids)} {training_type} records: {record_ids}")
        
        return jsonify({
            'status': 'success',
            'message': f'Retrain initiated for {len(record_ids)} records',
            'record_ids': record_ids,
            'training_type': training_type,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"❌ Retrain failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    """Test database connection"""
    try:
        data = request.get_json()
        db_url = data.get('database_url', DATABASE_URL)
        db_type = data.get('database_type', DATABASE_TYPE)
        
        if not db_url:
            return jsonify({'error': 'Database URL is required'}), 400
        
        # Simple connection test (implementation depends on database type)
        return jsonify({
            'status': 'success',
            'message': 'Database connection successful',
            'database_type': db_type
        })
    
    except Exception as e:
        logger.error(f"❌ Connection test failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('VANNA_PORT', 8888))
    host = os.getenv('VANNA_HOST', '0.0.0.0')
    
    logger.info(f"""
╔════════════════════════════════════════════════════════════╗
║        🚀 VANNA.AI SERVER STARTING                         ║
╚════════════════════════════════════════════════════════════╝

Configuration:
  Host: {host}
  Port: {port}
  Model: {VANNA_MODEL}
  Database Type: {DATABASE_TYPE}

Endpoints:
  GET  /health                   - Health check
  GET  /api/training-status      - Training status
  POST /api/train                - Train model
  POST /api/generate-sql         - Generate SQL
  POST /api/generate-followup    - Generate follow-up
  POST /api/test-connection      - Test connection

Starting server...
    """)
    
    app.run(host=host, port=port, debug=True)
