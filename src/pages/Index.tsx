import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Package, Zap, Shield, BarChart, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            SniffSafe Data Seed
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/product-flow">
              <Button variant="premium" size="lg" className="shadow-glow">
                Start Building Products
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link to="/lookup">
              <Button variant="outline" size="lg">
                <Search className="h-5 w-5 mr-2" />
                Lookup Products
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <Package className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Multi-Step Workflow</CardTitle>
              <CardDescription>
                Guided process through brands, variants, options, and ingredients
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Smart Validation</CardTitle>
              <CardDescription>
                Intelligent form validation and auto-saving for seamless data entry
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Data Integrity</CardTitle>
              <CardDescription>
                Maintains complex relationships between products, variants, and options
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-elegant hover:shadow-glow transition-all duration-300">
            <CardHeader>
              <BarChart className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>
                Visual progress indicators and tab-based navigation system
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <Card className="bg-gradient-primary text-primary-foreground shadow-glow">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to streamline your product management?
              </h2>
              <p className="text-lg mb-6 text-primary-foreground/90">
                Create complex product hierarchies with ease using our intelligent workflow system.
              </p>
              <Link to="/product-flow">
                <Button variant="secondary" size="lg">
                  Get Started Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
