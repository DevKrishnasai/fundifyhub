import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Shield, Clock, MapPin, Star, Upload, CheckCircle, CreditCard } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* header removed - global Navbar is used */}

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 flex items-center min-h-[80vh]">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4 sm:mb-6">
            <MapPin className="w-3 h-3 mr-1" />
            Available in 50+ Districts
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-balance">
            Get instant cash by <span className="text-primary">pledging your asset</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 text-pretty max-w-2xl mx-auto">
            Turn your phones, laptops, vehicles, and other valuable assets into immediate cash. Quick approval, fair
            valuations, and flexible repayment terms.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto" asChild>
              <Link href="/upload-asset">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Upload Your Asset
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto bg-transparent"
              asChild
            >
              <Link href="/dashboard">
                View Dashboard
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 sm:py-16 lg:py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Get your loan in just 3 simple steps. Fast, secure, and transparent process.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <Card className="text-center p-6 sm:p-8 border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">1. Upload Asset</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Upload photos and details of your asset. Our AI instantly estimates its value.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 sm:p-8 border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">2. Get Approved</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  District admin reviews and approves your loan with competitive interest rates.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 sm:p-8 border-2 hover:border-primary/20 transition-colors sm:col-span-2 lg:col-span-1">
              <CardContent className="p-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-chart-3/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-chart-3" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">3. Receive Cash</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Get instant disbursement via UPI, bank transfer, or cash pickup.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 lg:py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Why choose AssetLend?</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">Quick Processing</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Get approved within 24 hours. No lengthy paperwork or credit checks required.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">Secure & Trusted</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Your assets are safely stored with full insurance coverage and digital agreements.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-chart-3/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-chart-3" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">Local Presence</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      District-level operations ensure personalized service and easy asset pickup.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="p-6 sm:p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-2">
                <CardContent className="p-0">
                  <div className="text-center mb-6">
                    <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">₹50,000</div>
                    <p className="text-sm sm:text-base text-muted-foreground">Average loan amount</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-accent">24hrs</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Approval time</p>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-chart-3">12%</div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Interest rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">What our customers say</h2>
            <p className="text-lg sm:text-xl text-muted-foreground">Trusted by thousands across India</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <Card className="p-4 sm:p-6">
              <CardContent className="p-0">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  "Got ₹25,000 against my laptop in just one day. The process was smooth and transparent."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-semibold">RK</span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold">Rahul Kumar</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Mumbai</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4 sm:p-6">
              <CardContent className="p-0">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  "Pledged my phone for emergency funds. Fair valuation and flexible repayment options."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent/10 rounded-full flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-semibold">PS</span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold">Priya Sharma</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Delhi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-0">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  "Excellent service! Got my bike back after repaying the loan. Highly recommended."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-chart-3/10 rounded-full flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-semibold">AS</span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold">Amit Singh</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Bangalore</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">Ready to get your loan?</h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust AssetLend for their financial needs.
          </p>
          <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto" asChild>
            <Link href="/upload-asset">
              Start Your Application
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8 sm:py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">AssetLend</span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Quick, secure, and transparent asset-backed loans for everyone.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Services</h3>
              <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Phone Loans
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Laptop Loans
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Vehicle Loans
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Jewelry Loans
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
              <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Company</h3>
              <ul className="space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Press
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Partners
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-muted-foreground text-sm sm:text-base">
            <p>&copy; 2025 AssetLend. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
