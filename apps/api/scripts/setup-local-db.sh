#!/bin/bash

# Setup script for local database configuration
# This script helps configure the database connection for local development

echo "🔧 Setting up local database configuration..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Set NODE_ENV to development if not set
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=development
    echo "📝 Set NODE_ENV=development"
fi

echo "🌍 Current environment: $NODE_ENV"

# Prompt for database URL
echo ""
echo "📊 Database Configuration:"
echo "Choose your database setup:"
echo "1) Local PostgreSQL (no SSL required)"
echo "2) Remote database (SSL required)"
echo "3) Use existing DATABASE_URL environment variable"
echo "4) Skip database setup"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🏠 Local PostgreSQL Setup:"
        read -p "Enter database host (default: localhost): " db_host
        db_host=${db_host:-localhost}
        
        read -p "Enter database port (default: 5432): " db_port
        db_port=${db_port:-5432}
        
        read -p "Enter database name (default: lynkby_dev): " db_name
        db_name=${db_name:-lynkby_dev}
        
        read -p "Enter database user (default: postgres): " db_user
        db_user=${db_user:-postgres}
        
        read -s -p "Enter database password: " db_password
        echo ""
        
        DATABASE_URL="postgresql://$db_user:$db_password@$db_host:$db_port/$db_name"
        DIRECT_URL="$DATABASE_URL"
        ;;
    2)
        echo ""
        echo "☁️ Remote Database Setup:"
        read -p "Enter full database URL (with sslmode=require): " DATABASE_URL
        DIRECT_URL="$DATABASE_URL"
        ;;
    3)
        if [ -z "$DATABASE_URL" ]; then
            echo "❌ DATABASE_URL environment variable is not set"
            exit 1
        fi
        echo "✅ Using existing DATABASE_URL"
        DIRECT_URL="$DATABASE_URL"
        ;;
    4)
        echo "⏭️ Skipping database setup"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Set secrets using wrangler
echo ""
echo "🔐 Setting database secrets..."

if [ ! -z "$DATABASE_URL" ]; then
    echo "Setting DATABASE_URL..."
    echo "$DATABASE_URL" | wrangler secret put DATABASE_URL --env local
    
    echo "Setting DIRECT_URL..."
    echo "$DIRECT_URL" | wrangler secret put DIRECT_URL --env local
    
    echo "✅ Database secrets configured successfully!"
else
    echo "❌ No database URL provided"
    exit 1
fi

# Test the connection
echo ""
echo "🧪 Testing database connection..."

# Create a simple test script
cat > /tmp/test_db_connection.js << 'EOF'
import { checkDatabaseHealth } from './src/core/db.js';

try {
    const result = await checkDatabaseHealth();
    console.log('✅ Database connection successful:', result);
} catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
}
EOF

# Run the test
if node /tmp/test_db_connection.js; then
    echo "✅ Database connection test passed!"
else
    echo "❌ Database connection test failed!"
    echo "💡 Tips:"
    echo "   - Make sure your database is running"
    echo "   - Check your connection string format"
    echo "   - For remote databases, ensure SSL is properly configured"
    echo "   - For local databases, make sure the database exists"
fi

# Clean up
rm -f /tmp/test_db_connection.js

echo ""
echo "🎉 Local database setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start your development server: pnpm dev"
echo "   2. Test the API endpoints"
echo "   3. Check the logs for any connection issues"
echo ""
echo "🔧 SSL Configuration:"
echo "   - Development: Uses sslmode=prefer (flexible)"
echo "   - Production: Uses sslmode=require (secure)"
echo "   - The system automatically adjusts based on NODE_ENV"
