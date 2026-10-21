import Link from 'next/link'
import { MapPin, Clock, ShieldCheck, Heart } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-green-600 fill-current" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">FoodBridge</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">How it Works</Link>
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">Features</Link>
            <Link href="/impact" className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">Impact</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors hidden sm:inline-block">Sign In</Link>
            <Link href="/register" className="inline-flex h-9 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-700">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gray-50 pt-24 pb-32 md:pt-32 md:pb-40 border-b border-gray-200">
          <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-800 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-green-600 mr-2"></span>
              Turning Surplus into Sustenance
            </div>
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-7xl lg:text-8xl">
              Don&apos;t let good food <br className="hidden md:block"/>
              <span className="text-green-700">go to waste.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 md:text-xl leading-relaxed">
              The intelligent platform connecting restaurants, hotels, and event organizers with verified NGOs to seamlessly redistribute surplus food before it expires.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register?role=PROVIDER" className="inline-flex h-12 items-center justify-center rounded-lg bg-green-600 px-8 text-sm font-medium text-white shadow-lg transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 w-full sm:w-auto">
                Donate Surplus Food
              </Link>
              <Link href="/apply-ngo" className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white px-8 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 w-full sm:w-auto">
                Join as an NGO
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Intelligent Redistribution</h2>
              <p className="mt-4 text-lg text-gray-600">Our platform handles the logistics so you can focus on the impact.</p>
            </div>
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                  <MapPin className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Smart Matching</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  Our geospatial engine instantly matches your surplus food with the nearest verified NGOs that have the capacity and need for it.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Clock className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Expiry-Aware</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  Real-time urgency tracking ensures critical donations are prioritized and picked up well before they expire.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Verified & Safe</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  Mandatory safety checklists, allergen tracking, and rigorous NGO verification ensure food is handled safely.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Stats */}
        <section className="py-24 bg-gray-900 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-center">
              <div>
                <div className="text-4xl font-extrabold text-green-400">10,000+</div>
                <div className="mt-2 text-sm font-medium text-gray-400 uppercase tracking-wider">Meals Saved</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-green-400">500+</div>
                <div className="mt-2 text-sm font-medium text-gray-400 uppercase tracking-wider">Verified NGOs</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-green-400">2,500 kg</div>
                <div className="mt-2 text-sm font-medium text-gray-400 uppercase tracking-wider">CO2 Prevented</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-green-400">100%</div>
                <div className="mt-2 text-sm font-medium text-gray-400 uppercase tracking-wider">Traceable</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 border-t">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Heart className="h-5 w-5 text-green-600 fill-current" />
            <span className="font-semibold text-gray-900">FoodBridge</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 FoodBridge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
