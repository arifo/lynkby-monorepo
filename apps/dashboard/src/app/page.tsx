import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Link as LinkIcon, BarChart3, Zap, Check } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Lynkby</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
              Login
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              All‑in‑one Link Management
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {" "}for Bio Pages, Short Links & QR
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Build beautiful link‑in‑bio pages, create branded short links, generate QR codes, and measure everything with real‑time analytics. Built for creators, marketers, and teams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-3">
                  Start Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Watch Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 bg-white">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Everything to Grow Your Audience
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Create, manage, and optimize link experiences that convert — in one place.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Link‑in‑bio Pages</h3>
                <p className="text-gray-600">Build a beautiful, customizable bio page with blocks, buttons, and social links.</p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & UTM Tracking</h3>
                <p className="text-gray-600">See clicks, locations, devices, and campaigns. Export and share with your team.</p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Branded Short Links</h3>
                <p className="text-gray-600">Create memorable short links on your domain with QR codes in one click.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 bg-gray-50">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
              <p className="text-gray-600 text-lg">Start free. Upgrade when you grow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free */}
              <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col">
                <h3 className="text-xl font-semibold text-gray-900">Free</h3>
                <p className="text-gray-600 mt-1 mb-4">For getting started</p>
                <div className="text-4xl font-bold text-gray-900">$0<span className="text-base text-gray-500 font-normal">/mo</span></div>
                <ul className="mt-6 space-y-3 text-sm text-gray-700 flex-1">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Link‑in‑bio page</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> 10 short links</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Basic analytics</li>
                </ul>
                <Link href="/login" className="mt-6">
                  <Button className="w-full">Get started</Button>
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-white rounded-xl shadow-md border p-6 ring-2 ring-blue-600 flex flex-col">
                <h3 className="text-xl font-semibold text-gray-900">Pro</h3>
                <p className="text-gray-600 mt-1 mb-4">For creators & pros</p>
                <div className="text-4xl font-bold text-gray-900">$12<span className="text-base text-gray-500 font-normal">/mo</span></div>
                <ul className="mt-6 space-y-3 text-sm text-gray-700 flex-1">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Unlimited links</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Custom domain + QR</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Advanced analytics & UTM</li>
                </ul>
                <Link href="/login" className="mt-6">
                  <Button className="w-full">Start Pro</Button>
                </Link>
              </div>

              {/* Team */}
              <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col">
                <h3 className="text-xl font-semibold text-gray-900">Team</h3>
                <p className="text-gray-600 mt-1 mb-4">For teams & brands</p>
                <div className="text-4xl font-bold text-gray-900">$29<span className="text-base text-gray-500 font-normal">/mo</span></div>
                <ul className="mt-6 space-y-3 text-sm text-gray-700 flex-1">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Multi‑user & roles</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Audit & exports</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600"/> Priority support</li>
                </ul>
                <Link href="/login" className="mt-6">
                  <Button className="w-full">Contact sales</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of creators and businesses who trust Lynkby to power their link strategy.
            </p>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Create Your First Link
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Lynkby</span>
              </div>
              <p className="text-gray-400">
                Transform your links into powerful tools that drive results.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Lynkby. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
