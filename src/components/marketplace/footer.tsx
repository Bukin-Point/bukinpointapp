import Link from 'next/link'
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-h4 font-bold">BukinPoint</h3>
            <p className="text-body-sm text-text-secondary">
              Your trusted platform for booking services online. Connect with verified providers 
              and manage your appointments effortlessly.
            </p>
            <div className="flex gap-4">
              <Link
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:support@bukinpoint.com"
                className="text-text-secondary hover:text-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-body-sm font-semibold">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#services" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Browse Services
                </Link>
              </li>
              <li>
                <Link href="/signup?type=provider" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Become a Provider
                </Link>
              </li>
              <li>
                <Link href="/signin" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-body-sm font-semibold">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-body-sm font-semibold">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-body-sm text-text-secondary hover:text-primary transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-body-sm text-text-secondary">
              © {currentYear} BukinPoint. All rights reserved.
            </p>
            <p className="text-body-sm text-text-secondary">
              Made with ❤️ for service providers and customers
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
