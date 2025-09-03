#!/bin/bash

# Setup Secrets for @lynkby/api
# This script helps set up secrets for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if wrangler is installed
check_wrangler() {
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI is not installed. Please install it first:"
        echo "npm install -g wrangler"
        exit 1
    fi
    print_success "Wrangler CLI is installed"
}

# Function to set a secret
set_secret() {
    local secret_name=$1
    local env=$2
    local description=$3
    
    print_status "Setting $secret_name for $env environment..."
    echo "Description: $description"
    
    if [ "$env" = "local" ]; then
        wrangler secret put "$secret_name" --env local
    else
        wrangler secret put "$secret_name" --env "$env"
    fi
    
    print_success "$secret_name set for $env"
}

# Function to setup all secrets for an environment
setup_environment() {
    local env=$1
    
    print_status "Setting up secrets for $env environment..."
    
    # Core Authentication
    set_secret "JWT_SECRET" "$env" "JWT signing secret (minimum 32 characters)"
    set_secret "REVALIDATE_SECRET" "$env" "Secret for cache revalidation"
    
    # Database
    set_secret "DATABASE_URL" "$env" "Primary database connection URL"
    set_secret "DIRECT_URL" "$env" "Direct database URL for Prisma Accelerate"
    
    # External Services
    set_secret "SENTRY_DSN" "$env" "Sentry error tracking DSN (optional)"
    set_secret "STRIPE_SECRET_KEY" "$env" "Stripe API secret key"
    set_secret "STRIPE_WEBHOOK_SECRET" "$env" "Stripe webhook signing secret"
    set_secret "TIKTOK_CLIENT_KEY" "$env" "TikTok API client key"
    set_secret "TIKTOK_CLIENT_SECRET" "$env" "TikTok API client secret"
    set_secret "RESEND_API_KEY" "$env" "Resend email service API key"
    
    print_success "All secrets set for $env environment"
}

# Function to list secrets for an environment
list_secrets() {
    local env=$1
    
    print_status "Listing secrets for $env environment..."
    
    if [ "$env" = "local" ]; then
        wrangler secret list --env local
    else
        wrangler secret list --env "$env"
    fi
}

# Main script
main() {
    print_status "Lynkby API Secrets Setup"
    echo "================================"
    
    # Check if wrangler is installed
    check_wrangler
    
    # Parse command line arguments
    case "${1:-help}" in
        "local")
            setup_environment "local"
            ;;
        "dev"|"development")
            setup_environment "development"
            ;;
        "staging")
            setup_environment "staging"
            ;;
        "prod"|"production")
            setup_environment "production"
            ;;
        "list")
            if [ -z "$2" ]; then
                print_error "Please specify environment: local, dev, staging, or prod"
                exit 1
            fi
            list_secrets "$2"
            ;;
        "help"|*)
            echo "Usage: $0 [command] [environment]"
            echo ""
            echo "Commands:"
            echo "  local       Set up secrets for local development"
            echo "  dev         Set up secrets for development environment"
            echo "  staging     Set up secrets for staging environment"
            echo "  prod        Set up secrets for production environment"
            echo "  list [env]  List secrets for specified environment"
            echo "  help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 local                    # Set up local development secrets"
            echo "  $0 dev                      # Set up development environment secrets"
            echo "  $0 list prod                # List production secrets"
            echo ""
            echo "Note: You will be prompted to enter each secret value."
            echo "Make sure you have the correct values ready before running this script."
            ;;
    esac
}

# Run main function with all arguments
main "$@"
