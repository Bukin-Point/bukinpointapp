#!/bin/bash

# DNSMasq Setup Script for BukinPoint Local Development
# This script helps set up DNSMasq for wildcard subdomain support

set -e

echo "🚀 Setting up DNSMasq for BukinPoint local development..."
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

echo "📦 Detected OS: $OS"
echo ""

# Check if DNSMasq is installed
if command -v dnsmasq &> /dev/null; then
    echo "✅ DNSMasq is already installed"
else
    echo "📥 Installing DNSMasq..."
    if [ "$OS" == "macos" ]; then
        if command -v brew &> /dev/null; then
            brew install dnsmasq
        else
            echo "❌ Homebrew is required for macOS. Install it from https://brew.sh"
            exit 1
        fi
    else
        sudo apt update
        sudo apt install -y dnsmasq
    fi
    echo "✅ DNSMasq installed"
fi

echo ""

# Configure DNSMasq
echo "⚙️  Configuring DNSMasq..."

if [ "$OS" == "macos" ]; then
    CONFIG_DIR=$(brew --prefix)/etc
    CONFIG_FILE="$CONFIG_DIR/dnsmasq.conf"
    
    # Create config directory if it doesn't exist
    mkdir -p "$CONFIG_DIR"
    
    # Add configuration if it doesn't exist
    if ! grep -q "address=/.bukinpoint.test/127.0.0.1" "$CONFIG_FILE" 2>/dev/null; then
        echo "address=/.bukinpoint.test/127.0.0.1" | sudo tee -a "$CONFIG_FILE" > /dev/null
        echo "✅ Added bukinpoint.test configuration to $CONFIG_FILE"
    else
        echo "✅ Configuration already exists in $CONFIG_FILE"
    fi
    
    # Start DNSMasq service
    echo "🔄 Starting DNSMasq service..."
    sudo brew services restart dnsmasq || sudo brew services start dnsmasq
    
    # Configure macOS resolver
    echo "⚙️  Configuring macOS resolver..."
    sudo mkdir -p /etc/resolver
    echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/bukinpoint.test > /dev/null
    echo "✅ Created resolver configuration at /etc/resolver/bukinpoint.test"
    
else
    CONFIG_FILE="/etc/dnsmasq.conf"
    
    # Add configuration if it doesn't exist
    if ! grep -q "address=/.bukinpoint.test/127.0.0.1" "$CONFIG_FILE" 2>/dev/null; then
        echo "address=/.bukinpoint.test/127.0.0.1" | sudo tee -a "$CONFIG_FILE" > /dev/null
        echo "✅ Added bukinpoint.test configuration to $CONFIG_FILE"
    else
        echo "✅ Configuration already exists in $CONFIG_FILE"
    fi
    
    # Start DNSMasq service
    echo "🔄 Starting DNSMasq service..."
    sudo systemctl restart dnsmasq || sudo systemctl start dnsmasq
    sudo systemctl enable dnsmasq
    
    # Configure systemd-resolved
    echo "⚙️  Configuring systemd-resolved..."
    RESOLVED_CONF="/etc/systemd/resolved.conf"
    if ! grep -q "Domains=~bukinpoint.test" "$RESOLVED_CONF" 2>/dev/null; then
        sudo sed -i '/^\[Resolve\]/a DNS=127.0.0.1\nDomains=~bukinpoint.test' "$RESOLVED_CONF"
        echo "✅ Updated $RESOLVED_CONF"
    else
        echo "✅ Configuration already exists in $RESOLVED_CONF"
    fi
    sudo systemctl restart systemd-resolved
fi

echo ""
echo "🧪 Testing DNSMasq configuration..."

# Test DNS resolution
if dig +short test.bukinpoint.test @127.0.0.1 | grep -q "127.0.0.1"; then
    echo "✅ DNSMasq is working correctly!"
else
    echo "⚠️  DNSMasq test failed. Please check the configuration manually."
    echo "   Run: dig test.bukinpoint.test @127.0.0.1"
fi

echo ""
echo "📝 Next steps:"
echo "   1. Update your .env file:"
echo "      BETTER_AUTH_URL=http://bukinpoint.test:3000"
echo "      NEXT_PUBLIC_APP_URL=http://bukinpoint.test:3000"
echo ""
echo "   2. Restart your development server:"
echo "      npm run dev"
echo ""
echo "   3. Test your subdomain:"
echo "      http://thank-god.bukinpoint.test:3000"
echo ""
echo "✅ Setup complete! See DNSMASQ_SETUP.md for troubleshooting."
