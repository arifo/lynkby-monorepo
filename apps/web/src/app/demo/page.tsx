import Link from "next/link";
import { Zap, Target, BarChart3, CheckCircle } from "lucide-react";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-custom">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container-custom">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Lynkby</span>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/">
                <button className="btn-outline">Back to Home</button>
              </Link>
              <Link href="/login">
                <button className="btn-primary">Try Demo</button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding">
        <div className="container-custom text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              See Lynkby in{" "}
              <span className="text-gradient">action</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Experience the fastest link-in-bio platform designed specifically for TikTok creators
            </p>
          </div>
        </div>
      </section>

      {/* Demo Features */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                Lightning-fast{" "}
                <span className="text-gradient">performance</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Watch how your landing pages load in under 100ms. Built on Cloudflare&apos;s edge network
                for global speed that keeps your audience engaged.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Sub-100ms page loads</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Global CDN coverage</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Mobile-optimized</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Performance Demo</h3>
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Page Load Time</span>
                    <span className="font-semibold text-green-600">87ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Core Web Vitals</span>
                    <span className="font-semibold text-green-600">Perfect</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Global Rank</span>
                    <span className="font-semibold text-gray-900">Top 1%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TikTok Integration Demo */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-8 rounded-2xl order-2 lg:order-1">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">TikTok Sync Demo</h3>
                  <Target className="w-5 h-5 text-red-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latest Video</span>
                    <span className="font-semibold text-gray-900">Auto-synced</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bio Links</span>
                    <span className="font-semibold text-green-600">Always Fresh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Update Frequency</span>
                    <span className="font-semibold text-gray-900">Real-time</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                Seamless{" "}
                <span className="text-gradient">TikTok integration</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                See how your TikTok content automatically syncs with your landing page.
                Keep your bio links fresh without lifting a finger.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">One-click TikTok connection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Automatic content updates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Smart link management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Demo */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                Powerful{" "}
                <span className="text-gradient">analytics</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Track your success with beautiful, easy-to-understand dashboards.
                No confusing metrics, just the data you need to grow your audience.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Real-time click tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Revenue analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-700">Audience insights</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Analytics Demo</h3>
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Clicks</span>
                    <span className="font-semibold text-gray-900">12,847</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conversion Rate</span>
                    <span className="font-semibold text-green-600">8.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-semibold text-gray-900">$2,847</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to see it in action?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Experience the power of Lynkby for yourself. Start building your perfect landing page today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
                Start Free Trial
              </button>
            </Link>
            <Link href="/">
              <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200">
                Learn More
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container-custom text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Lynkby</span>
          </div>
          <p className="text-gray-400 mb-4">
            The fastest link-in-bio platform for TikTok creators.
          </p>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Lynkby. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
